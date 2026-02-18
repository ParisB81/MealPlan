/**
 * Puppeteer Worker - Runs in a separate process to isolate browser automation
 * from the main Express server. This process can be killed without affecting
 * the main server.
 *
 * Usage: node puppeteerWorker.js <url> <site-type> <output-file>
 * - url: The recipe URL to scrape
 * - site-type: "akis" or "argiro"
 * - output-file: Path to write JSON result
 *
 * Writes JSON result to output file on completion.
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';

// Get arguments
const url = process.argv[2];
const siteType = process.argv[3] as 'akis' | 'argiro';
const outputFile = process.argv[4];

if (!url || !siteType || !outputFile) {
  // Can't write to output file if we don't have it, just exit
  process.exit(1);
}

function writeResult(result: any) {
  try {
    fs.writeFileSync(outputFile, JSON.stringify(result), 'utf-8');
  } catch (err) {
    // Can't write result, just exit
  }
}

/**
 * Greek unit abbreviations → English unit names
 */
const GREEK_UNIT_MAP: Record<string, string> = {
  'γρ.': 'g', 'γρ': 'g', 'γραμμάρια': 'g',
  'κιλό': 'kg', 'κιλά': 'kg', 'kg': 'kg', 'g': 'g', 'mg': 'mg',
  'ml': 'ml', 'λίτρο': 'l', 'λίτρα': 'l', 'lt': 'l', 'l': 'l',
  'κ.σ.': 'tbsp', 'κ.σ': 'tbsp', 'κουταλιά σούπας': 'tbsp', 'κουταλιές σούπας': 'tbsp',
  'κ.γ.': 'tsp', 'κ.γ': 'tsp', 'κουταλάκι γλυκού': 'tsp', 'κουταλάκια γλυκού': 'tsp',
  'φλ.': 'cup', 'φλ': 'cup', 'φλιτζάνι': 'cup', 'φλιτζάνια': 'cup', 'κούπα': 'cup', 'κούπες': 'cup',
  'σκ.': 'clove', 'σκελ.': 'clove', 'σκελ': 'clove', 'σκελίδα': 'clove', 'σκελίδες': 'clove',
  'τεμ.': 'piece', 'τεμ': 'piece', 'τεμάχιο': 'piece', 'τεμάχια': 'piece',
  'φέτα': 'slice', 'φέτες': 'slice', 'φύλλο': 'leaf', 'φύλλα': 'leaf',
  'κλων.': 'sprig', 'κλων': 'sprig', 'κλωνάρι': 'sprig', 'κλωνάρια': 'sprig',
  'ματσάκι': 'bunch', 'ματσάκια': 'bunch', 'φιλέτο': 'fillet', 'φιλέτα': 'fillet',
  'πρέζα': 'pinch', 'πρέζες': 'pinch', 'χούφτα': 'handful', 'χούφτες': 'handful',
  'πακέτο': 'pack', 'πακέτα': 'pack', 'κουτί': 'piece', 'κουτιά': 'piece',
  'βάζο': 'piece', 'βάζα': 'piece',
  'μεγάλο': 'large', 'μεγάλα': 'large', 'μεγάλη': 'large', 'μεγάλες': 'large',
  'μεσαίο': 'medium', 'μεσαία': 'medium', 'μεσαίες': 'medium',
  'μικρό': 'small', 'μικρά': 'small', 'μικρή': 'small', 'μικρές': 'small',
};

const UNIT_NORMALIZATION_MAP: Record<string, string> = {
  'gram': 'g', 'grams': 'g', 'gr': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg', 'kilos': 'kg',
  'milligram': 'mg', 'milligrams': 'mg',
  'ounce': 'oz', 'ounces': 'oz', 'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
  'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
  'cup': 'cup', 'cups': 'cup',
  'milliliter': 'ml', 'milliliters': 'ml', 'millilitre': 'ml', 'millilitres': 'ml',
  'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l', 'lt': 'l',
  'clove': 'clove', 'cloves': 'clove', 'piece': 'piece', 'pieces': 'piece',
  'slice': 'slice', 'slices': 'slice', 'sprig': 'sprig', 'sprigs': 'sprig',
  'bunch': 'bunch', 'bunches': 'bunch', 'pinch': 'pinch', 'pinches': 'pinch',
  'small': 'small', 'medium': 'medium', 'large': 'large',
};

function normalizeUnit(unit: string): string {
  if (!unit) return unit;
  let cleaned = unit.replace(/\(s\)$/i, '').trim().toLowerCase();
  const mapped = UNIT_NORMALIZATION_MAP[cleaned];
  if (mapped) return mapped;
  const withoutOf = cleaned.replace(/\s+of\s+.*$/i, '').trim();
  if (withoutOf !== cleaned) {
    const mappedWithoutOf = UNIT_NORMALIZATION_MAP[withoutOf];
    if (mappedWithoutOf) return mappedWithoutOf;
  }
  const firstWord = cleaned.split(/\s+/)[0];
  if (firstWord !== cleaned) {
    const mappedFirst = UNIT_NORMALIZATION_MAP[firstWord];
    if (mappedFirst) return mappedFirst;
  }
  return cleaned;
}

