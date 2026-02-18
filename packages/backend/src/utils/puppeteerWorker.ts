/**
 * Puppeteer Worker - Runs in a separate process to prevent blocking the main event loop.
 *
 * Usage: node puppeteerWorker.js <url> <type>
 * where type is 'akis' or 'argiro'
 *
 * Output: JSON stringified result to stdout
 */

import puppeteer from 'puppeteer';

interface ScrapedRecipe {
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

const GREEK_UNIT_MAP: Record<string, string> = {
  'γρ.': 'g', 'γρ': 'g', 'γραμμάρια': 'g', 'γραμμάριο': 'g',
  'κιλό': 'kg', 'κιλά': 'kg', 'kg': 'kg',
  'κ.σ.': 'tbsp', 'κουταλιά σούπας': 'tbsp', 'κουταλιές σούπας': 'tbsp',
  'κ.γ.': 'tsp', 'κουταλιά γλυκού': 'tsp', 'κουταλιές γλυκού': 'tsp',
  'φλ.': 'cup', 'φλιτζάνι': 'cup', 'φλιτζάνια': 'cup',
  'λίτρο': 'l', 'λίτρα': 'l', 'lt': 'l',
  'ml': 'ml', 'μλ': 'ml',
  'τεμ.': 'piece', 'τεμάχιο': 'piece', 'τεμάχια': 'piece',
  'σκελ.': 'clove', 'σκελίδα': 'clove', 'σκελίδες': 'clove',
  'κλων.': 'sprig', 'κλωνάρι': 'sprig', 'κλωνάρια': 'sprig',
  'ματσ.': 'bunch', 'ματσάκι': 'bunch', 'μάτσο': 'bunch',
  'φύλλο': 'leaf', 'φύλλα': 'leaf',
  'φέτα': 'slice', 'φέτες': 'slice',
  'πρέζα': 'pinch', 'πρέζες': 'pinch',
  'ποτ.': 'glass', 'ποτήρι': 'glass', 'ποτήρια': 'glass',
};

function parseGreekUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return GREEK_UNIT_MAP[normalized] || normalized;
}

async function scrapeAkis(url: string): Promise<ScrapedRecipe> {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Check for Cloudflare
    const pageTitle = await page.title();
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Extract __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextData) {
      try {
        const parsed = JSON.parse(nextData);
        const recipe = parsed?.props?.pageProps?.ssRecipe?.data;
        if (recipe) {
          return parseAkisRecipe(recipe, url);
        }
      } catch {}
    }

    // Fallback: JSON-LD
    const jsonLdData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Recipe') return data;
          if (Array.isArray(data)) {
            const recipe = data.find((d: any) => d['@type'] === 'Recipe');
            if (recipe) return recipe;
          }
        } catch {}
      }
      return null;
    });

    if (jsonLdData) {
      return parseJsonLdRecipe(jsonLdData, url);
    }

    return {
      title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
      imageUrl: '', instructions: '', tags: '', ingredients: '',
      sourceUrl: url,
      error: 'Could not extract recipe data from page',
    };
  } finally {
    if (browser) {
      try {
        const proc = browser.process();
        if (proc) proc.kill('SIGKILL');
      } catch {}
      await browser.close().catch(() => {});
    }
  }
}

async function scrapeArgiro(url: string): Promise<ScrapedRecipe> {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check for Cloudflare
    const pageTitle = await page.title();
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }

    // Extract recipe data
    const recipeData = await page.evaluate(() => {
      const title = document.querySelector('h1.single_recipe__title')?.textContent?.trim() || '';
      const description = document.querySelector('h2.single_recipe__lead')?.textContent?.trim() ||
                          document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const imageEl = document.querySelector('figure.single_recipe__main_image img');
      const image = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') ||
                    document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      // Ingredients
      const ingredients: string[] = [];
      const ingredientsDiv = document.querySelector('div.ingredients');
      if (ingredientsDiv) {
        const items = ingredientsDiv.querySelectorAll('.ingredient__quantity, .ingredient__title');
        let currentQty = '';
        items.forEach((item) => {
          if (item.classList.contains('ingredient__quantity')) {
            currentQty = item.textContent?.trim() || '';
          } else if (item.classList.contains('ingredient__title')) {
            const name = item.textContent?.trim() || '';
            if (name) {
              ingredients.push(currentQty ? `${currentQty} ${name}` : name);
            }
            currentQty = '';
          }
        });
      }

      // Instructions
      const instructions: string[] = [];
      const stepsDiv = document.querySelector('div.method');
      if (stepsDiv) {
        stepsDiv.querySelectorAll('p').forEach((p) => {
          const text = p.textContent?.trim();
          if (text) instructions.push(text);
        });
      }

      // Tags
      const tags: string[] = [];
      document.querySelectorAll('.single_recipe__tags a').forEach((tag) => {
        const t = tag.textContent?.trim();
        if (t) tags.push(t);
      });

      return { title, description, image, ingredients, instructions, tags };
    });

    if (!recipeData.title) {
      return {
        title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
        imageUrl: '', instructions: '', tags: '', ingredients: '',
        sourceUrl: url,
        error: 'Could not extract recipe data from Argiro page',
      };
    }

    return {
      title: recipeData.title,
      description: recipeData.description,
      servings: 4,
      prepTime: 0,
      cookTime: 0,
      imageUrl: recipeData.image,
      instructions: JSON.stringify(recipeData.instructions),
      tags: ['Argiro Barbarigou', 'Greek', ...recipeData.tags].join(', '),
      ingredients: recipeData.ingredients.join('\n'),
      sourceUrl: url,
    };
  } finally {
    if (browser) {
      try {
        const proc = browser.process();
        if (proc) proc.kill('SIGKILL');
      } catch {}
      await browser.close().catch(() => {});
    }
  }
}

