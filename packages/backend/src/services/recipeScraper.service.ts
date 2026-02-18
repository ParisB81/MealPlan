import axios from 'axios';
import * as cheerio from 'cheerio';
import { spawn, ChildProcess, exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { randomUUID } from 'crypto';

// Track active child processes for cleanup
const activeProcesses: Set<ChildProcess> = new Set();

// ============================================================================
// JOB-BASED ASYNC SCRAPING
// ============================================================================

export interface PuppeteerJob {
  id: string;
  url: string;
  siteType: 'akis' | 'argiro';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  outputFile: string;
  startedAt: number;
  result?: any;
  error?: string;
}

// In-memory job storage (jobs expire after 10 minutes)
const puppeteerJobs: Map<string, PuppeteerJob> = new Map();
const JOB_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of puppeteerJobs.entries()) {
    if (now - job.startedAt > JOB_EXPIRY_MS) {
      // Cleanup temp file if it exists
      try { fs.unlinkSync(job.outputFile); } catch {}
      puppeteerJobs.delete(id);
    }
  }
}, 60000); // Check every minute

/**
 * Start a Puppeteer scraping job asynchronously.
 * Uses PowerShell Start-Process to launch a completely independent process.
 * Frontend polls for status via getPuppeteerJobStatus().
 */
