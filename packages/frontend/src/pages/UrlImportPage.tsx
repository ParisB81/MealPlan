import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { scraperService, ScrapedRecipeTemplate } from '../services/scraper.service';
import { useBulkImportRecipes } from '../hooks/useRecipes';
import { CreateRecipeInput } from '../types/recipe';
import { Button, Card, TextArea, Alert } from '../components/ui';
import { Upload, Download, Import } from 'lucide-react';

type ImportStatus = 'idle' | 'loading' | 'success' | 'error' | 'stuck';

// URL limits to prevent server freezing
// Puppeteer-based sites (Akis, Argiro) use async job system - 1 at a time to prevent freezing
const MAX_URLS = 25;
const MAX_PUPPETEER_URLS = 1; // Only 1 Puppeteer URL at a time (async job-based)
const PUPPETEER_JOB_POLL_INTERVAL = 2000; // Poll every 2 seconds
const PUPPETEER_JOB_TIMEOUT = 90000; // 90 second timeout

interface SourceBox {
  label: string;
  hostname: string;
  placeholder: string;
  color: string; // tailwind color key e.g. "blue", "orange"
}

const SOURCES: SourceBox[] = [
  {
    label: 'bigrecipe.com',
    hostname: 'bigrecipe.com',
    placeholder: 'https://bigrecipe.com/recipe/example-1\nhttps://bigrecipe.com/recipe/example-2',
    color: 'blue',
  },
  {
    label: 'allrecipes.com',
    hostname: 'allrecipes.com',
    placeholder: 'https://www.allrecipes.com/recipe/20144/banana-banana-bread/\nhttps://www.allrecipes.com/recipe/24059/easy-chicken-pot-pie/',
    color: 'orange',
  },
  {
    label: 'akispetretzikis.com',
    hostname: 'akispetretzikis.com',
    placeholder: 'https://akispetretzikis.com/recipe/118/to-pastitsio-toy-akh\nhttps://akispetretzikis.com/en/recipe/6866/paradosiako-pastitsio',
    color: 'emerald',
  },
  {
    label: 'argiro.gr',
    hostname: 'argiro.gr',
    placeholder: 'https://www.argiro.gr/en/recipe/quick-and-easy-apple-pie-cake/\nhttps://www.argiro.gr/en/recipe/pastitsio/',
    color: 'pink',
  },
];