function parseAkisRecipe(recipe: any, url: string): ScrapedRecipe {
  const title = recipe.title?.en || recipe.title?.el || recipe.title || '';
  const description = recipe.summary?.en || recipe.summary?.el || recipe.summary || '';

  // Parse ingredients
  const ingredientsList: string[] = [];
  const sections = recipe.ingredientSections || [];
  for (const section of sections) {
    const items = section.ingredients || [];
    for (const ing of items) {
      const qty = ing.quantity || '';
      const unit = parseGreekUnit(ing.unit?.title?.en || ing.unit?.title?.el || ing.unit || '');
      const name = ing.title?.en || ing.title?.el || ing.title || '';
      if (name) {
        ingredientsList.push(`${qty} ${unit} ${name}`.trim());
      }
    }
  }

  // Parse instructions
  const instructionsList: string[] = [];
  const methodSections = recipe.methodSections || [];
  for (const section of methodSections) {
    const steps = section.steps || [];
    for (const step of steps) {
      const text = step.description?.en || step.description?.el || step.description || '';
      if (text) instructionsList.push(text.replace(/<[^>]*>/g, '').trim());
    }
  }

  return {
    title,
    description,
    servings: recipe.portions || 4,
    prepTime: recipe.preparationTime || 0,
    cookTime: recipe.executionTime || 0,
    imageUrl: recipe.image?.url || '',
    instructions: JSON.stringify(instructionsList),
    tags: ['Akis Petretzikis', 'Greek'].join(', '),
    ingredients: ingredientsList.join('\n'),
    sourceUrl: url,
    calories: recipe.nutritionalValue?.calories,
    protein: recipe.nutritionalValue?.protein,
    carbs: recipe.nutritionalValue?.carbohydrates,
    fat: recipe.nutritionalValue?.fat,
    sodium: recipe.nutritionalValue?.sodium ? recipe.nutritionalValue.sodium * 1000 : undefined,
  };
}

function parseJsonLdRecipe(jsonLd: any, url: string): ScrapedRecipe {
  const instructions = Array.isArray(jsonLd.recipeInstructions)
    ? jsonLd.recipeInstructions.map((i: any) => typeof i === 'string' ? i : i.text || '').filter(Boolean)
    : [];

  const ingredients = Array.isArray(jsonLd.recipeIngredient)
    ? jsonLd.recipeIngredient
    : [];

  return {
    title: jsonLd.name || '',
    description: jsonLd.description || '',
    servings: parseInt(jsonLd.recipeYield) || 4,
    prepTime: 0,
    cookTime: 0,
    imageUrl: Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image || '',
    instructions: JSON.stringify(instructions),
    tags: 'Akis Petretzikis, Greek',
    ingredients: ingredients.join('\n'),
    sourceUrl: url,
  };
}

// Main execution
async function main() {
  const url = process.argv[2];
  const type = process.argv[3]; // 'akis' or 'argiro'

  if (!url || !type) {
    console.error(JSON.stringify({ error: 'Missing url or type argument' }));
    process.exit(1);
  }

  try {
    let result: ScrapedRecipe;

    if (type === 'akis') {
      result = await scrapeAkis(url);
    } else if (type === 'argiro') {
      result = await scrapeArgiro(url);
    } else {
      result = {
        title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
        imageUrl: '', instructions: '', tags: '', ingredients: '',
        sourceUrl: url,
        error: `Unknown scraper type: ${type}`
      };
    }

    console.log(JSON.stringify(result));
  } catch (error: any) {
    console.log(JSON.stringify({
      title: '', description: '', servings: 4, prepTime: 0, cookTime: 0,
      imageUrl: '', instructions: '', tags: '', ingredients: '',
      sourceUrl: url,
      error: error.message || 'Unknown error',
    }));
  }

  process.exit(0);
}

main();