export function startPuppeteerJob(url: string, siteType: 'akis' | 'argiro'): PuppeteerJob {
  const jobId = randomUUID();
  const outputFile = path.join(os.tmpdir(), `puppeteer-job-${jobId}.json`);

  const job: PuppeteerJob = {
    id: jobId,
    url,
    siteType,
    status: 'pending',
    outputFile,
    startedAt: Date.now(),
  };

  puppeteerJobs.set(jobId, job);

  // Get paths for worker script and tsx
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const workerScript = path.join(__dirname, '..', 'workers', 'puppeteerWorker.ts');
  const tsxPath = path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const nodePath = process.execPath;

  console.log(`[Job ${jobId}] Starting ${siteType} scrape for: ${url}`);

  try {
    // Create a batch file that runs the worker
    const batchFile = path.join(os.tmpdir(), `puppeteer-worker-${jobId}.bat`);
    const batchContent = `@echo off\r\n"${nodePath}" "${tsxPath}" "${workerScript}" "${url}" "${siteType}" "${outputFile}"\r\n`;
    fs.writeFileSync(batchFile, batchContent);

    // Use wmic process call create to spawn a completely independent process
    // This is the most reliable way to spawn a detached process on Windows
    exec(`wmic process call create "${batchFile}"`, {
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Job ${jobId}] wmic failed:`, error.message);
      } else {
        console.log(`[Job ${jobId}] wmic output:`, stdout.substring(0, 200));
      }
    });

    job.status = 'running';
    console.log(`[Job ${jobId}] Worker launching via wmic: ${batchFile}`);
  } catch (err: any) {
    console.error(`[Job ${jobId}] Failed to launch worker:`, err.message);
    job.status = 'failed';
    job.error = `Failed to start scraping: ${err.message}`;
  }

  return job;
}

/**
 * Check the status of a Puppeteer job.
 * Returns the job with updated status and result if completed.
 */
export function getPuppeteerJobStatus(jobId: string): PuppeteerJob | null {
  const job = puppeteerJobs.get(jobId);
  if (!job) return null;

  // If already completed/failed, return cached result
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'timeout') {
    return job;
  }

  // Check if timed out (90 seconds)
  const elapsed = Date.now() - job.startedAt;
  if (elapsed > 90000) {
    job.status = 'timeout';
    job.error = 'Process timeout - browser took too long';
    // Cleanup temp file
    try { fs.unlinkSync(job.outputFile); } catch {}
    return job;
  }

  // Check if output file exists (worker completed)
  try {
    if (fs.existsSync(job.outputFile)) {
      const content = fs.readFileSync(job.outputFile, 'utf-8');
      fs.unlinkSync(job.outputFile); // Delete temp file

      try {
        const result = JSON.parse(content);
        if (result.success) {
          job.status = 'completed';
          job.result = result;
        } else {
          job.status = 'failed';
          job.error = result.error || 'Unknown error';
          job.result = result;
        }
      } catch {
        job.status = 'failed';
        job.error = 'Failed to parse worker output';
      }
    }
  } catch {}

  return job;
}

/**
 * Get all active jobs (for debugging/monitoring)
 */
export function getAllPuppeteerJobs(): PuppeteerJob[] {
  return Array.from(puppeteerJobs.values());
}

/**
 * Force cleanup of all active Puppeteer child processes.
 * Called by the /scraper/cleanup endpoint.
 */
export async function forceCleanupBrowser(): Promise<void> {
  console.log(`[Scraper] Force cleaning up ${activeProcesses.size} active processes...`);

  // Kill all tracked child processes
  for (const proc of activeProcesses) {
    try {
      proc.kill('SIGKILL');
    } catch {}
  }
  activeProcesses.clear();

  // Also kill any orphaned Chrome/Chromium processes
  await killPuppeteerChromium();
}

/**
 * Kill a process tree by PID (the process and all its children).
 * This is used to clean up the child process and any Chrome instances it spawned.
 */
async function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // taskkill /T kills the process tree (parent and all children)
      exec(`taskkill /F /PID ${pid} /T 2>nul`, () => resolve());
    } else {
      // On Linux/Mac, kill the process group
      exec(`kill -9 -${pid} 2>/dev/null || kill -9 ${pid} 2>/dev/null`, () => resolve());
    }
  });
}

/**
 * Kill only Puppeteer's headless Chromium processes, NOT the user's regular Chrome browser.
 * This is a no-op now since exec with timeout handles cleanup automatically.
 * Kept for API compatibility.
 */
async function killPuppeteerChromium(): Promise<void> {
  // No longer needed - exec timeout handles process cleanup
  return Promise.resolve();
}

// Get the directory of this file for spawning worker
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_SCRIPT = path.join(__dirname, '..', 'workers', 'puppeteerWorker.ts');

// Timeout for child process (in ms)
const CHILD_PROCESS_TIMEOUT = 90000; // 90 seconds

/**
 * Run Puppeteer scraping in a child process using PowerShell Start-Process.
 * Uses a temp file for output to avoid pipe blocking issues.
 * Polls for the output file to complete rather than waiting on the process.
 */
async function runPuppeteerInChildProcess(
  url: string,
  siteType: 'akis' | 'argiro'
): Promise<{ success: boolean; data?: any; error?: string; source?: string }> {
  console.log(`[Child Process] Launching worker for ${siteType}: ${url}`);

  // Create a unique temp file for output
  const outputFile = path.join(os.tmpdir(), `puppeteer-result-${randomUUID()}.json`);

  // Use tsx to run the TypeScript worker
  const tsxPath = path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const nodePath = process.execPath;

  return new Promise((resolve) => {
    // Create a batch file that runs the worker
    const batchFile = path.join(os.tmpdir(), `puppeteer-batch-${randomUUID()}.bat`);
    const batchContent = `@echo off\r\n"${nodePath}" "${tsxPath}" "${WORKER_SCRIPT}" "${url}" "${siteType}" "${outputFile}"\r\n`;

    try {
      fs.writeFileSync(batchFile, batchContent);

      // Use wmic to spawn a completely independent process
      exec(`wmic process call create "${batchFile}"`, {
        windowsHide: true,
      }, (error) => {
        if (error) {
          console.log(`[Child Process] wmic failed: ${error.message}`);
        } else {
          console.log(`[Child Process] wmic launched batch file: ${batchFile}`);
        }
      });
    } catch (err: any) {
      console.log(`[Child Process] Failed to launch: ${err.message}`);
      resolve({ success: false, error: `Failed to launch worker: ${err.message}` });
      return;
    }

    // Poll for the output file instead of waiting on the process
    const startTime = Date.now();
    const pollInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Check for timeout
      if (elapsed > CHILD_PROCESS_TIMEOUT) {
        clearInterval(pollInterval);
        console.log(`[Child Process] Timeout for ${url}`);
        // Cleanup temp file if it exists
        try { fs.unlinkSync(outputFile); } catch {}
        resolve({ success: false, error: 'Process timeout - browser took too long' });
        return;
      }

      // Check if output file exists
      try {
        if (fs.existsSync(outputFile)) {
          // Wait a moment to ensure file is fully written
          setTimeout(() => {
            clearInterval(pollInterval);
            try {
              const content = fs.readFileSync(outputFile, 'utf-8');
              fs.unlinkSync(outputFile);

              const result = JSON.parse(content);
              console.log(`[Child Process] Success for ${url}`);
              resolve(result);
            } catch (err: any) {
              console.log(`[Child Process] Failed to parse output for ${url}: ${err.message}`);
              resolve({ success: false, error: 'Failed to parse worker output' });
            }
          }, 500);
        }
      } catch {}
    }, 1000); // Poll every second
  });
}

export interface ScrapedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  imageUrl: string;
  instructions: string;
  tags: string;
  ingredients: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  sourceUrl: string;
  error?: string;
}

export class RecipeScraperService {
  private static SUPPORTED_HOSTS = ['bigrecipe.com', 'allrecipes.com', 'akispetretzikis.com', 'argiro.gr'];

  /**
   * Long-form / variant English units → app-standard abbreviations.
   * Applied to all scraped ingredients after site-specific unit mapping.
   */
  private static UNIT_NORMALIZATION_MAP: Record<string, string> = {
    // Weight
    'gram': 'g', 'grams': 'g', 'gr': 'g',
    'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg', 'kilos': 'kg',
    'milligram': 'mg', 'milligrams': 'mg',
    'ounce': 'oz', 'ounces': 'oz',
    'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
    // Volume
    'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'cup': 'cup', 'cups': 'cup',
    'milliliter': 'ml', 'milliliters': 'ml', 'millilitre': 'ml', 'millilitres': 'ml',
    'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l', 'lt': 'l',
    'deciliter': 'dl', 'deciliters': 'dl', 'decilitre': 'dl', 'decilitres': 'dl',
    'centiliter': 'cl', 'centiliters': 'cl', 'centilitre': 'cl', 'centilitres': 'cl',
    'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl ounce': 'fl oz', 'fl ounces': 'fl oz',
    'pint': 'pt', 'pints': 'pt',
    'quart': 'qt', 'quarts': 'qt',
    'gallon': 'gal', 'gallons': 'gal',
    // Count
    'clove': 'clove', 'cloves': 'clove',
    'piece': 'piece', 'pieces': 'piece',
    'slice': 'slice', 'slices': 'slice',
    'stalk': 'stalk', 'stalks': 'stalk',
    'stick': 'stick', 'sticks': 'stick',
    'sprig': 'sprig', 'sprigs': 'sprig',
    'bunch': 'bunch', 'bunches': 'bunch',
    'head': 'head', 'heads': 'head',
    'leaf': 'leaf', 'leaves': 'leaf',
    'fillet': 'fillet', 'fillets': 'fillet',
    'strip': 'strip', 'strips': 'strip',
    'ear': 'ear', 'ears': 'ear',
    'bulb': 'bulb', 'bulbs': 'bulb',
    // Small quantity
    'pinch': 'pinch', 'pinches': 'pinch',
    'dash': 'dash', 'dashes': 'dash',
    'drop': 'drop', 'drops': 'drop',
    'handful': 'handful', 'handfuls': 'handful',
    'scoop': 'scoop', 'scoops': 'scoop',
    // Package
    'pack': 'pack', 'packs': 'pack', 'package': 'pack', 'packages': 'pack', 'packet': 'pack', 'packets': 'pack',
    'can': 'can', 'cans': 'can',
    'jar': 'jar', 'jars': 'jar',
    'bottle': 'bottle', 'bottles': 'bottle',
    'box': 'box', 'boxes': 'box',
    'bag': 'bag', 'bags': 'bag',
    // Size
    'small': 'small', 'medium': 'medium', 'large': 'large',
  };

  /**
   * Normalize a unit string to the app's standard abbreviation.
   * Handles: long-form English (tablespoon→tbsp), plurals (pounds→lb),
   * parenthetical forms from Akis EN (tablespoon(s)→tbsp, clove(s) of garlic→clove),
   * and common variants (gr→g, lt→l).
   */
  private normalizeUnit(unit: string): string {
    if (!unit) return unit;

    // Strip trailing parenthetical plurals: "tablespoon(s)" → "tablespoon"
    let cleaned = unit.replace(/\(s\)$/i, '').trim().toLowerCase();

    // Look up full string in normalization map
    const mapped = RecipeScraperService.UNIT_NORMALIZATION_MAP[cleaned];
    if (mapped) return mapped;

    // Strip trailing "of ..." (e.g. "clove of garlic" → "clove")
    const withoutOf = cleaned.replace(/\s+of\s+.*$/i, '').trim();
    if (withoutOf !== cleaned) {
      const mappedWithoutOf = RecipeScraperService.UNIT_NORMALIZATION_MAP[withoutOf];
      if (mappedWithoutOf) return mappedWithoutOf;
    }

    // Try just the first word (e.g. "level tablespoon" → "tablespoon" → "tbsp")
    const firstWord = cleaned.split(/\s+/)[0];
    if (firstWord !== cleaned) {
      const mappedFirst = RecipeScraperService.UNIT_NORMALIZATION_MAP[firstWord];
      if (mappedFirst) return mappedFirst;
    }

    return cleaned;
  }

  /**
   * Greek unit abbreviations → English unit names (for Akis & Argiro scrapers)
   */
  private static GREEK_UNIT_MAP: Record<string, string> = {
    // Weight
    'γρ.': 'g',
    'γρ': 'g',
    'γραμμάρια': 'g',
    'γραμμάρια': 'g',
    'κιλό': 'kg',
    'κιλά': 'kg',
    'kg': 'kg',
    'g': 'g',
    'mg': 'mg',
    // Volume
    'ml': 'ml',
    'λίτρο': 'l',
    'λίτρα': 'l',
    'lt': 'l',
    'l': 'l',
    // Spoons
    'κ.σ.': 'tbsp',
    'κ.σ': 'tbsp',
    'κουταλιά σούπας': 'tbsp',
    'κουταλιές σούπας': 'tbsp',
    'κ.γ.': 'tsp',
    'κ.γ': 'tsp',
    'κουταλάκι γλυκού': 'tsp',
    'κουταλάκια γλυκού': 'tsp',
    // Cup
    'φλ.': 'cup',
    'φλ': 'cup',
    'φλιτζάνι': 'cup',
    'φλιτζάνια': 'cup',
    'κούπα': 'cup',
    'κούπες': 'cup',
    // Count
    'σκ.': 'clove',
    'σκελ.': 'clove',
    'σκελ': 'clove',
    'σκελίδα': 'clove',
    'σκελίδες': 'clove',
    'τεμ.': 'piece',
    'τεμ': 'piece',
    'τεμάχιο': 'piece',
    'τεμάχια': 'piece',
    'φέτα': 'slice',
    'φέτες': 'slice',
    'φύλλο': 'leaf',
    'φύλλα': 'leaf',
    'κλων.': 'sprig',
    'κλων': 'sprig',
    'κλωνάρι': 'sprig',
    'κλωνάρια': 'sprig',
    'ματσάκι': 'bunch',
    'ματσάκια': 'bunch',
    'φιλέτο': 'fillet',
    'φιλέτα': 'fillet',
    // Small quantity
    'πρέζα': 'pinch',
    'πρέζες': 'pinch',
    'χούφτα': 'handful',
    'χούφτες': 'handful',
    // Package
    'πακέτο': 'pack',
    'πακέτα': 'pack',
    'κουτί': 'piece',
    'κουτιά': 'piece',
    'βάζο': 'piece',
    'βάζα': 'piece',
    // Size
    'μεγάλο': 'large',
    'μεγάλα': 'large',
    'μεγάλη': 'large',
    'μεγάλες': 'large',
    'μεσαίο': 'medium',
    'μεσαία': 'medium',
    'μεσαίες': 'medium',
    'μικρό': 'small',
    'μικρά': 'small',
    'μικρή': 'small',
    'μικρές': 'small',
  };

  /**
   * Scrape a recipe from a supported site
   */
  async scrapeRecipe(url: string): Promise<ScrapedRecipe> {
    try {
      // Validate URL is from a supported site
      const urlObj = new URL(url);
      const isSupported = RecipeScraperService.SUPPORTED_HOSTS.some(
        (host) => urlObj.hostname.includes(host)
      );
      if (!isSupported) {
        return {
          title: '',
          description: '',
          servings: 4,
          prepTime: 0,
          cookTime: 0,
          imageUrl: '',
          instructions: '',
          tags: '',
          ingredients: '',
          sourceUrl: url,
          error: `Only ${RecipeScraperService.SUPPORTED_HOSTS.join(', ')} URLs are supported`,
        };
      }

      // Use dedicated API-based scraper for akispetretzikis.com
      if (urlObj.hostname.includes('akispetretzikis.com')) {
        return this.scrapeAkisRecipe(url);
      }

      // Use Puppeteer-based scraper for argiro.gr (Cloudflare protected)
      if (urlObj.hostname.includes('argiro.gr')) {
        return this.scrapeArgiroRecipe(url);
      }

      // Fetch the page with browser-like headers
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Extract recipe data using JSON-LD schema if available
      let recipeData = this.extractJsonLd($);

      if (!recipeData) {
        // Fall back to scraping HTML elements
        recipeData = this.scrapeHtmlElements($, url);
      }

      // Prepend source tag based on hostname
      const sourceTag = this.getSourceTag(urlObj.hostname);
      if (sourceTag && recipeData.tags) {
        recipeData.tags = `${sourceTag}, ${recipeData.tags}`;
      } else if (sourceTag) {
        recipeData.tags = sourceTag;
      }

      return {
        ...recipeData,
        sourceUrl: url,
      };
    } catch (error: any) {
      return {
        title: '',
        description: '',
        servings: 4,
        prepTime: 0,
        cookTime: 0,
        imageUrl: '',
        instructions: '',
        tags: '',
        ingredients: '',
        sourceUrl: url,
        error: error.message || 'Failed to fetch recipe',
      };
    }
  }

  /**
   * Extract recipe ID or slug from an akispetretzikis.com URL.
   * Supports: /recipe/118/slug, /en/recipe/118/slug, /categories/cat/slug
   */
  private extractAkisIdOrSlug(url: string): string {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    const recipeIdx = pathParts.indexOf('recipe');
    if (recipeIdx !== -1 && pathParts[recipeIdx + 1]) {
      return pathParts[recipeIdx + 1];
    }
    if (pathParts.includes('categories') && pathParts.length >= 3) {
      return pathParts[pathParts.length - 1];
    }
    return pathParts[pathParts.length - 1] || '';
  }

  /**
   * Scrape a recipe from akispetretzikis.com.
   *
   * Strategy:
   *  1. Try the site's internal REST API (fast, no browser needed).
   *  2. If Cloudflare blocks the API (403), fall back to Puppeteer:
   *     launch a real headless browser, let it solve the Cloudflare
   *     challenge, then extract the __NEXT_DATA__ JSON embedded in
   *     the rendered page.
   *
   * The API returns Greek content, so Greek units are mapped to English.
   */
  private async scrapeAkisRecipe(url: string): Promise<ScrapedRecipe> {
    // Delegate to scrapeAkisUrlsBatch with a single URL.
    // This ensures single and batch scraping use the same logic:
    // API call first, then fresh-browser Puppeteer fallback with proper
    // Cloudflare handling.
    const results = await this.scrapeAkisUrlsBatch([url]);
    return results[0];
  }

  /**
   * Scrape a recipe from argiro.gr using Puppeteer.
   * Delegates to scrapeArgiroUrlsBatch with a single URL to ensure
   * single and batch scraping use the same logic.
   */
  private async scrapeArgiroRecipe(url: string): Promise<ScrapedRecipe> {
    const results = await this.scrapeArgiroUrlsBatch([url]);
    return results[0];
  }

  /**
   * Convert JSON-LD Recipe schema to the Akis API format so parseAkisRecipe() can handle it.
   */
  private convertJsonLdToAkisFormat(jsonLd: any): any {
    // Build ingredient_sections from recipeIngredient (flat list)
    const ingredientStrings: string[] = jsonLd.recipeIngredient || [];
    const ingredients = ingredientStrings.map((ing: string) => {
      // Try to parse "750 g ground beef" format
      const match = ing.match(/^([\d./]+)\s*([a-zA-Z.]+)?\s+(.+)$/);
      if (match) {
        return {
          title: match[3],
          quantity: match[1],
          unit: match[2] || '',
          info: '',
        };
      }
      return { title: ing, quantity: '', unit: '', info: '' };
    });

    // Build method from recipeInstructions
    const instructions = jsonLd.recipeInstructions || [];
    const steps = instructions.map((inst: any, i: number) => ({
      id: String(i + 1),
      step: typeof inst === 'string' ? inst : inst.text || inst.name || '',
    }));

    // Parse times
    const parseDur = (dur: string) => {
      if (!dur) return 0;
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      return m ? (parseInt(m[1] || '0') * 60 + parseInt(m[2] || '0')) : 0;
    };

    return {
      title: jsonLd.name || '',
      seo_description: jsonLd.description || '',
      shares: String(this.parseServings(jsonLd.recipeYield)),
      make_time: parseDur(jsonLd.prepTime),
      bake_time: parseDur(jsonLd.cookTime),
      ingredient_sections: [{ title: '', ingredients }],
      method: [{ section: '', steps }],
      nutrition: jsonLd.nutrition ? {
        sections: [{
          kcal_portion_abs: this.parseNutritionValue(jsonLd.nutrition.calories)?.toString() || '',
          protein_portion_abs: this.parseNutritionValue(jsonLd.nutrition.proteinContent)?.toString() || '',
          carbs_portion_abs: this.parseNutritionValue(jsonLd.nutrition.carbohydrateContent)?.toString() || '',
          fat_portion_abs: this.parseNutritionValue(jsonLd.nutrition.fatContent)?.toString() || '',
          fiber_portion_abs: this.parseNutritionValue(jsonLd.nutrition.fiberContent)?.toString() || '',
          sugars_portion_abs: this.parseNutritionValue(jsonLd.nutrition.sugarContent)?.toString() || '',
          sodium_portion_abs: this.parseNutritionValue(jsonLd.nutrition.sodiumContent)?.toString() || '',
        }],
      } : undefined,
      assets: jsonLd.image ? [{ url: Array.isArray(jsonLd.image) ? jsonLd.image[0] : (typeof jsonLd.image === 'string' ? jsonLd.image : jsonLd.image.url || '') }] : [],
      recipeCuisine: jsonLd.recipeCuisine || 'Greek',
      difficulty: '',
      is_ve: 0, is_vg: 0, is_gf: 0, is_df: 0,
    };
  }

  /**
   * Parse Akis Petretzikis API response into our ScrapedRecipe format
   */
  private parseAkisRecipe(recipe: any, sourceUrl: string): ScrapedRecipe {
    // Parse title
    const title = recipe.title || '';

    // Parse description (use seo_description or extra_description)
    const description = recipe.seo_description || recipe.extra_description || '';

    // Parse servings
    const servings = this.parseServings(recipe.shares);

    // Parse times (API gives minutes directly)
    const prepTime = parseInt(recipe.make_time) || 0;
    const cookTime = parseInt(recipe.bake_time) || 0;

    // Parse image
    const imageUrl = recipe.assets?.[0]?.url || '';

    // Parse ingredients from ingredient_sections
    const ingredients = this.formatAkisIngredients(recipe.ingredient_sections || []);

    // Parse instructions from method sections
    const instructions = this.formatAkisInstructions(recipe.method || []);

    // Parse tags
    const tags = this.formatAkisTags(recipe);

    // Parse nutrition
    const nutrition = recipe.nutrition?.sections?.[0];
    const calories = nutrition ? this.parseNutritionValue(nutrition.kcal_portion_abs) : undefined;
    const protein = nutrition ? this.parseNutritionValue(nutrition.protein_portion_abs) : undefined;
    const carbs = nutrition ? this.parseNutritionValue(nutrition.carbs_portion_abs) : undefined;
    const fat = nutrition ? this.parseNutritionValue(nutrition.fat_portion_abs) : undefined;
    const fiber = nutrition ? this.parseNutritionValue(nutrition.fiber_portion_abs) : undefined;
    const sugar = nutrition ? this.parseNutritionValue(nutrition.sugars_portion_abs) : undefined;
    // Akis stores sodium in grams, so always convert to mg
    const sodium = nutrition ? this.parseSodiumValueForAkis(nutrition.sodium_portion_abs) : undefined;

    return {
      title,
      description,
      servings,
      prepTime,
      cookTime,
      imageUrl,
      instructions,
      tags,
      ingredients,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      sourceUrl,
    };
  }

  /**
   * Format Akis ingredient sections into semicolon-separated string.
   * Handles Greek unit abbreviations and maps them to English.
   */
  private formatAkisIngredients(sections: any[]): string {
    const allIngredients: string[] = [];

    for (const section of sections) {
      const ingredients = section.ingredients || [];
      for (const ing of ingredients) {
        const name = (ing.title || '').trim();
        if (!name) continue;

        let quantity = (ing.quantity || '').trim();
        let unit = (ing.unit || '').trim();
        const info = (ing.info || '').trim();

        // Convert fractions in quantity
        if (quantity) {
          quantity = this.convertFraction(quantity);
        }

        // Map Greek unit to English, then normalize to app abbreviation
        if (unit) {
          const mappedUnit = RecipeScraperService.GREEK_UNIT_MAP[unit] ||
                             RecipeScraperService.GREEK_UNIT_MAP[unit.toLowerCase()] ||
                             unit;
          unit = this.normalizeUnit(mappedUnit);
        }

        // Build ingredient string: "quantity unit name (info)"
        let result = '';
        if (quantity && unit) {
          result = `${quantity} ${unit} ${name}`;
        } else if (quantity) {
          result = `${quantity} piece ${name}`;
        } else {
          // Ingredients without quantity (e.g., "salt", "pepper") → "1 pinch name"
          result = `1 pinch ${name}`;
        }

        if (info) {
          result += ` (${info})`;
        }

        allIngredients.push(result);
      }
    }

    return allIngredients.join('; ');
  }

  /**
   * Format Akis method sections into newline-separated instruction steps.
   * Includes section headers and decodes HTML entities.
   */
  private formatAkisInstructions(methodSections: any[]): string {
    const steps: string[] = [];
    let stepNumber = 1;

    for (const section of methodSections) {
      const sectionTitle = (section.section || '').trim();
      if (sectionTitle) {
        steps.push(`--- ${sectionTitle} ---`);
      }

      for (const s of section.steps || []) {
        let text = (s.step || '').trim();
        // Decode HTML entities
        text = text
          .replace(/&eacute;/g, 'é')
          .replace(/&rsquo;/g, '\u2019')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&deg;/g, '°')
          .replace(/<[^>]*>/g, '') // Strip any HTML tags
          .replace(/\s+/g, ' ')
          .trim();

        if (text) {
          steps.push(`Step ${stepNumber}: ${text}`);
          stepNumber++;
        }
      }
    }

    return steps.join('\n');
  }

  /**
   * Format tags from Akis recipe data
   */
  private formatAkisTags(recipe: any): string {
    const tags: string[] = ['Akis Petretzikis'];

    // Add cuisine
    if (recipe.recipeCuisine) {
      tags.push(recipe.recipeCuisine);
    } else {
      tags.push('Greek');
    }

    // Add dietary tags
    if (recipe.is_ve) tags.push('Vegan');
    if (recipe.is_vg) tags.push('Vegetarian');
    if (recipe.is_gf) tags.push('Gluten-Free');
    if (recipe.is_df) tags.push('Dairy-Free');

    // Add difficulty
    const difficulty = recipe.difficulty || '';
    if (difficulty) tags.push(difficulty);

    return [...new Set(tags.filter((t) => t))].join(', ');
  }

  /**
   * Extract recipe data from JSON-LD structured data
   */
  private extractJsonLd($: cheerio.CheerioAPI): Omit<ScrapedRecipe, 'sourceUrl'> | null {
    try {
      const scripts = $('script[type="application/ld+json"]');

      for (let i = 0; i < scripts.length; i++) {
        const content = $(scripts[i]).html();
        if (!content) continue;

        const data = JSON.parse(content);
        const recipe = this.findRecipeInJsonLd(data);

        if (recipe) {
          return this.parseJsonLdRecipe(recipe);
        }
      }
    } catch (error) {
      // JSON-LD parsing failed, will fall back to HTML scraping
    }
    return null;
  }

  /**
   * Find recipe object in JSON-LD data (handles arrays and @graph)
   */
  private findRecipeInJsonLd(data: any): any {
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this.findRecipeInJsonLd(item);
        if (found) return found;
      }
      return null;
    }

    const type = data['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
      return data;
    }

    if (data['@graph']) {
      return this.findRecipeInJsonLd(data['@graph']);
    }

    return null;
  }

  /**
   * Parse JSON-LD recipe into our format
   */
  private parseJsonLdRecipe(recipe: any): Omit<ScrapedRecipe, 'sourceUrl'> {
    // Parse ingredients
    const ingredients = this.formatIngredients(recipe.recipeIngredient || []);

    // Parse instructions
    const instructions = this.formatInstructions(recipe.recipeInstructions || []);

    // Parse times (ISO 8601 duration format like PT20M)
    const prepTime = this.parseDuration(recipe.prepTime);
    const cookTime = this.parseDuration(recipe.cookTime);

    // Parse nutrition
    const nutrition = recipe.nutrition || {};

    // Parse tags/categories
    const tags = this.formatTags(recipe.recipeCategory, recipe.recipeCuisine, recipe.keywords);

    return {
      title: recipe.name || '',
      description: recipe.description || '',
      servings: this.parseServings(recipe.recipeYield),
      prepTime,
      cookTime,
      imageUrl: this.parseImage(recipe.image),
      instructions,
      tags,
      ingredients,
      calories: this.parseNutritionValue(nutrition.calories),
      protein: this.parseNutritionValue(nutrition.proteinContent),
      carbs: this.parseNutritionValue(nutrition.carbohydrateContent),
      fat: this.parseNutritionValue(nutrition.fatContent),
      fiber: this.parseNutritionValue(nutrition.fiberContent),
      sugar: this.parseNutritionValue(nutrition.sugarContent),
      sodium: this.parseSodiumValue(nutrition.sodiumContent),
    };
  }

  /**
   * Scrape recipe from HTML elements as fallback
   */
  private scrapeHtmlElements($: cheerio.CheerioAPI, url: string): Omit<ScrapedRecipe, 'sourceUrl'> {
    // Common selectors for recipe sites
    const title = $('h1').first().text().trim() ||
                  $('[class*="title"]').first().text().trim() ||
                  $('[class*="recipe-name"]').first().text().trim();

    const description = $('meta[name="description"]').attr('content') ||
                       $('[class*="description"]').first().text().trim() ||
                       $('[class*="summary"]').first().text().trim();

    // Try to find ingredients
    const ingredientElements = $('[class*="ingredient"]').not('[class*="instructions"]');
    const ingredientsList: string[] = [];
    ingredientElements.each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 200) { // Sanity check
        ingredientsList.push(text);
      }
    });

    // Try to find instructions
    const instructionElements = $('[class*="instruction"], [class*="step"], [class*="direction"]');
    const instructionsList: string[] = [];
    instructionElements.each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 1000) { // Sanity check
        instructionsList.push(text);
      }
    });

    return {
      title,
      description: description || '',
      servings: 4,
      prepTime: 0,
      cookTime: 0,
      imageUrl: $('meta[property="og:image"]').attr('content') || '',
      instructions: instructionsList.map((inst, i) => `Step ${i + 1}: ${inst}`).join('\n'),
      tags: '',
      ingredients: this.formatIngredients(ingredientsList),
    };
  }

  /**
   * Format ingredients array into semicolon-separated string
   * Tries to parse "[quantity] [unit] [name]" format
   */
  private formatIngredients(ingredients: string[]): string {
    return ingredients
      .map((ing) => {
        // Clean up the ingredient string
        let cleaned = ing.trim()
          .replace(/\s+/g, ' ')
          .replace(/^[-•*]\s*/, ''); // Remove bullet points

        // Handle "(XX oz) can" pattern: "1 (15 oz) can black beans, drained" → "15 oz black beans"
        // Also handles "2 (14.5 oz) cans diced tomatoes" → "29 oz diced tomatoes"
        const canMatch = cleaned.match(/^([\d./]+)\s+\(([\d.]+)\s*oz\)\s+cans?\s+(.+)$/i);
        if (canMatch) {
          const canCount = this.convertFraction(canMatch[1]);
          const ozPerCan = parseFloat(canMatch[2]);
          const totalOz = Math.round(parseFloat(canCount) * ozPerCan * 100) / 100;
          const name = canMatch[3].replace(/,\s*(drained|rinsed|undrained).*$/i, '').trim();
          return `${totalOz} oz ${name}`;
        }

        // Try to extract quantity + rest, then find the unit boundary
        const qtyMatch = cleaned.match(/^([\d./]+(?:\s*-\s*[\d./]+)?)\s+(.+)$/);

        if (qtyMatch) {
          let quantity = this.convertFraction(qtyMatch[1]);
          const rest = qtyMatch[2];

          // Try two-word unit first (e.g., "fluid ounce", "fl oz")
          const twoWordMatch = rest.match(/^(\w+\s+\w+)\s+(.+)$/);
          if (twoWordMatch) {
            const twoWordNorm = this.normalizeUnit(twoWordMatch[1]);
            if (twoWordNorm !== twoWordMatch[1].trim().toLowerCase()) {
              // Two-word unit was recognized and normalized
              return `${quantity} ${twoWordNorm} ${twoWordMatch[2]}`;
            }
          }

          // Try single-word unit
          const oneWordMatch = rest.match(/^(\S+)\s+(.+)$/);
          if (oneWordMatch) {
            let unit = oneWordMatch[1];
            const name = oneWordMatch[2];

            // Normalize unit to app abbreviation (e.g. tablespoon→tbsp)
            unit = this.normalizeUnit(unit);

            // If unit is too long and wasn't normalized, it's probably part of the name
            if (unit.length > 15) {
              return `${quantity} unit ${rest}`;
            }

            return `${quantity} ${unit} ${name}`;
          }

          // No unit found, just quantity + name
          return `${quantity} unit ${rest}`;
        }

        // Last resort: return as "1 unit [ingredient]"
        return `1 unit ${cleaned}`;
      })
      .join('; ');
  }

  /**
   * Format instructions into newline-separated steps
   */
  private formatInstructions(instructions: any[]): string {
    if (!instructions || instructions.length === 0) return '';

    return instructions
      .map((inst, index) => {
        let text = '';

        if (typeof inst === 'string') {
          text = inst;
        } else if (inst.text) {
          text = inst.text;
        } else if (inst.name) {
          text = inst.name;
        }

        return `Step ${index + 1}: ${text.trim()}`;
      })
      .join('\n');
  }

  /**
   * Parse ISO 8601 duration (e.g., PT20M, PT1H30M)
   */
  private parseDuration(duration: string | undefined): number {
    if (!duration) return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');

    return hours * 60 + minutes;
  }

  /**
   * Parse recipe yield/servings
   */
  private parseServings(yield_: string | number | string[] | undefined): number {
    if (!yield_) return 4;

    if (typeof yield_ === 'number') return yield_;

    const yieldStr = Array.isArray(yield_) ? yield_[0] : yield_;
    const match = yieldStr.match(/(\d+)/);

    return match ? parseInt(match[1]) : 4;
  }

  /**
   * Parse image from JSON-LD (can be string, array, or object)
   */
  private parseImage(image: any): string {
    if (!image) return '';
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0] || '';
    if (image.url) return image.url;
    return '';
  }

  /**
   * Parse nutrition value (removes units like "g", "mg", "kcal")
   */
  private parseNutritionValue(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;

    const match = value.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Parse sodium value with unit conversion.
   * Sodium is expected in mg, but some sites report it in g.
   * If the value contains "g" (but not "mg"), convert to mg by multiplying by 1000.
   */
  private parseSodiumValue(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;

    const numMatch = value.match(/([\d.]+)/);
    if (!numMatch) return undefined;

    const numValue = parseFloat(numMatch[1]);

    // Check if unit is grams (g) but NOT milligrams (mg)
    // Pattern: contains "g" but not preceded by "m" (so "mg" won't match)
    const isGrams = /(?<!m)g\b/i.test(value) || /^\s*[\d.]+\s*g\s*$/i.test(value);
    const isMilligrams = /mg/i.test(value);

    if (isGrams && !isMilligrams) {
      // Convert grams to milligrams
      return numValue * 1000;
    }

    return numValue;
  }

  /**
   * Parse sodium value specifically for Akis Petretzikis.
   * Akis stores ALL nutrition values in grams (including sodium as e.g., "0.3" meaning 0.3g).
   * Always convert to mg by multiplying by 1000.
   */
  private parseSodiumValueForAkis(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;

    let numValue: number;
    if (typeof value === 'number') {
      numValue = value;
    } else {
      const numMatch = value.match(/([\d.]+)/);
      if (!numMatch) return undefined;
      numValue = parseFloat(numMatch[1]);
    }

    // Akis stores sodium in grams, convert to mg
    return numValue * 1000;
  }

  /**
   * Map a hostname to a human-readable source tag.
   * Returns the tag string, or empty string for unknown hosts.
   */
  private getSourceTag(hostname: string): string {
    if (hostname.includes('bigrecipe.com')) return 'Big Recipe';
    if (hostname.includes('allrecipes.com')) return 'Allrecipes';
    if (hostname.includes('akispetretzikis.com')) return 'Akis Petretzikis';
    if (hostname.includes('argiro.gr')) return 'Argiro Barbarigou';
    return '';
  }

  /**
   * Format tags from various sources
   */
  private formatTags(category: any, cuisine: any, keywords: any): string {
    const tags: string[] = [];

    const addTags = (value: any) => {
      if (!value) return;
      if (typeof value === 'string') {
        tags.push(...value.split(',').map((t) => t.trim()));
      } else if (Array.isArray(value)) {
        tags.push(...value.map((t) => (typeof t === 'string' ? t.trim() : '')));
      }
    };

    addTags(category);
    addTags(cuisine);
    addTags(keywords);

    // Remove duplicates and empty strings
    return [...new Set(tags.filter((t) => t))].join(', ');
  }

  /**
   * Convert fraction strings to decimals
   */
  private convertFraction(value: string): string {
    // Handle ranges like "1-2" -> take first value
    if (value.includes('-')) {
      value = value.split('-')[0].trim();
    }

    // Handle fractions like "1/2", "1/4"
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          return (num / den).toFixed(2).replace(/\.?0+$/, '');
        }
      }
    }

    // Handle mixed numbers like "1 1/2"
    const mixedMatch = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const num = parseInt(mixedMatch[2]);
      const den = parseInt(mixedMatch[3]);
      return (whole + num / den).toFixed(2).replace(/\.?0+$/, '');
    }

    return value;
  }

  /**
   * Scrape multiple recipes from a list of URLs.
   * Optimized: reuses a single Puppeteer browser for all Akis URLs.
   * Argiro URLs are scraped individually (each opens its own browser).
   */
  async scrapeMultiple(urls: string[]): Promise<ScrapedRecipe[]> {
    const results: ScrapedRecipe[] = [];

    // Separate URLs by type
    const akisUrls: string[] = [];
    const argiroUrls: string[] = [];
    const otherUrls: string[] = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('akispetretzikis.com')) {
          akisUrls.push(url);
        } else if (urlObj.hostname.includes('argiro.gr')) {
          argiroUrls.push(url);
        } else {
          otherUrls.push(url);
        }
      } catch {
        otherUrls.push(url);
      }
    }

    // Scrape regular URLs first (bigrecipe, allrecipes - they're fast)
    for (const url of otherUrls) {
      const recipe = await this.scrapeRecipe(url);
      results.push(recipe);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Scrape Argiro URLs using a shared browser
    if (argiroUrls.length > 0) {
      const argiroResults = await this.scrapeArgiroUrlsBatch(argiroUrls);
      results.push(...argiroResults);
    }

    // Scrape all Akis URLs with a shared Puppeteer browser
    if (akisUrls.length > 0) {
      const akisResults = await this.scrapeAkisUrlsBatch(akisUrls);
      results.push(...akisResults);
    }

    return results;
  }

  /**
   * Scrape multiple Argiro URLs using isolated child processes.
   * Each URL is scraped in a completely separate Node.js process,
   * which can be killed if it hangs without affecting the main server.
   */
  private async scrapeArgiroUrlsBatch(urls: string[]): Promise<ScrapedRecipe[]> {
    const results: ScrapedRecipe[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[Argiro scraper] Scraping ${i + 1}/${urls.length}: ${url}`);

      // Run Puppeteer in isolated child process
      const workerResult = await runPuppeteerInChildProcess(url, 'argiro');

      if (workerResult.success && workerResult.data) {
        // Parse the data returned from the worker
        const recipeData = workerResult.data;
        const recipe = this.parseArgiroWorkerResult(recipeData, url);
        results.push(recipe);
      } else {
        console.log(`[Argiro scraper] Worker failed for ${url}: ${workerResult.error}`);
        results.push({
          title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
          imageUrl: '', instructions: '', tags: '', ingredients: '',
          sourceUrl: url,
          error: workerResult.error || 'Failed to scrape with Puppeteer',
        });
      }

      // Kill any remaining Chrome processes after each URL
      await killPuppeteerChromium();

      // Delay between URLs
      if (i < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`[Argiro scraper] Finished scraping ${urls.length} URLs`);
    return results;
  }

  /**
   * Parse the raw data from Argiro worker into a ScrapedRecipe
   */
  private parseArgiroWorkerResult(data: any, url: string): ScrapedRecipe {
    // Format ingredients
    const allIngredients: string[] = [];
    for (const section of data.ingredientSections || []) {
      for (const ing of section.items || []) {
        const quantity = (ing.quantity || '').trim();
        const name = (ing.name || '').trim();
        if (!name) continue;

        if (quantity) {
          const qtyMatch = quantity.match(/^([\d./]+(?:\s*-\s*[\d./]+)?)\s*(.*)$/);
          if (qtyMatch) {
            let qty = this.convertFraction(qtyMatch[1].trim());
            let rawUnit = qtyMatch[2].trim();
            let unit = RecipeScraperService.GREEK_UNIT_MAP[rawUnit] ||
                       RecipeScraperService.GREEK_UNIT_MAP[rawUnit.toLowerCase()] ||
                       rawUnit;
            unit = this.normalizeUnit(unit) || 'piece';
            allIngredients.push(`${qty} ${unit} ${name}`);
          } else {
            allIngredients.push(`${quantity} ${name}`);
          }
        } else {
          allIngredients.push(`1 piece ${name}`);
        }
      }
    }

    const parseMinutes = (text: string): number => {
      const match = (text || '').match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    let servings = 4;
    if (data.servingsText) {
      const m = data.servingsText.match(/(\d+)/);
      if (m) servings = parseInt(m[1]);
    }

    const tagsList = ['Argiro Barbarigou', 'Greek', ...(data.tags || [])];
    const instructions = (data.instructions || []).map((inst: string, i: number) => `Step ${i + 1}: ${inst}`).join('\n');

    console.log(`[Argiro scraper] Success: "${data.title}" - ${allIngredients.length} ingredients, ${(data.instructions || []).length} instructions`);

    return {
      title: data.title || '',
      description: data.description || '',
      servings,
      prepTime: parseMinutes(data.prepTimeText),
      cookTime: parseMinutes(data.cookTimeText),
      imageUrl: data.image || '',
      instructions,
      tags: [...new Set(tagsList.filter((t: string) => t))].join(', '),
      ingredients: allIngredients.join('; '),
      sourceUrl: url,
    };
  }

  /**
   * Scrape multiple Akis URLs using API first, then isolated child processes for Puppeteer fallback.
   * Each Puppeteer URL is scraped in a completely separate Node.js process,
   * which can be killed if it hangs without affecting the main server.
   */
  private async scrapeAkisUrlsBatch(urls: string[]): Promise<ScrapedRecipe[]> {
    const results: ScrapedRecipe[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[Akis scraper] Scraping ${i + 1}/${urls.length}: ${url}`);

      try {
        const recipeIdOrSlug = this.extractAkisIdOrSlug(url);

        if (!recipeIdOrSlug) {
          results.push({
            title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
            imageUrl: '', instructions: '', tags: '', ingredients: '',
            sourceUrl: url,
            error: 'Could not extract recipe ID or slug from URL',
          });
          continue;
        }

        // Try API first (fast, no browser needed)
        let apiSuccess = false;
        try {
          const apiUrl = `https://akispetretzikis.com/api/v1/recipe/${recipeIdOrSlug}`;
          const response = await axios.get(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            timeout: 10000,
          });

          const recipe = response.data?.data;
          if (recipe) {
            console.log(`[Akis scraper] API success for ${recipeIdOrSlug}`);
            results.push(this.parseAkisRecipe(recipe, url));
            apiSuccess = true;
          }
        } catch (apiError: any) {
          if (apiError.response?.status === 404) {
            results.push({
              title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
              imageUrl: '', instructions: '', tags: '', ingredients: '',
              sourceUrl: url,
              error: 'Recipe not found on akispetretzikis.com',
            });
            continue;
          }
          console.log(`[Akis scraper] API failed (${apiError.response?.status || apiError.message}), using Puppeteer child process...`);
        }

        // If API didn't work, use Puppeteer in isolated child process
        if (!apiSuccess) {
          const workerResult = await runPuppeteerInChildProcess(url, 'akis');

          if (workerResult.success && workerResult.data) {
            // Parse based on the source (JSON-LD or __NEXT_DATA__)
            if (workerResult.source === 'JSON-LD') {
              const recipe = this.convertJsonLdToAkisFormat(workerResult.data);
              results.push(this.parseAkisRecipe(recipe, url));
            } else {
              // __NEXT_DATA__ format - already in Akis API format
              results.push(this.parseAkisRecipe(workerResult.data, url));
            }
          } else {
            console.log(`[Akis scraper] Worker failed for ${url}: ${workerResult.error}`);
            results.push({
              title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
              imageUrl: '', instructions: '', tags: '', ingredients: '',
              sourceUrl: url,
              error: workerResult.error || 'Failed to scrape with Puppeteer',
            });
          }

          // Kill any remaining Chrome processes after Puppeteer usage
          await killPuppeteerChromium();
        }
      } catch (error: any) {
        console.log(`[Akis scraper] Error scraping ${url}: ${error.message}`);
        results.push({
          title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
          imageUrl: '', instructions: '', tags: '', ingredients: '',
          sourceUrl: url,
          error: error.message || 'Failed to scrape recipe',
        });
      }

      // Delay between URLs
      if (i < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`[Akis scraper] Finished scraping ${urls.length} URLs`);
    return results;
  }
}

export const recipeScraperService = new RecipeScraperService();