function convertFraction(value: string): string {
  if (value.includes('-')) value = value.split('-')[0].trim();
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
  const mixedMatch = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return (whole + num / den).toFixed(2).replace(/\.?0+$/, '');
  }
  return value;
}

async function scrapeAkis(browser: any, url: string): Promise<any> {
  const page = await browser.newPage();

  try {
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
      const parsed = JSON.parse(nextData);
      const recipe = parsed?.props?.pageProps?.ssRecipe?.data;
      if (recipe) {
        return { success: true, data: recipe, source: '__NEXT_DATA__' };
      }
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
      return { success: true, data: jsonLdData, source: 'JSON-LD' };
    }

    return { success: false, error: 'Could not extract recipe data from page' };
  } finally {
    await page.close();
  }
}

async function scrapeArgiro(browser: any, url: string): Promise<any> {
  const page = await browser.newPage();

  try {
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

    // Wait for recipe content
    try {
      await page.waitForSelector('.single_recipe__title, h1.single_recipe__title', { timeout: 10000 });
    } catch {}

    // Extract recipe data
    const recipeData = await page.evaluate(() => {
      const title = document.querySelector('h1.single_recipe__title')?.textContent?.trim() || '';
      const description = document.querySelector('h2.single_recipe__lead')?.textContent?.trim() ||
                          document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const imageEl = document.querySelector('figure.single_recipe__main_image img');
      const image = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') ||
                    document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      // Ingredients
      const ingredientSections: { section: string; items: { quantity: string; name: string }[] }[] = [];
      const ingredientsDivs = document.querySelectorAll('div.ingredients');
      const ingredientsDiv = ingredientsDivs[0];

      if (ingredientsDiv) {
        let currentSection = '';
        const children = ingredientsDiv.querySelectorAll('.ingredients__title, .ingredients__container');
        children.forEach(child => {
          if (child.classList.contains('ingredients__title')) {
            currentSection = child.textContent?.trim() || '';
          } else if (child.classList.contains('ingredients__container')) {
            const items: { quantity: string; name: string }[] = [];
            child.querySelectorAll('.ingredients__item').forEach(item => {
              const quantityEl = item.querySelector('.ingredients__quantity');
              const nameEl = item.querySelector('.ingredient-label p');
              const quantity = quantityEl?.textContent?.trim() || '';
              const name = nameEl?.textContent?.trim() || '';
              if (name) items.push({ quantity, name });
            });
            ingredientSections.push({ section: currentSection, items });
          }
        });
      }

      // Instructions
      const instructions: string[] = [];
      const methodSteps = document.querySelector('.single_recipe__method_steps ol');
      if (methodSteps) {
        methodSteps.querySelectorAll('li').forEach(li => {
          const text = li.textContent?.trim();
          if (text && text.length > 5) instructions.push(text);
        });
      }

      // Times and servings
      let prepTimeText = '';
      let cookTimeText = '';
      let servingsText = '';

      const prepTimeEl = document.querySelector('.preparation_time');
      const cookTimeEl = document.querySelector('.cooking_time');
      if (prepTimeEl) prepTimeText = prepTimeEl.textContent?.trim() || '';
      if (cookTimeEl) cookTimeText = cookTimeEl.textContent?.trim() || '';

      const singleRecipeItems = document.querySelectorAll('.single_recipe__item');
      singleRecipeItems.forEach(item => {
        if (item.classList.contains('last-row')) {
          const inner = item.querySelector('.single_recipe__item--inner');
          if (inner) {
            const innerText = inner.textContent?.trim() || '';
            const servingsMatch = innerText.match(/^([\d]+(?:\s*-\s*[\d]+)?)/);
            if (servingsMatch) servingsText = servingsMatch[1];
          }
        }
      });

      // Tags
      const tags: string[] = [];
      document.querySelectorAll('.article__tags li').forEach(li => {
        const text = li.textContent?.trim();
        if (text) tags.push(text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
      });

      return {
        title, description, image, ingredientSections, instructions,
        prepTimeText, cookTimeText, servingsText, tags: [...new Set(tags)],
      };
    });

    if (!recipeData.title) {
      return { success: false, error: 'Could not extract recipe data from page' };
    }

    return { success: true, data: recipeData, source: 'DOM' };
  } finally {
    await page.close();
  }
}

async function main() {
  let browser: any = null;

  try {
    // Set a hard timeout for the entire process
    const TIMEOUT_MS = 60000; // 60 seconds max
    setTimeout(() => {
      writeResult({ success: false, error: 'Process timeout after 60 seconds' });
      process.exit(1);
    }, TIMEOUT_MS);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    let result: any;

    if (siteType === 'akis') {
      result = await scrapeAkis(browser, url);
    } else if (siteType === 'argiro') {
      result = await scrapeArgiro(browser, url);
    } else {
      result = { success: false, error: `Unknown site type: ${siteType}` };
    }

    // Write result to output file
    writeResult(result);

    await browser.close();
    process.exit(0);
  } catch (error: any) {
    writeResult({ success: false, error: error.message || 'Unknown error' });

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    process.exit(1);
  }
}

main();