export default function UrlImportPage() {
  const navigate = useNavigate();
  const bulkImport = useBulkImportRecipes();

  // Per-source URL lists
  const [sourceUrls, setSourceUrls] = useState<Record<string, string[]>>(
    () => Object.fromEntries(SOURCES.map((s) => [s.hostname, []]))
  );
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ScrapedRecipeTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const allUrls = SOURCES.flatMap((s) => sourceUrls[s.hostname] || []);
  const isOverLimit = allUrls.length > MAX_URLS;

  // Count Puppeteer-based URLs (they take much longer and can freeze the server)
  const akisUrlCount = (sourceUrls['akispetretzikis.com'] || []).length;
  const argiroUrlCount = (sourceUrls['argiro.gr'] || []).length;
  const puppeteerUrlCount = akisUrlCount + argiroUrlCount;
  const otherUrlCount = allUrls.length - puppeteerUrlCount;
  const isPuppeteerOverLimit = puppeteerUrlCount > MAX_PUPPETEER_URLS;

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Excel file upload for a specific source
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, hostname: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      const extractedUrls: string[] = [];
      jsonData.forEach((row, index) => {
        const cell = row[0];
        if (cell && typeof cell === 'string') {
          const trimmed = cell.trim();
          if (index === 0 && ['url', 'urls', 'link', 'links'].includes(trimmed.toLowerCase())) {
            return;
          }
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            extractedUrls.push(trimmed);
          }
        }
      });

      if (extractedUrls.length === 0) {
        setError('No valid URLs found in the Excel file. Make sure URLs are in the first column and start with http:// or https://');
        return;
      }

      setSourceUrls((prev) => ({ ...prev, [hostname]: extractedUrls }));
      setError(null);
      setResults([]);
      setStatus('idle');
    } catch (err) {
      setError("Failed to read Excel file. Please make sure it's a valid .xlsx or .xls file.");
    }

    const ref = fileInputRefs.current[hostname];
    if (ref) ref.value = '';
  };

  const handleManualInput = (text: string, hostname: string) => {
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);
    const validUrls = lines.filter((line) => line.startsWith('http://') || line.startsWith('https://'));
    setSourceUrls((prev) => ({ ...prev, [hostname]: validUrls }));
  };

  // General Excel upload: reads URLs and distributes them to the correct source box by hostname
  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      const extractedUrls: string[] = [];
      jsonData.forEach((row, index) => {
        const cell = row[0];
        if (cell && typeof cell === 'string') {
          const trimmed = cell.trim();
          if (index === 0 && ['url', 'urls', 'link', 'links'].includes(trimmed.toLowerCase())) {
            return;
          }
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            extractedUrls.push(trimmed);
          }
        }
      });

      if (extractedUrls.length === 0) {
        setError('No valid URLs found in the Excel file. Make sure URLs are in the first column and start with http:// or https://');
        return;
      }

      // Distribute URLs to the correct source boxes by hostname
      const newSourceUrls: Record<string, string[]> = Object.fromEntries(
        SOURCES.map((s) => [s.hostname, [...(sourceUrls[s.hostname] || [])]])
      );
      let unmatched = 0;

      for (const url of extractedUrls) {
        try {
          const urlHostname = new URL(url).hostname.replace('www.', '');
          const matchedSource = SOURCES.find((s) => urlHostname.includes(s.hostname));
          if (matchedSource) {
            // Avoid duplicates
            if (!newSourceUrls[matchedSource.hostname].includes(url)) {
              newSourceUrls[matchedSource.hostname].push(url);
            }
          } else {
            unmatched++;
          }
        } catch {
          unmatched++;
        }
      }

      setSourceUrls(newSourceUrls);
      setError(null);
      setResults([]);
      setStatus('idle');

      const totalAdded = extractedUrls.length - unmatched;
      if (unmatched > 0) {
        setError(`${totalAdded} URL(s) loaded. ${unmatched} URL(s) skipped — not from a supported site (${SOURCES.map(s => s.label).join(', ')}).`);
      }
    } catch {
      setError("Failed to read Excel file. Please make sure it's a valid .xlsx or .xls file.");
    }

    if (generalFileInputRef.current) generalFileInputRef.current.value = '';
  };

  const handleScrape = async () => {
    if (allUrls.length === 0) {
      setError('Please add some URLs first');
      return;
    }

    if (allUrls.length > MAX_URLS) {
      setError(`Too many URLs. Maximum ${MAX_URLS} recipes can be imported at a time. You have ${allUrls.length}. Please remove some URLs.`);
      return;
    }

    if (puppeteerUrlCount > MAX_PUPPETEER_URLS) {
      setError(`Only ${MAX_PUPPETEER_URLS} Akis/Argiro URL allowed at a time to prevent server issues. You have ${puppeteerUrlCount}. Please remove ${puppeteerUrlCount - MAX_PUPPETEER_URLS} Akis or Argiro URL(s).`);
      return;
    }

    setStatus('loading');
    setProgress({ current: 0, total: allUrls.length });
    setError(null);
    setElapsedTime(0);

    // Estimate time: ~2 sec for regular URLs, ~90 sec max for Puppeteer URLs
    const estimatedSeconds = otherUrlCount * 2 + puppeteerUrlCount * 90;
    setEstimatedTime(estimatedSeconds);

    // Start elapsed time counter
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    try {
      // Separate URLs by type
      const akisUrls = sourceUrls['akispetretzikis.com'] || [];
      const argiroUrls = sourceUrls['argiro.gr'] || [];
      const regularUrls = allUrls.filter(
        (url) => !akisUrls.includes(url) && !argiroUrls.includes(url)
      );

      const allResults: ScrapedRecipeTemplate[] = [];

      // 1. First, scrape regular URLs (fast, synchronous)
      if (regularUrls.length > 0) {
        setProgress({ current: 0, total: allUrls.length });
        try {
          const result = await scraperService.generateTemplate(regularUrls);
          allResults.push(...result.recipes);
          setProgress({ current: regularUrls.length, total: allUrls.length });
        } catch (err: any) {
          // Add error entries for regular URLs
          regularUrls.forEach((url) => {
            allResults.push({
              Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
              ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
              Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
              SourceUrl: url,
              Error: err.message || 'Failed to scrape',
            });
          });
        }
      }

      // 2. Scrape Puppeteer URLs using async job system (one at a time)
      const puppeteerUrls = [
        ...akisUrls.map((url) => ({ url, siteType: 'akis' as const })),
        ...argiroUrls.map((url) => ({ url, siteType: 'argiro' as const })),
      ];

      for (let i = 0; i < puppeteerUrls.length; i++) {
        const { url, siteType } = puppeteerUrls[i];
        setProgress({ current: regularUrls.length + i, total: allUrls.length });

        try {
          // Start the job
          console.log(`[Scraper] Starting job for ${url}...`);
          const job = await scraperService.startPuppeteerJob(url, siteType);
          const jobId = job.jobId;
          console.log(`[Scraper] Job started: ${jobId}`);

          // Poll for completion
          const pollStartTime = Date.now();
          let completed = false;
          let pollCount = 0;

          while (!completed && Date.now() - pollStartTime < PUPPETEER_JOB_TIMEOUT) {
            await new Promise((resolve) => setTimeout(resolve, PUPPETEER_JOB_POLL_INTERVAL));
            pollCount++;

            try {
              const jobStatus = await scraperService.getPuppeteerJobStatus(jobId);
              console.log(`[Scraper] Poll #${pollCount} - Job ${jobId} status:`, jobStatus.status, jobStatus.result ? 'has result' : 'no result');

              if (jobStatus.status === 'completed') {
                // Job completed - check if we have data
                if (jobStatus.result?.data) {
                  // Parse the result into ScrapedRecipeTemplate format
                  try {
                    const recipe = parsePuppeteerResult(jobStatus.result.data, url, siteType);
                    console.log(`[Scraper] Parsed recipe: ${recipe.Title}`);
                    allResults.push(recipe);
                  } catch (parseErr: any) {
                    console.error(`[Scraper] Parse error:`, parseErr);
                    allResults.push({
                      Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
                      ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
                      Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
                      SourceUrl: url,
                      Error: `Parse error: ${parseErr.message}`,
                    });
                  }
                } else if (jobStatus.result?.success === false) {
                  // Worker returned failure
                  allResults.push({
                    Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
                    ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
                    Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
                    SourceUrl: url,
                    Error: jobStatus.result?.error || 'Scraping failed',
                  });
                } else {
                  // Completed but missing data - unexpected
                  console.error(`[Scraper] Job completed but no data:`, jobStatus.result);
                  allResults.push({
                    Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
                    ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
                    Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
                    SourceUrl: url,
                    Error: 'Scraping completed but returned no data',
                  });
                }
                completed = true;
              } else if (jobStatus.status === 'failed' || jobStatus.status === 'timeout') {
                allResults.push({
                  Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
                  ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
                  Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
                  SourceUrl: url,
                  Error: jobStatus.error || 'Failed to scrape',
                });
                completed = true;
              }
              // If still 'running' or 'pending', continue polling
            } catch (pollErr: any) {
              console.error(`[Scraper] Poll error:`, pollErr.message);
              // If we can't poll, the backend might be frozen - stop trying
              allResults.push({
                Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
                ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
                Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
                SourceUrl: url,
                Error: `Backend connection error: ${pollErr.message}`,
              });
              completed = true;
            }
          }

          // If we timed out waiting
          if (!completed) {
            allResults.push({
              Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
              ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
              Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
              SourceUrl: url,
              Error: 'Polling timeout - job took too long',
            });
          }
        } catch (err: any) {
          console.error(`[Scraper] Job start error:`, err.message);
          allResults.push({
            Title: '', Description: '', Servings: 0, PrepTime: 0, CookTime: 0,
            ImageUrl: '', Instructions: '', Tags: '', Ingredients: '',
            Calories: '', Protein: '', Carbs: '', Fat: '', Fiber: '', Sugar: '', Sodium: '',
            SourceUrl: url,
            Error: err.message || 'Failed to start scraping job',
          });
        }
      }

      if (timerRef.current) clearInterval(timerRef.current);
      setResults(allResults);
      setProgress({ current: allUrls.length, total: allUrls.length });
      setStatus('success');
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setError(err.message || 'Failed to scrape recipes');
      setStatus('error');
    }
  };

  // Helper function to parse Puppeteer job result into ScrapedRecipeTemplate
  const parsePuppeteerResult = (
    result: any,  // This is the worker's result object: { success, data, source }
    url: string,
    siteType: 'akis' | 'argiro'
  ): ScrapedRecipeTemplate => {
    // The result comes from the worker - need to transform it
    // Worker returns: { success: true, data: recipeData, source: '__NEXT_DATA__' | 'JSON-LD' | 'DOM' }
    const data = result; // The data property is passed directly now

    if (siteType === 'akis') {
      return parseAkisData(data, url);
    } else {
      return parseArgiroData(data, url);
    }
  };

  const parseAkisData = (data: any, url: string): ScrapedRecipeTemplate => {
    // Akis data from __NEXT_DATA__ API format
    const title = data.title || data.name || '';
    const description = data.seo_description || data.description || '';

    // Parse servings - handle formats like "4", "13-15 pieces", etc.
    let servings = 4;
    const sharesRaw = data.shares || data.servings || data.recipeYield || '4';
    if (typeof sharesRaw === 'number') {
      servings = sharesRaw;
    } else {
      const match = String(sharesRaw).match(/(\d+)/);
      if (match) servings = parseInt(match[1]);
    }

    const prepTime = data.make_time || data.preparationTime || data.prepTime || 0;
    const cookTime = data.bake_time || data.bakingTime || data.cookTime || 0;

    // Get image URL from assets array
    let imageUrl = '';
    if (data.assets && data.assets.length > 0) {
      imageUrl = data.assets[0].url || '';
    } else if (data.mainImage?.url) {
      imageUrl = data.mainImage.url;
    } else if (data.image) {
      imageUrl = data.image;
    }

    // Parse ingredients from ingredient_sections (Akis API format)
    const allIngredients: string[] = [];
    if (data.ingredient_sections && Array.isArray(data.ingredient_sections)) {
      for (const section of data.ingredient_sections) {
        for (const ing of section.ingredients || []) {
          // Handle quantity - could be empty, "1", "1/2", "3-4", etc.
          let qty = (ing.quantity || '').trim();
          if (!qty) qty = '1'; // Default to 1 if empty
          // For ranges like "3-4", take the first number
          if (qty.includes('-')) {
            const firstNum = qty.split('-')[0].trim();
            qty = firstNum || '1';
          }

          // Handle unit - could be empty, "g", "teaspoon(s)", "clove(s) of", etc.
          let unit = (ing.unit || '').trim();
          if (!unit) unit = 'piece';
          // Clean up unit - remove "(s)" and "of ..."
          unit = unit.replace(/\(s\)/g, '').replace(/\s+of\s*$/i, '').trim();

          const name = (ing.title || '').trim();
          if (name) {
            allIngredients.push(`${qty} ${unit} ${name}`);
          }
        }
      }
    } else if (data.ingredients && Array.isArray(data.ingredients)) {
      // Fallback for other format
      for (const ing of data.ingredients) {
        if (typeof ing === 'string') {
          allIngredients.push(ing);
        } else {
          const qty = ing.quantity || '1';
          const unit = ing.unit?.title || ing.unit || 'piece';
          const name = ing.ingredient?.title || ing.name || '';
          allIngredients.push(`${qty} ${unit} ${name}`);
        }
      }
    }
    const ingredients = allIngredients.join('; ');

    // Parse instructions from method array (Akis API format)
    const allInstructions: string[] = [];
    if (data.method && Array.isArray(data.method)) {
      let stepNum = 1;
      for (const section of data.method) {
        for (const step of section.steps || []) {
          const text = (step.step || step.description || step).replace(/<[^>]*>/g, '').trim();
          if (text) {
            allInstructions.push(`Step ${stepNum}: ${text}`);
            stepNum++;
          }
        }
      }
    } else if (data.methodSteps && Array.isArray(data.methodSteps)) {
      allInstructions.push(...data.methodSteps.map((s: any, i: number) =>
        `Step ${i + 1}: ${s.description || s}`));
    } else if (data.recipeInstructions) {
      const instrs = Array.isArray(data.recipeInstructions) ? data.recipeInstructions : [data.recipeInstructions];
      allInstructions.push(...instrs.map((s: any, i: number) =>
        `Step ${i + 1}: ${typeof s === 'string' ? s : s.text || ''}`));
    }
    const instructions = allInstructions.join('\n');

    const tags = ['Akis Petretzikis', 'Greek'].join(', ');

    // Parse nutrition from the nested structure
    let calories = '', protein = '', carbs = '', fat = '', fiber = '', sugar = '', sodium = '';
    if (data.nutrition?.sections && data.nutrition.sections.length > 0) {
      const nutr = data.nutrition.sections[0];
      calories = nutr.kcal_portion_abs || '';
      protein = nutr.protein_portion_abs || '';
      carbs = nutr.carbs_portion_abs || '';
      fat = nutr.fat_portion_abs || '';
      fiber = nutr.fiber_portion_abs || '';
      sugar = nutr.sugars_portion_abs || '';
      sodium = nutr.sodium_portion_abs || '';
    }

    return {
      Title: title,
      Description: description,
      Servings: servings,
      PrepTime: prepTime,
      CookTime: cookTime,
      ImageUrl: imageUrl,
      Instructions: instructions,
      Tags: tags,
      Ingredients: ingredients,
      Calories: calories,
      Protein: protein,
      Carbs: carbs,
      Fat: fat,
      Fiber: fiber,
      Sugar: sugar,
      Sodium: sodium,
      SourceUrl: url,
      Error: '',
    };
  };

  const parseArgiroData = (data: any, url: string): ScrapedRecipeTemplate => {
    // Argiro data from DOM extraction
    const title = data.title || '';
    const description = data.description || '';
    const imageUrl = data.image || '';

    // Parse servings
    let servings = 4;
    if (data.servingsText) {
      const m = data.servingsText.match(/(\d+)/);
      if (m) servings = parseInt(m[1]);
    }

    // Parse times
    const parseMinutes = (text: string): number => {
      const match = (text || '').match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };
    const prepTime = parseMinutes(data.prepTimeText);
    const cookTime = parseMinutes(data.cookTimeText);

    // Parse ingredients
    let ingredients = '';
    if (data.ingredientSections && Array.isArray(data.ingredientSections)) {
      const allIngs: string[] = [];
      for (const section of data.ingredientSections) {
        for (const ing of section.items || []) {
          const qty = (ing.quantity || '').trim();
          const name = (ing.name || '').trim();
          if (name) {
            allIngs.push(qty ? `${qty} ${name}` : `1 piece ${name}`);
          }
        }
      }
      ingredients = allIngs.join('; ');
    }

    // Parse instructions
    let instructions = '';
    if (data.instructions && Array.isArray(data.instructions)) {
      instructions = data.instructions.map((s: string, i: number) => `Step ${i + 1}: ${s}`).join('\n');
    }

    const tags = ['Argiro Barbarigou', 'Greek', ...(data.tags || [])].join(', ');

    return {
      Title: title,
      Description: description,
      Servings: servings,
      PrepTime: prepTime,
      CookTime: cookTime,
      ImageUrl: imageUrl,
      Instructions: instructions,
      Tags: tags,
      Ingredients: ingredients,
      Calories: '',
      Protein: '',
      Carbs: '',
      Fat: '',
      Fiber: '',
      Sugar: '',
      Sodium: '',
      SourceUrl: url,
      Error: '',
    };
  };

  const handleResetScraper = async () => {
    setProgress({ current: 0, total: 0 });
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);

    // First check if server is responding
    let isHealthy = await scraperService.healthCheck();

    if (isHealthy) {
      // Server is responding, try cleanup
      try {
        await scraperService.cleanup();
        setStatus('idle');
        setError('Scraper has been reset. You can try scraping again.');
      } catch {
        setStatus('idle');
        setError('Cleanup attempted. You can try scraping again.');
      }
    } else {
      // Server is frozen - need to restart backend
      setStatus('stuck');
      setError(
        'The backend server is frozen and needs to be restarted. ' +
        'Please wait a moment while the server restarts, then click "Retry" below.'
      );

      // Poll for server to come back up (it might auto-restart or user restarts it)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds
      const pollInterval = setInterval(async () => {
        attempts++;
        const healthy = await scraperService.healthCheck();
        if (healthy) {
          clearInterval(pollInterval);
          setStatus('idle');
          setError('Server is back online. You can try scraping again.');
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setError(
            'Server is still not responding after 30 seconds. ' +
            'The backend needs to be restarted manually, or try refreshing the page.'
          );
        }
      }, 1000);
    }
  };

  const handleDownload = () => {
    if (results.length === 0) return;

    const successfulRecipes = results
      .filter((r) => !r.Error)
      .map(({ Error, SourceUrl, ...recipe }) => recipe);

    const failedRecipes = results
      .filter((r) => r.Error)
      .map((r) => ({ URL: r.SourceUrl, Error: r.Error }));

    const wb = XLSX.utils.book_new();

    if (successfulRecipes.length > 0) {
      const wsRecipes = XLSX.utils.json_to_sheet(successfulRecipes);
      wsRecipes['!cols'] = [
        { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 40 }, { wch: 80 }, { wch: 30 }, { wch: 100 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsRecipes, 'Recipes');
    }

    if (failedRecipes.length > 0) {
      const wsErrors = XLSX.utils.json_to_sheet(failedRecipes);
      wsErrors['!cols'] = [{ wch: 60 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsErrors, 'Errors');
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `scraped_recipes_${timestamp}.xlsx`);
  };

  // Parse ingredients from semicolon-separated string: "2 cups flour; 1 tsp salt"
  const parseIngredients = (ingredientsStr: string) => {
    if (!ingredientsStr) return [];

    return ingredientsStr.split(';').map((ing: string) => {
      const trimmed = ing.trim();
      if (!trimmed) return null;

      const parts = trimmed.split(' ').filter(p => p);
      if (parts.length < 2) return null;

      // Parse quantity - handle fractions like "1/2"
      let quantity = 1;
      const qtyStr = parts[0];
      if (qtyStr.includes('/')) {
        const [num, denom] = qtyStr.split('/');
        quantity = parseFloat(num) / parseFloat(denom);
        if (isNaN(quantity)) quantity = 1;
      } else {
        quantity = parseFloat(qtyStr) || 1;
      }

      // Handle different formats
      let unit = 'piece';
      let name = '';

      if (parts.length === 2) {
        // "1 egg" -> quantity=1, unit=piece, name=egg
        name = parts[1];
      } else {
        // "2 cups flour" -> quantity=2, unit=cups, name=flour
        unit = parts[1];
        name = parts.slice(2).join(' ');
      }

      // Clean up the name
      name = name.trim();
      if (!name) return null;

      return { name, quantity, unit, notes: '' };
    }).filter((item): item is { name: string; quantity: number; unit: string; notes: string } => item !== null);
  };

  // Convert scraped recipe to CreateRecipeInput format
  const convertToRecipeInput = (recipe: ScrapedRecipeTemplate): CreateRecipeInput | null => {
    if (recipe.Error || !recipe.Title) return null;

    const hasNutrition = recipe.Calories || recipe.Protein || recipe.Carbs ||
                         recipe.Fat || recipe.Fiber || recipe.Sugar || recipe.Sodium;

    return {
      title: recipe.Title,
      description: recipe.Description || '',
      servings: recipe.Servings || 4,
      prepTime: recipe.PrepTime || 0,
      cookTime: recipe.CookTime || 0,
      imageUrl: recipe.ImageUrl || undefined,
      sourceUrl: recipe.SourceUrl || undefined,
      instructions: (recipe.Instructions || '').split('\n').filter((i: string) => i.trim()),
      tags: (recipe.Tags || '').split(',').map((t: string) => t.trim()).filter((t: string) => t),
      ingredients: parseIngredients(recipe.Ingredients || ''),
      nutrition: hasNutrition ? {
        calories: typeof recipe.Calories === 'number' ? recipe.Calories : parseFloat(String(recipe.Calories)) || undefined,
        protein: typeof recipe.Protein === 'number' ? recipe.Protein : parseFloat(String(recipe.Protein)) || undefined,
        carbs: typeof recipe.Carbs === 'number' ? recipe.Carbs : parseFloat(String(recipe.Carbs)) || undefined,
        fat: typeof recipe.Fat === 'number' ? recipe.Fat : parseFloat(String(recipe.Fat)) || undefined,
        fiber: typeof recipe.Fiber === 'number' ? recipe.Fiber : parseFloat(String(recipe.Fiber)) || undefined,
        sugar: typeof recipe.Sugar === 'number' ? recipe.Sugar : parseFloat(String(recipe.Sugar)) || undefined,
        sodium: typeof recipe.Sodium === 'number' ? recipe.Sodium : parseFloat(String(recipe.Sodium)) || undefined,
      } : undefined,
    };
  };

  // Import recipes directly into the app
  const handleDirectImport = () => {
    const successfulRecipes = results.filter((r) => !r.Error);
    if (successfulRecipes.length === 0) {
      setError('No successful recipes to import');
      return;
    }

    const recipesToImport = successfulRecipes
      .map(convertToRecipeInput)
      .filter((r): r is CreateRecipeInput => r !== null);

    if (recipesToImport.length === 0) {
      setError('Failed to convert recipes for import');
      return;
    }

    bulkImport.mutate(recipesToImport, {
      onSuccess: () => {
        // Navigate to recipes page after successful import
        navigate('/recipes');
      },
    });
  };

  const handleClearSource = (hostname: string) => {
    setSourceUrls((prev) => ({ ...prev, [hostname]: [] }));
    setResults([]);
    setStatus('idle');
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  const handleClearAll = () => {
    setSourceUrls(Object.fromEntries(SOURCES.map((s) => [s.hostname, []])));
    setResults([]);
    setStatus('idle');
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  const successCount = results.filter((r) => !r.Error).length;
  const failedCount = results.filter((r) => r.Error).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Import Recipes from URLs</h1>
            <p className="text-gray-600 mt-1">
              Scrape recipes from supported sites and generate an import template
            </p>
          </div>
          <Link
            to="/recipes"
            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back to Recipes
          </Link>
        </div>

        {/* Instructions */}
        <Alert variant="info" className="mb-6">
          <h3 className="font-semibold mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Upload an Excel file with URLs, or paste URLs into the source boxes below</li>
            <li>Click "Scrape Recipes" to fetch recipe data</li>
            <li>Review the results and download the import template, or import directly</li>
          </ol>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm font-medium">Limits:</p>
            <ul className="text-sm list-disc list-inside ml-2 mt-1 space-y-0.5">
              <li>Maximum <strong>{MAX_URLS} URLs</strong> total per session</li>
              <li>Maximum <strong>{MAX_PUPPETEER_URLS} URL</strong> from Akis/Argiro at a time (uses headless browser)</li>
            </ul>
          </div>
          <p className="mt-2 text-sm opacity-75">
            Supported sites: {SOURCES.map((s) => s.label).join(', ')}
          </p>
        </Alert>

        {/* General Excel Upload */}
        <Card className="mb-6 border-2 border-dashed border-gray-300">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                <Upload className="w-5 h-5 inline mr-2" />
                Upload Excel with URLs
              </h3>
              <p className="text-sm text-gray-600">
                Upload an Excel file with URLs in the first column. URLs will be automatically sorted into the correct source box by hostname.
              </p>
            </div>
            <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer text-sm font-medium whitespace-nowrap">
              Choose File
              <input
                ref={generalFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleGeneralFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>

        {/* Source Input Boxes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {SOURCES.map((source) => {
            const urls = sourceUrls[source.hostname] || [];
            const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
              blue:    { border: 'border-blue-300',    bg: 'bg-blue-50',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-800' },
              orange:  { border: 'border-orange-300',  bg: 'bg-orange-50',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-800' },
              emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
              pink:    { border: 'border-pink-300',    bg: 'bg-pink-50',    text: 'text-pink-700',    badge: 'bg-pink-100 text-pink-800' },
            };
            const colors = colorMap[source.color] || colorMap.blue;
            const borderColor = colors.border;
            const bgAccent = colors.bg;
            const textAccent = colors.text;
            const badgeBg = colors.badge;

            return (
              <Card key={source.hostname} className={`border-2 ${borderColor}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeBg}`}>
                    {source.label}
                  </span>
                  {urls.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {urls.length} URL{urls.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Excel with URLs
                  </label>
                  <input
                    ref={(el) => { fileInputRefs.current[source.hostname] = el; }}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, source.hostname)}
                    className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:${bgAccent} file:${textAccent} hover:file:opacity-80`}
                  />
                </div>

                {/* Manual Input */}
                <TextArea
                  label="Or paste URLs (one per line)"
                  rows={4}
                  placeholder={source.placeholder}
                  onChange={(e) => handleManualInput(e.target.value, source.hostname)}
                  className="text-sm"
                />

                {/* URL Preview */}
                {urls.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {urls.length} URL{urls.length !== 1 ? 's' : ''} ready
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleClearSource(source.hostname)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                      {urls.map((url, index) => (
                        <div key={index} className="text-sm text-gray-600 truncate">
                          {index + 1}. {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Scrape Section */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Scrape Recipes</h2>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          {isOverLimit && (
            <Alert variant="error" className="mb-4">
              Too many URLs: {allUrls.length}/{MAX_URLS}. Please remove {allUrls.length - MAX_URLS} URL(s) before scraping.
            </Alert>
          )}

          {!isOverLimit && isPuppeteerOverLimit && (
            <Alert variant="error" className="mb-4">
              Too many Akis/Argiro URLs: {puppeteerUrlCount}/{MAX_PUPPETEER_URLS}.
              Please remove {puppeteerUrlCount - MAX_PUPPETEER_URLS} URL(s) from these sites before scraping.
              <span className="block text-xs mt-1 opacity-75">
                These sites require headless browser which can freeze the server if too many are processed at once.
              </span>
            </Alert>
          )}

          {!isOverLimit && !isPuppeteerOverLimit && puppeteerUrlCount > 0 && status === 'idle' && (
            <Alert variant="error" className="mb-4">
              <strong>⚠️ Warning:</strong> You have {puppeteerUrlCount} Akis/Argiro URL(s).
              <span className="block mt-1">
                <strong>Akis:</strong> Often blocked by Cloudflare - may fail. Works intermittently.
              </span>
              <span className="block">
                <strong>Argiro:</strong> Currently disabled due to technical issues.
              </span>
              <span className="block mt-2 text-sm">
                <strong>Recommended:</strong> Use bigrecipe.com or allrecipes.com for reliable scraping.
              </span>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              variant="success"
              size="lg"
              onClick={handleScrape}
              disabled={allUrls.length === 0 || isOverLimit || isPuppeteerOverLimit}
              loading={status === 'loading'}
            >
              {status === 'loading'
                ? 'Scraping...'
                : `Scrape ${allUrls.length} Recipe${allUrls.length !== 1 ? 's' : ''}`}
            </Button>

            <div className="flex flex-col text-sm">
              <span className={`font-medium ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                {allUrls.length}/{MAX_URLS} URLs
              </span>
              {puppeteerUrlCount > 0 && (
                <span className={`text-xs ${isPuppeteerOverLimit ? 'text-red-600' : 'text-amber-600'}`}>
                  {puppeteerUrlCount}/{MAX_PUPPETEER_URLS} Akis/Argiro
                </span>
              )}
            </div>

            {allUrls.length > 0 && status !== 'loading' && (
              <Button variant="link" size="sm" onClick={handleClearAll} className="text-red-600 hover:text-red-700">
                Clear all
              </Button>
            )}

            {(status === 'loading' || status === 'stuck') && (
              <div className="flex-1 ml-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {status === 'stuck'
                      ? '⚠️ Scraper appears stuck...'
                      : `Processing ~${progress.current} of ${progress.total} recipes...`
                    }
                  </span>
                  <span>
                    {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')} elapsed
                    {estimatedTime > 0 && ` / ~${Math.ceil(estimatedTime / 60)} min estimated`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${status === 'stuck' ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                {status === 'stuck' ? (
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-sm text-red-600">
                      The scraper is not responding. The server may be frozen.
                    </p>
                    <Button variant="danger" size="sm" onClick={handleResetScraper}>
                      Reset Scraper
                    </Button>
                  </div>
                ) : (
                  <>
                    {puppeteerUrlCount > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Some recipes use headless browser (Cloudflare protection). Please be patient.
                      </p>
                    )}
                    {elapsedTime > estimatedTime + 30 && (
                      <p className="text-xs text-red-600 mt-1">
                        Taking longer than expected. If it doesn't complete soon, you can reset the scraper.
                        <button
                          onClick={handleResetScraper}
                          className="ml-2 underline hover:no-underline"
                        >
                          Reset now
                        </button>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Results Section */}
        {results.length > 0 && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Results</h2>
              <div className="flex gap-3">
                <Button onClick={handleDownload} variant="secondary" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel
                </Button>
                <Button
                  onClick={handleDirectImport}
                  variant="primary"
                  size="lg"
                  loading={bulkImport.isPending}
                  disabled={successCount === 0}
                >
                  <Import className="w-4 h-4 mr-2" />
                  Import {successCount} Recipe{successCount !== 1 ? 's' : ''} Directly
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{results.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {/* Recipe List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((recipe, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    recipe.Error
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {recipe.Title || 'Failed to scrape'}
                      </h3>
                      <p className="text-sm text-gray-600 truncate max-w-md">
                        {recipe.SourceUrl}
                      </p>
                    </div>
                    {recipe.Error ? (
                      <span className="text-sm text-red-600">{recipe.Error}</span>
                    ) : (
                      <span className="text-sm text-green-600">
                        {recipe.Servings} servings | {recipe.Ingredients.split(';').length} ingredients
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
