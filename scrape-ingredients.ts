import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// ============================================================
// Configuration
// ============================================================
const FOODB_BASE_URL = 'https://foodb.ca/foods';
const FOODB_PAGES = 32; // 778 foods across 32 pages (25 per page)
const USDA_API_KEY = 'DEMO_KEY'; // USDA FoodData Central DEMO key (rate limited: 30 req/hour)
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// USDA nutrient IDs we care about
const NUTRIENT_IDS = {
  calories: 1008,  // Energy (kcal)
  protein: 1003,   // Protein (g)
  carbs: 1005,     // Carbohydrate, by difference (g)
  fat: 1004,       // Total lipid/fat (g)
  fiber: 1079,     // Fiber, total dietary (g)
  sugar: 2000,     // Total Sugars (g)
  sodium: 1093,    // Sodium, Na (mg)
};

// ============================================================
// Types
// ============================================================
interface ScrapedFood {
  name: string;
  group: string;
  subGroup: string;
}

interface Ingredient {
  Name: string;
  Category: string;
  Tags: string;
  Source: string;
  Calories_kcal: number | string;
  Protein_g: number | string;
  Carbs_g: number | string;
  Fat_g: number | string;
  Fiber_g: number | string;
  Sugar_g: number | string;
  Sodium_mg: number | string;
}

interface NutritionData {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

// ============================================================
// HTTP helper (no external deps needed)
// ============================================================
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'MealPlan-Scraper/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function fetchJson(url: string): Promise<any> {
  return fetchUrl(url).then(data => JSON.parse(data));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// FooDB Scraper — extracts food name, group, subgroup from HTML
// ============================================================
function parseFooDBPage(html: string): ScrapedFood[] {
  const foods: ScrapedFood[] = [];

  // FooDB food list uses table rows. Each food entry has a link like /foods/FOOD00001
  // Pattern: <a href="/foods/FOOD...">Food Name</a> in table cells
  // The table has columns: Name, Food Group, Food Subgroup

  // Match table rows containing food links
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    // Check if this row has a food link
    const linkMatch = row.match(/<a\s+href="\/foods\/FOOD\d+"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const name = linkMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!name) continue;

    // Extract all <td> content
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    // Usually: [Name, Food Group, Food Subgroup, ...]
    const group = tds.length > 1 ? tds[1] : '';
    const subGroup = tds.length > 2 ? tds[2] : '';

    foods.push({ name, group, subGroup });
  }

  return foods;
}

async function scrapeAllFooDB(): Promise<ScrapedFood[]> {
  const allFoods: ScrapedFood[] = [];

  for (let page = 1; page <= FOODB_PAGES; page++) {
    const url = `${FOODB_BASE_URL}?page=${page}`;
    console.log(`  Fetching FooDB page ${page}/${FOODB_PAGES}...`);

    try {
      const html = await fetchUrl(url);
      const foods = parseFooDBPage(html);
      console.log(`    Found ${foods.length} foods on page ${page}`);
      allFoods.push(...foods);
    } catch (err: any) {
      console.error(`    Error on page ${page}: ${err.message}`);
    }

    // Be polite: 500ms delay between requests
    if (page < FOODB_PAGES) await sleep(500);
  }

  console.log(`  Total FooDB foods scraped: ${allFoods.length}`);
  return allFoods;
}

// ============================================================
// FooDB Group → Category mapping
// ============================================================
function mapFooDBCategory(group: string, subGroup: string): string {
  const g = group.toLowerCase();
  const sg = subGroup.toLowerCase();

  if (g.includes('herbs') || g.includes('spices')) {
    if (sg.includes('spice')) return 'spices';
    if (sg.includes('herb')) return 'herbs';
    if (sg.includes('oilseed') || sg.includes('oil')) return 'pantry';
    if (sg.includes('seed')) return 'nuts';
    if (sg.includes('mixture') || sg.includes('blend')) return 'spices';
    return 'herbs';
  }
  if (g.includes('vegetable')) {
    if (sg.includes('mushroom')) return 'produce';
    if (sg.includes('tuber') || sg.includes('starchy')) return 'produce';
    return 'produce';
  }
  if (g.includes('fruit')) return 'produce';
  if (g.includes('nut')) return 'nuts';
  if (g.includes('cereal')) {
    if (sg.includes('bread') || sg.includes('flat') || sg.includes('sweet')) return 'pantry';
    if (sg.includes('product')) return 'grains';
    return 'grains';
  }
  if (g.includes('pulse') || g.includes('legume')) return 'pulses';
  if (g.includes('aquatic') || g.includes('fish')) return 'seafood';
  if (g.includes('animal')) return 'meat';
  if (g.includes('milk') || g.includes('dairy')) return 'dairy';
  if (g.includes('egg')) return 'dairy';
  if (g.includes('gourd')) return 'produce';
  if (g.includes('soy')) return 'pantry';
  if (g.includes('cocoa') || g.includes('chocolate')) return 'pantry';
  if (g.includes('coffee') || g.includes('tea')) return 'beverages';
  if (g.includes('beverage')) return 'beverages';
  if (g.includes('baking') || g.includes('confection')) return 'pantry';
  if (g.includes('fat') || g.includes('oil')) return 'pantry';

  return 'other';
}

// ============================================================
// Generate tags from FooDB group/subgroup
// ============================================================
function generateTags(name: string, group: string, subGroup: string): string {
  const tags: string[] = [];
  const g = group.toLowerCase();
  const sg = subGroup.toLowerCase();
  const n = name.toLowerCase();

  // Base type tags
  if (g.includes('herb')) tags.push('herb');
  if (g.includes('spice') || sg.includes('spice')) tags.push('spice');
  if (g.includes('vegetable')) tags.push('vegetable');
  if (g.includes('fruit')) tags.push('fruit');
  if (g.includes('nut')) tags.push('nut');
  if (g.includes('cereal')) tags.push('cereal');
  if (g.includes('pulse') || g.includes('legume')) tags.push('legume');
  if (g.includes('aquatic')) tags.push('seafood');
  if (g.includes('animal')) tags.push('meat');
  if (g.includes('milk') || g.includes('dairy')) tags.push('dairy');
  if (g.includes('egg')) tags.push('protein');
  if (g.includes('gourd')) tags.push('vegetable');
  if (g.includes('soy')) tags.push('soy');
  if (g.includes('cocoa')) tags.push('chocolate');
  if (g.includes('beverage') || g.includes('coffee') || g.includes('tea')) tags.push('beverage');
  if (g.includes('baking')) tags.push('baking');
  if (g.includes('fat') || g.includes('oil')) tags.push('fat');
  if (g.includes('confection')) tags.push('sweet');

  // Subgroup-specific tags
  if (sg.includes('berry') || sg.includes('berries')) tags.push('berry');
  if (sg.includes('citrus')) tags.push('citrus');
  if (sg.includes('tropical')) tags.push('tropical');
  if (sg.includes('drupe') || sg.includes('stone')) tags.push('stone fruit');
  if (sg.includes('pome')) tags.push('pome');
  if (sg.includes('root')) tags.push('root');
  if (sg.includes('leaf') || sg.includes('leafy')) tags.push('leafy');
  if (sg.includes('shoot')) tags.push('shoot');
  if (sg.includes('stalk')) tags.push('stalk');
  if (sg.includes('tuber')) tags.push('tuber');
  if (sg.includes('cabbage')) tags.push('cruciferous');
  if (sg.includes('onion') || sg.includes('allium')) tags.push('allium');
  if (sg.includes('mushroom')) tags.push('mushroom');
  if (sg.includes('seaweed')) tags.push('seaweed');
  if (sg.includes('fish')) tags.push('fish');
  if (sg.includes('mollusk')) tags.push('shellfish');
  if (sg.includes('crustacean')) tags.push('shellfish');
  if (sg.includes('poultry')) tags.push('poultry');
  if (sg.includes('bovine')) tags.push('beef');
  if (sg.includes('swine')) tags.push('pork');
  if (sg.includes('ovis')) tags.push('lamb');
  if (sg.includes('venison')) tags.push('game');
  if (sg.includes('lagomorph')) tags.push('game');
  if (sg.includes('bean')) tags.push('bean');
  if (sg.includes('pea')) tags.push('pea');
  if (sg.includes('lentil')) tags.push('lentil');
  if (sg.includes('nut')) tags.push('protein');
  if (sg.includes('seed')) tags.push('seed');
  if (sg.includes('fermented')) tags.push('fermented');
  if (sg.includes('oil')) tags.push('oil');
  if (sg.includes('bread')) tags.push('bread');

  // Fresh/dried/preserved inference
  if (sg.includes('fresh') || g.includes('fruit') || g.includes('vegetable')) {
    if (!n.includes('dried') && !n.includes('canned') && !n.includes('powder')) {
      tags.push('fresh');
    }
  }

  // Deduplicate and join
  return [...new Set(tags)].join(',');
}

// ============================================================
// USDA Nutrition lookup (with caching and rate limiting)
// ============================================================
const nutritionCache = new Map<string, NutritionData>();
let usdaRequestCount = 0;

async function lookupNutrition(foodName: string): Promise<NutritionData> {
  const cacheKey = foodName.toLowerCase().trim();
  if (nutritionCache.has(cacheKey)) return nutritionCache.get(cacheKey)!;

  const empty: NutritionData = {
    calories: null, protein: null, carbs: null,
    fat: null, fiber: null, sugar: null, sodium: null,
  };

  // Append "raw" to search for unprocessed version
  const searchTerms = [
    `${foodName} raw`,
    foodName,
  ];

  for (const query of searchTerms) {
    try {
      usdaRequestCount++;
      const encodedQuery = encodeURIComponent(query);
      const url = `${USDA_API_BASE}?api_key=${USDA_API_KEY}&query=${encodedQuery}&dataType=SR%20Legacy&pageSize=3`;

      const data = await fetchJson(url);

      if (data.foods && data.foods.length > 0) {
        // Find the best match (prefer "raw" entries)
        let bestFood = data.foods[0];
        for (const food of data.foods) {
          const desc = (food.description || '').toLowerCase();
          if (desc.includes('raw') && !desc.includes('juice') && !desc.includes('drink')) {
            bestFood = food;
            break;
          }
        }

        const nutrients = bestFood.foodNutrients || [];
        const result: NutritionData = { ...empty };

        for (const n of nutrients) {
          const id = n.nutrientId;
          const val = n.value;
          if (id === NUTRIENT_IDS.calories) result.calories = val;
          else if (id === NUTRIENT_IDS.protein) result.protein = val;
          else if (id === NUTRIENT_IDS.carbs) result.carbs = val;
          else if (id === NUTRIENT_IDS.fat) result.fat = val;
          else if (id === NUTRIENT_IDS.fiber) result.fiber = val;
          else if (id === NUTRIENT_IDS.sugar) result.sugar = val;
          else if (id === NUTRIENT_IDS.sodium) result.sodium = val;
        }

        nutritionCache.set(cacheKey, result);
        return result;
      }
    } catch (err: any) {
      // Rate limited or error — skip
      if (err.message?.includes('429') || err.message?.includes('OVER_RATE_LIMIT')) {
        console.log(`    USDA rate limit hit after ${usdaRequestCount} requests. Waiting 60s...`);
        await sleep(60000);
      }
    }

    // Small delay between USDA requests
    await sleep(200);
  }

  nutritionCache.set(cacheKey, empty);
  return empty;
}

// ============================================================
// Previously hardcoded nutrition data (for items we already have)
// This avoids burning USDA API calls for known items
// ============================================================
function getKnownNutrition(): Map<string, NutritionData> {
  const known = new Map<string, NutritionData>();

  // Helper to add known nutrition
  const add = (name: string, cal: number, pro: number, carb: number, fat: number, fib: number, sug: number, sod: number) => {
    known.set(name.toLowerCase(), { calories: cal, protein: pro, carbs: carb, fat, fiber: fib, sugar: sug, sodium: sod });
  };

  // Common produce
  add('kiwi', 61, 1.1, 14.7, 0.5, 3, 9, 3);
  add('garden onion', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4);
  add('leek', 61, 1.5, 14.2, 0.3, 1.8, 3.9, 20);
  add('garlic', 149, 6.4, 33.1, 0.5, 2.1, 1, 17);
  add('chives', 30, 3.3, 1.8, 0.7, 2.5, 1.9, 3);
  add('cashew nut', 553, 18.2, 30.2, 43.8, 3.3, 5.9, 12);
  add('pineapple', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1);
  add('dill', 43, 3.5, 7, 1.1, 2.1, 0, 61);
  add('peanut', 567, 25.8, 16.1, 49.2, 8.5, 4, 18);
  add('horseradish', 48, 1.2, 11.3, 0.7, 3.3, 7.99, 314);
  add('asparagus', 20, 2.2, 3.9, 0.1, 2.1, 1.9, 2);
  add('oat', 389, 16.9, 66.3, 6.9, 10.6, 0, 2);
  add('brazil nut', 656, 14.3, 12.3, 66.4, 7.5, 2.3, 3);
  add('common beet', 43, 1.6, 9.6, 0.2, 2.8, 6.8, 78);
  add('savoy cabbage', 27, 2, 6.1, 0.1, 3.1, 2.3, 28);
  add('borage', 21, 1.8, 3.1, 0.7, 0, 0, 80);
  add('chinese mustard', 13, 1.5, 2.2, 0.2, 1.8, 1.3, 15);
  add('swede', 36, 1.1, 8.6, 0.2, 2.3, 4.5, 12);
  add('common cabbage', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18);
  add('cauliflower', 25, 1.9, 5, 0.3, 2, 1.9, 30);
  add('brussel sprouts', 43, 3.4, 8.9, 0.3, 3.8, 2.2, 25);
  add('kohlrabi', 27, 1.7, 6.2, 0.1, 3.6, 2.6, 20);
  add('broccoli', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33);
  add('chinese cabbage', 13, 1.5, 2.2, 0.2, 1, 1.2, 9);
  add('turnip', 28, 0.9, 6.4, 0.1, 1.8, 3.8, 67);
  add('pigeon pea', 343, 21.7, 62.8, 1.5, 15, 0, 17);
  add('capers', 23, 2.4, 4.9, 0.9, 3.2, 0.4, 2964);
  add('pepper', 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3);
  add('papaya', 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8);
  add('caraway', 333, 19.8, 49.9, 14.6, 38.3, 0.6, 17);
  add('pecan nut', 691, 9.2, 13.9, 72, 9.6, 4, 0);
  add('chestnut', 213, 2.4, 45.5, 2.3, 8.1, 0, 3);
  add('chickpea', 364, 19.3, 60.6, 6, 17.4, 10.7, 24);
  add('endive', 17, 1.3, 3.4, 0.2, 3.1, 0.3, 22);
  add('chicory', 23, 1.7, 4.7, 0.3, 4, 0.7, 45);
  add('ceylon cinnamon', 247, 4, 80.6, 1.2, 53.1, 2.2, 10);
  add('watermelon', 30, 0.6, 7.5, 0.2, 0.4, 6.2, 1);
  add('lime', 30, 0.7, 10.5, 0.2, 2.8, 1.7, 2);
  add('lemon', 29, 1.1, 9.3, 0.3, 2.8, 2.5, 2);
  add('pummelo', 38, 0.8, 9.6, 0.04, 1, 0, 1);
  add('mandarin orange', 53, 0.8, 13.3, 0.3, 1.8, 10.6, 2);
  add('sweet orange', 47, 0.9, 11.7, 0.1, 2.4, 9.4, 0);
  add('coriander', 23, 2.1, 3.7, 0.5, 2.8, 0.9, 46);
  add('common hazelnut', 628, 15, 16.7, 60.7, 9.7, 4.3, 0);
  add('saffron', 310, 11.4, 65.4, 5.8, 3.9, 0, 148);
  add('muskmelon', 34, 0.8, 8.2, 0.2, 0.9, 7.9, 16);
  add('cucumber', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2);
  add('cumin', 375, 17.8, 44.2, 22.3, 10.5, 2.3, 168);
  add('turmeric', 354, 7.8, 64.9, 9.9, 21.1, 3.2, 38);
  add('quince', 57, 0.4, 15.3, 0.1, 1.9, 0, 4);
  add('lemon grass', 99, 1.8, 25.3, 0.5, 0, 0, 6);
  add('globe artichoke', 47, 3.3, 10.5, 0.1, 5.4, 1, 94);
  add('japanese persimmon', 70, 0.6, 18.6, 0.2, 3.6, 12.5, 1);
  add('cardamom', 311, 10.8, 68.5, 6.7, 28, 0, 18);
  add('loquat', 47, 0.4, 12.1, 0.2, 1.7, 0, 1);
  add('rocket salad', 25, 2.6, 3.7, 0.7, 1.6, 2, 27);
  add('common buckwheat', 343, 13.2, 71.5, 3.4, 10, 0, 1);
  add('fig', 74, 0.7, 19.2, 0.3, 2.9, 16.3, 1);
  add('fennel', 31, 1.2, 7.3, 0.2, 3.1, 0, 52);
  add('strawberry', 32, 0.7, 7.7, 0.3, 2, 4.9, 1);
  add('soy bean', 446, 36.5, 30.2, 19.9, 9.3, 7.3, 2);
  add('sunflower', 584, 20.8, 20, 51.5, 8.6, 2.6, 9);
  add('barley', 354, 12.5, 73.5, 2.3, 17.3, 0.8, 12);
  add('star anise', 337, 17.6, 50.02, 15.9, 14.6, 0, 16);
  add('swamp cabbage', 19, 2.6, 3.1, 0.2, 2, 0, 113);
  add('sweet potato', 86, 1.6, 20.1, 0.1, 3, 4.2, 55);
  add('black walnut', 619, 24.1, 9.9, 59, 6.8, 1.1, 2);
  add('common walnut', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2);
  add('lettuce', 15, 1.4, 2.9, 0.2, 1.3, 0.8, 28);
  add('sweet bay', 313, 7.6, 74.97, 8.4, 26.3, 0, 23);
  add('lentils', 352, 25.8, 60.1, 1.1, 30.5, 2, 6);
  add('flaxseed', 534, 18.3, 28.9, 42.2, 27.3, 1.6, 30);
  add('lichee', 66, 0.8, 16.5, 0.4, 1.3, 15.2, 1);
  add('lupine', 371, 36.2, 40.4, 9.7, 18.9, 0, 15);
  add('apple', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1);
  add('mango', 60, 0.8, 15, 0.4, 1.6, 13.7, 1);
  add('spearmint', 44, 3.3, 8.4, 0.7, 6.8, 0, 31);
  add('peppermint', 70, 3.8, 14.9, 0.9, 8, 0, 31);
  add('bitter gourd', 17, 1, 3.7, 0.2, 2.8, 0, 5);
  add('mulberry', 43, 1.4, 9.8, 0.4, 1.7, 8.1, 10);
  add('nutmeg', 525, 5.8, 49.3, 36.3, 20.8, 0, 16);
  add('sweet basil', 23, 3.1, 2.6, 0.6, 1.6, 0.3, 4);
  add('olive', 115, 0.8, 6.3, 10.7, 3.2, 0, 1556);
  add('sweet marjoram', 271, 12.7, 60.6, 7, 40.3, 4.2, 77);
  add('common oregano', 265, 9, 68.9, 4.3, 42.5, 4.1, 25);
  add('rice', 130, 2.7, 28.2, 0.3, 0.4, 0, 1);
  add('millet', 378, 11, 72.8, 4.2, 8.5, 0, 5);
  add('poppy', 525, 18, 28.1, 41.6, 19.5, 3, 26);
  add('passion fruit', 97, 2.2, 23.4, 0.7, 10.4, 11.2, 28);
  add('parsnip', 75, 1.2, 18, 0.3, 4.9, 4.8, 10);
  add('avocado', 160, 2, 8.5, 14.7, 6.7, 0.7, 7);
  add('parsley', 36, 3, 6.3, 0.8, 3.3, 0.8, 56);
  add('lima bean', 338, 21.5, 63.4, 0.7, 19, 5.7, 18);
  add('common bean', 333, 23.6, 60, 0.8, 24.9, 2.1, 5);
  add('date', 277, 1.8, 75, 0.2, 6.7, 66.5, 1);
  add('anise', 337, 17.6, 50, 15.9, 14.6, 0, 16);
  add('pine nut', 673, 13.7, 13.1, 68.4, 3.7, 3.6, 2);
  add('pistachio', 560, 20.2, 27.2, 45.3, 10.6, 7.7, 1);
  add('common pea', 81, 5.4, 14.4, 0.4, 5.7, 5.7, 5);
  add('purslane', 20, 2, 3.4, 0.4, 0, 0, 45);
  add('apricot', 48, 1.4, 11.1, 0.4, 2, 9.2, 1);
  add('sweet cherry', 63, 1.1, 16, 0.2, 2.1, 12.8, 0);
  add('sour cherry', 50, 1, 12.2, 0.3, 1.6, 8.5, 3);
  add('european plum', 46, 0.7, 11.4, 0.3, 1.4, 9.9, 0);
  add('almond', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1);
  add('peach', 39, 0.9, 9.5, 0.2, 1.5, 8.4, 0);
  add('guava', 68, 2.6, 14.3, 1, 5.4, 8.9, 2);
  add('pomegranate', 83, 1.7, 18.7, 1.2, 4, 13.7, 3);
  add('pear', 57, 0.4, 15.2, 0.1, 3.1, 9.8, 1);
  add('radish', 16, 0.7, 3.4, 0.1, 1.6, 1.9, 39);
  add('garden rhubarb', 21, 0.9, 4.5, 0.2, 1.8, 1.1, 4);
  add('blackcurrant', 63, 1.4, 15.4, 0.4, 0, 0, 2);
  add('redcurrant', 56, 1.4, 13.8, 0.2, 4.3, 7.4, 1);
  add('gooseberry', 44, 0.9, 10.2, 0.6, 4.3, 0, 1);
  add('watercress', 11, 2.3, 1.3, 0.1, 0.5, 0.2, 41);
  add('rosemary', 131, 3.3, 20.7, 5.9, 14.1, 0, 26);
  add('cloudberry', 51, 2.4, 8.6, 0.8, 0, 0, 1);
  add('red raspberry', 52, 1.2, 11.9, 0.6, 6.5, 4.4, 1);
  add('sorrel', 22, 2, 3.2, 0.7, 2.9, 0, 4);
  add('common sage', 315, 10.6, 60.7, 12.7, 40.3, 1.7, 11);
  add('black elderberry', 73, 0.7, 18.4, 0.5, 7, 0, 6);
  add('summer savory', 272, 6.7, 68.7, 5.9, 45.7, 0, 24);
  add('rye', 338, 10.3, 75.9, 1.6, 15.1, 1, 2);
  add('sesame', 573, 17.7, 23.4, 49.7, 11.8, 0.3, 11);
  add('garden tomato', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5);
  add('cherry tomato', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5);
  add('eggplant', 25, 1, 5.9, 0.2, 3, 3.5, 2);
  add('potato', 77, 2, 17, 0.1, 2.2, 0.8, 6);
  add('spinach', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79);
  add('cloves', 274, 6, 65.5, 13, 33.9, 2.4, 277);
  add('tamarind', 239, 2.8, 62.5, 0.6, 5.1, 0, 28);
  add('dandelion', 45, 2.7, 9.2, 0.7, 3.5, 0.7, 76);
  add('common thyme', 276, 9.1, 63.9, 7.4, 37, 0, 55);
  add('fenugreek', 323, 23, 58.4, 6.4, 24.6, 0, 67);
  add('common wheat', 339, 13.7, 72, 2.5, 10.7, 0, 2);
  add('lowbush blueberry', 57, 0.7, 14.5, 0.3, 2.4, 10, 1);
  add('highbush blueberry', 57, 0.7, 14.5, 0.3, 2.4, 10, 1);
  add('american cranberry', 46, 0.4, 12.2, 0.1, 4.6, 4, 2);
  add('vanilla', 288, 0.1, 12.65, 0.1, 0, 12.65, 9);
  add('broad bean', 341, 26.1, 58.3, 1.5, 25, 5.7, 13);
  add('adzuki bean', 329, 19.9, 62.9, 0.5, 12.7, 0, 5);
  add('mung bean', 347, 23.9, 62.6, 1.2, 16.3, 6.6, 15);
  add('cowpea', 336, 23.5, 60, 1.3, 10.6, 0, 16);
  add('common grape', 69, 0.7, 18.1, 0.2, 0.9, 15.5, 2);
  add('corn', 86, 3.3, 19, 1.3, 2.7, 6.3, 15);
  add('ginger', 80, 1.8, 17.8, 0.8, 2, 1.7, 13);
  add('banana', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1);
  add('celeriac', 42, 1.5, 9.2, 0.3, 1.8, 1.6, 100);
  add('celery', 14, 0.7, 3, 0.2, 1.6, 1.3, 80);
  add('nectarine', 44, 1.1, 10.6, 0.3, 1.7, 7.9, 0);
  add('longan', 60, 1.3, 15.1, 0.1, 1.1, 0, 0);
  add('macadamia nut', 718, 7.9, 13.8, 75.8, 8.6, 4.6, 5);
  add('swiss chard', 19, 1.8, 3.7, 0.2, 1.6, 1.1, 213);
  add('shallot', 72, 2.5, 16.8, 0.1, 3.2, 7.9, 12);
  add('carrot', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69);
  add('grapefruit', 42, 0.8, 10.7, 0.1, 1.6, 6.9, 0);
  add('kale', 49, 4.3, 8.7, 0.9, 3.6, 2.3, 38);
  add('daikon radish', 18, 0.6, 4.1, 0.1, 1.6, 2.5, 21);
  add('red beetroot', 43, 1.6, 9.6, 0.2, 2.8, 6.8, 78);
  add('abalone', 105, 17.1, 6.01, 0.8, 0, 0, 301);
  add('acerola', 32, 0.4, 7.7, 0.3, 1.1, 0, 7);
  add('winter squash', 34, 0.8, 8.6, 0.1, 1.5, 0, 4);
  add('agar', 26, 0.5, 6.75, 0.03, 0.5, 0, 9);
  add('red king crab', 97, 19.4, 0, 1.5, 0, 0, 836);
  add('alfalfa', 23, 4, 2.1, 0.7, 1.9, 0, 6);
  add('allspice', 263, 6.1, 72.1, 8.7, 21.6, 0, 77);
  add('amaranth', 371, 13.6, 65.2, 7, 6.7, 1.7, 4);
  add('bamboo shoots', 27, 2.6, 5.2, 0.3, 2.2, 3, 4);
  add('bison', 143, 28.4, 0, 2.4, 0, 0, 57);
  add('blue crab', 87, 18.1, 0, 1.1, 0, 0, 293);
  add('blue mussel', 86, 11.9, 3.7, 2.2, 0, 0, 286);
  add('bluefin tuna', 144, 23.3, 0, 4.9, 0, 0, 39);
  add('wild boar', 122, 21.5, 0, 3.3, 0, 0, 0);
  add('breadfruit', 103, 1.1, 27.1, 0.2, 4.9, 11, 2);
  add('rapini', 22, 3.2, 2.8, 0.5, 2.7, 0.4, 33);
  add('butternut squash', 45, 1, 11.7, 0.1, 2, 2.2, 4);
  add('cardoon', 17, 0.7, 4.1, 0.1, 1.6, 0, 170);
  add('cassava', 160, 1.4, 38.1, 0.3, 1.8, 1.7, 14);
  add('chayote', 19, 0.8, 4.5, 0.1, 1.7, 1.7, 2);
  add('cherimoya', 75, 1.6, 17.7, 0.7, 3, 12.9, 7);
  add('chervil', 237, 23.2, 49.1, 3.9, 11.3, 0, 83);
  add('chia', 486, 16.5, 42.1, 30.7, 34.4, 0, 16);
  add('chicken', 239, 27.3, 0, 13.6, 0, 0, 82);
  add('coconut', 354, 3.3, 15.2, 33.5, 9, 6.2, 20);
  add('pacific cod', 82, 17.9, 0, 0.6, 0, 0, 77);
  add('atlantic cod', 82, 17.8, 0, 0.7, 0, 0, 54);
  add('common octopus', 82, 14.9, 2.2, 1, 0, 0, 230);
  add('cuttlefish', 79, 16.2, 0.8, 0.7, 0, 0, 372);
  add('durian', 147, 1.5, 27.1, 5.3, 3.8, 0, 2);
  add('eastern oyster', 68, 7.1, 3.9, 2.5, 0, 0, 417);
  add('freshwater eel', 184, 18.4, 0, 11.7, 0, 0, 51);
  add('elderberry', 73, 0.7, 18.4, 0.5, 7, 0, 6);
  add('elk', 111, 22.8, 0, 1.4, 0, 0, 52);
  add('emu', 103, 22.5, 0, 0.8, 0, 0, 57);
  add('european anchovy', 131, 20.4, 0, 4.8, 0, 0, 104);
  add('grouper', 92, 19.4, 0, 1, 0, 0, 53);
  add('haddock', 74, 16.3, 0, 0.4, 0, 0, 213);
  add('halibut', 91, 18.6, 0, 1.3, 0, 0, 46);
  add('hazelnut', 628, 15, 16.7, 60.7, 9.7, 4.3, 0);
  add('jackfruit', 95, 1.7, 23.3, 0.6, 1.5, 19.1, 2);
  add('jerusalem artichoke', 73, 2, 17.4, 0.01, 1.6, 9.6, 4);
  add('jujube', 79, 1.2, 20.2, 0.2, 0, 0, 3);
  add('kelp', 43, 1.7, 9.6, 0.6, 1.3, 0.6, 233);
  add('kumquat', 71, 1.9, 15.9, 0.9, 6.5, 9.4, 10);
  add('american lobster', 77, 16.5, 0.5, 0.7, 0, 0, 296);
  add('loganberry', 55, 1.5, 13.2, 0.3, 5.3, 7.7, 1);
  add('malabar spinach', 19, 1.8, 3.4, 0.3, 0, 0, 24);
  add('purple mangosteen', 73, 0.4, 18, 0.6, 1.8, 0, 7);
  add('monkfish', 76, 14.5, 0, 1.5, 0, 0, 18);
  add('mountain yam', 118, 1.5, 28.1, 0.2, 0, 0, 9);
  add('nopal', 16, 1.3, 3.3, 0.1, 2.2, 1.1, 21);
  add('okra', 33, 1.9, 7, 0.2, 3.2, 1.5, 7);
  add('ostrich', 116, 21.8, 0, 2.6, 0, 0, 72);
  add('pheasant', 133, 24.4, 0, 3.6, 0, 0, 37);
  add('quinoa', 368, 14.1, 64.2, 6.1, 7, 0, 5);
  add('rabbit', 136, 20.1, 0, 5.6, 0, 0, 41);
  add('rainbow trout', 141, 20.5, 0, 6.2, 0, 0, 31);
  add('rose hip', 162, 1.6, 38.2, 0.3, 24.1, 2.6, 4);
  add('pink salmon', 127, 20.5, 0, 4.4, 0, 0, 67);
  add('coho salmon', 146, 21.6, 0, 5.9, 0, 0, 46);
  add('sockeye salmon', 168, 21.3, 0, 8.6, 0, 0, 47);
  add('chinook salmon', 179, 19.9, 0, 10.4, 0, 0, 50);
  add('atlantic salmon', 208, 20.4, 0, 13.4, 0, 0, 59);
  add('sapodilla', 83, 0.4, 20, 1.1, 5.3, 0, 12);
  add('scallop', 69, 12.1, 3.2, 0.5, 0, 0, 392);
  add('sheep', 294, 24.5, 0, 20.9, 0, 0, 66);
  add('soursop', 66, 1, 16.8, 0.3, 3.3, 13.5, 14);
  add('spelt', 338, 14.6, 70.2, 2.4, 10.7, 6.8, 8);
  add('spirulina', 290, 57.5, 23.9, 7.7, 3.6, 3.1, 1048);
  add('taro', 112, 1.5, 26.5, 0.2, 4.1, 0.5, 11);
  add('teff', 367, 13.3, 73.1, 2.4, 8, 1.8, 12);
  add('turkey', 189, 28.6, 0, 7.4, 0, 0, 68);
  add('wasabi', 109, 4.8, 23.5, 0.6, 7.8, 0, 17);
  add('wax gourd', 13, 0.4, 3, 0.2, 2.9, 0, 111);
  add('squid', 92, 15.6, 3.1, 1.4, 0, 0, 44);
  add('shrimp', 85, 20.1, 0.9, 0.5, 0, 0, 566);
  add('crayfish', 82, 16.8, 0, 1.0, 0, 0, 58);
  add('yam', 118, 1.5, 27.9, 0.2, 4.1, 0.5, 9);
  add('jicama', 38, 0.7, 8.8, 0.1, 4.9, 1.8, 4);
  add('common mushroom', 22, 3.1, 3.3, 0.3, 1, 2, 5);
  add('shiitake', 34, 2.2, 6.8, 0.5, 2.5, 2.4, 9);
  add('black-eyed pea', 336, 23.5, 60.3, 1.3, 10.6, 0, 16);
  add('deer', 120, 23, 0, 2.4, 0, 0, 51);
  add('domestic goat', 109, 20.6, 0, 2.3, 0, 0, 86);
  add('enokitake', 37, 2.7, 7.8, 0.3, 2.7, 0.2, 3);
  add('oyster mushroom', 33, 3.3, 6.1, 0.4, 2.3, 1.1, 18);
  add('maitake', 31, 1.9, 7, 0.2, 2.7, 2.1, 1);
  add('chanterelle', 38, 1.5, 6.9, 0.5, 3.8, 1.2, 9);
  add('cinnamon', 247, 4, 80.6, 1.2, 53.1, 2.2, 10);
  add('tilapia', 96, 20.1, 0, 1.7, 0, 0, 52);
  add('salt', 0, 0, 0, 0, 0, 0, 38758);
  add('butter', 717, 0.9, 0.1, 81.1, 0, 0.1, 643);
  add('cream', 340, 2.1, 2.8, 36.1, 0, 2.9, 34);
  add('honey', 304, 0.3, 82.4, 0, 0.2, 82.1, 4);
  add('vinegar', 18, 0, 0.04, 0, 0, 0.04, 2);
  add('curry powder', 325, 14.3, 55.8, 14.01, 53.2, 2.8, 52);
  add('cocoa powder', 228, 19.6, 57.9, 13.7, 33.2, 1.8, 21);
  add('chocolate', 546, 5, 59.4, 31.3, 7, 47.9, 24);
  add('soy sauce', 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493);
  add('miso', 199, 12.8, 26.5, 6, 5.4, 6.2, 3728);
  add('tofu', 76, 8, 1.9, 4.8, 0.3, 0.6, 7);
  add('cheese', 402, 25, 1.3, 33.1, 0, 0.5, 621);
  add('milk', 61, 3.2, 4.8, 3.2, 0, 5.1, 43);
  add('eggs', 155, 12.6, 1.1, 10.6, 0, 1.1, 124);
  add('yogurt', 61, 3.5, 4.7, 3.3, 0, 4.7, 46);
  add('kefir', 43, 3.8, 4.5, 1, 0, 0, 40);
  add('buttermilk', 40, 3.3, 4.8, 0.9, 0, 4.8, 105);
  add('lard', 902, 0, 0, 100, 0, 0, 0);
  add('heart of palm', 28, 2.5, 4.6, 0.6, 2.4, 0, 426);
  add('bulgur', 342, 12.3, 75.9, 1.3, 18.3, 0.4, 17);
  add('semolina', 360, 12.7, 72.8, 1.1, 3.9, 0.7, 1);
  add('tapioca', 358, 0.2, 88.7, 0.02, 0.9, 3.3, 1);
  add('molasses', 290, 0, 74.7, 0.1, 0, 74.7, 37);
  add('olive oil', 884, 0, 0, 100, 0, 0, 2);
  add('evaporated milk', 134, 6.8, 10, 7.6, 0, 10, 106);
  add('flour', 364, 10.3, 76.3, 1, 2.7, 0.3, 2);
  add('condensed milk', 321, 7.9, 54.4, 8.7, 0, 54.4, 127);
  add('margarine', 717, 0.2, 0.7, 80.7, 0, 0, 751);
  add('green zucchini', 17, 1.2, 3.1, 0.3, 1, 2.5, 8);
  add('green bell pepper', 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3);
  add('yellow bell pepper', 27, 1, 6.3, 0.2, 0.9, 0, 2);
  add('red bell pepper', 31, 1, 6.0, 0.3, 2.1, 4.2, 4);
  add('green bean', 31, 1.8, 7.0, 0.1, 3.4, 3.3, 6);
  add('white cabbage', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18);
  add('romaine lettuce', 17, 1.2, 3.3, 0.3, 2.1, 1.2, 8);
  add('blackberry', 43, 1.4, 9.6, 0.5, 5.3, 4.9, 1);
  add('canola oil', 884, 0, 0, 100, 0, 0, 0);
  add('cheddar cheese', 403, 24.9, 1.3, 33.1, 0, 0.5, 621);
  add('parmesan cheese', 392, 35.7, 3.2, 25.8, 0, 0.9, 1529);
  add('almond milk', 15, 0.6, 0.6, 1.1, 0, 0, 67);
  add('coconut milk', 230, 2.3, 5.5, 23.8, 2.2, 3.3, 15);
  add('sunflower oil', 884, 0, 0, 100, 0, 0, 0);
  add('coconut oil', 862, 0, 0, 100, 0, 0, 0);
  add('peanut oil', 884, 0, 0, 100, 0, 0, 0);
  add('corn oil', 884, 0, 0, 100, 0, 0, 0);
  add('avocado oil', 884, 0, 0, 100, 0, 0, 0);
  add('grapeseed oil', 884, 0, 0, 100, 0, 0, 0);
  add('sesame oil', 884, 0, 0, 100, 0, 0, 0);
  add('monterey jack cheese', 373, 24.5, 0.7, 30.3, 0, 0.5, 536);
  add('swiss cheese', 380, 27, 5.4, 28, 0, 1.4, 192);
  add('cottage cheese', 98, 11.1, 3.4, 4.3, 0, 2.7, 364);
  add('blue cheese', 353, 21.4, 2.3, 28.7, 0, 0, 1395);
  add('clam', 74, 12.8, 2.6, 1, 0, 0, 601);
  add('sour cream', 198, 2.4, 4.6, 19.4, 0, 3.5, 80);
  add('jalapeno pepper', 29, 0.9, 6.5, 0.4, 2.8, 4.1, 1);
  add('greek feta cheese', 264, 14.2, 4.1, 21.3, 0, 4.1, 917);
  add('plantain', 122, 1.3, 31.9, 0.4, 2.3, 15, 4);
  add('clementine', 47, 0.8, 12.0, 0.1, 1.7, 9.2, 1);
  add('red onion', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4);
  add('green onion', 32, 1.8, 7.3, 0.2, 2.6, 2.3, 16);
  add('iceberg lettuce', 14, 0.9, 3.0, 0.1, 1.2, 2.0, 10);
  add('water spinach', 19, 2.6, 3.1, 0.2, 2, 0, 113);
  add('pitaya', 60, 1.2, 13, 0, 3, 8, 0);
  add('goji', 349, 14.3, 77.1, 0.4, 13, 45.6, 298);
  add('cantaloupe melon', 34, 0.8, 8.2, 0.2, 0.9, 7.9, 16);
  add('cape gooseberry', 53, 1.9, 11.2, 0.7, 0, 0, 0);
  add('herbal tea', 1, 0, 0.2, 0, 0, 0, 2);
  add('fish oil', 902, 0, 0, 100, 0, 0, 0);

  // Additional items from other sources
  add('black pepper', 251, 10.4, 63.9, 3.3, 25.3, 0.6, 20);
  add('cornstarch', 381, 0.3, 91.3, 0.1, 0.9, 0, 9);
  add('pasta', 131, 5, 25, 1.1, 1.8, 0.6, 1);
  add('breadcrumbs', 395, 13.4, 71.8, 5.3, 4.5, 6.2, 732);
  add('bacon', 541, 37, 1.4, 42, 0, 0, 2310);
  add('tahini', 595, 17, 21.2, 53.8, 9.3, 0.5, 115);
  add('fish sauce', 35, 5.1, 3.6, 0.01, 0, 0, 7851);
  add('mustard', 60, 4.4, 5.8, 3.3, 4, 2.2, 1135);
  add('granulated sugar', 387, 0, 100, 0, 0, 100, 0);
  add('brown sugar', 380, 0.1, 98.1, 0, 0, 97, 28);
  add('baking soda', 0, 0, 0, 0, 0, 0, 27360);
  add('baking powder', 53, 0, 27.7, 0, 0.2, 0, 10600);
  add('bread', 265, 9, 49, 3.2, 2.7, 5, 491);
  add('ketchup', 112, 1.7, 25.8, 0.4, 0.3, 22.8, 907);
  add('mayonnaise', 680, 1, 0.6, 75, 0, 0.6, 635);
  add('tomato paste', 82, 4.3, 18.9, 0.5, 4.4, 12.2, 98);
  add('canned tomatoes', 17, 0.8, 3.6, 0.1, 0.9, 2.4, 132);
  add('tuna', 116, 25.5, 0, 0.8, 0, 0, 50);
  add('chicken breast', 106, 22.5, 0, 1.9, 0, 0, 66);
  add('ground beef', 254, 17.2, 0, 20, 0, 0, 66);
  add('sausage', 301, 12.3, 1.1, 27.3, 0, 0, 808);
  add('oyster sauce', 51, 1.4, 11.0, 0, 0, 3.3, 2733);

  return known;
}

// ============================================================
// Additional source ingredients (Tasting Table, Simone Jones, My Eclectic Bites)
// These are kept hardcoded since they are fixed lists from specific articles
// ============================================================
function getOtherSourceIngredients(): Ingredient[] {
  const N = '';
  const ing = (
    name: string, category: string, tags: string, source: string,
    cal: number | string = N, pro: number | string = N, carb: number | string = N,
    fat: number | string = N, fib: number | string = N, sug: number | string = N,
    sod: number | string = N
  ): Ingredient => ({
    Name: name.toLowerCase().trim(), Category: category, Tags: tags, Source: source,
    Calories_kcal: cal, Protein_g: pro, Carbs_g: carb,
    Fat_g: fat, Fiber_g: fib, Sugar_g: sug, Sodium_mg: sod,
  });

  const SRC2 = 'Tasting Table (tastingtable.com)';
  const SRC3 = 'Simone Jones Tyner (simonejonestyner.com)';
  const SRC4 = 'My Eclectic Bites (myeclecticbites.com)';

  return [
    // === Tasting Table ===
    ing('black pepper', 'spices', 'spice,essential,universal', SRC2, 251, 10.4, 63.9, 3.3, 25.3, 0.6, 20),
    ing('fresh parsley', 'herbs', 'herb,fresh,garnish', SRC2, 36, 3, 6.3, 0.8, 3.3, 0.8, 56),
    ing('cider vinegar', 'pantry', 'vinegar,condiment,acidic', SRC2, 21, 0, 0.9, 0, 0, 0.4, 5),
    ing('mustard', 'pantry', 'condiment,spicy,versatile', SRC2, 60, 4.4, 5.8, 3.3, 4, 2.2, 1135),
    ing('fish sauce', 'pantry', 'condiment,asian,umami', SRC2, 35, 5.1, 3.6, 0.01, 0, 0, 7851),
    ing('anchovies', 'pantry', 'fish,preserved,umami', SRC2, 131, 20.4, 0, 4.8, 0, 0, 104),
    ing('cornstarch', 'pantry', 'thickener,baking,starch', SRC2, 381, 0.3, 91.3, 0.1, 0.9, 0, 9),
    ing('pasta', 'grains', 'wheat,staple,italian', SRC2, 131, 5, 25, 1.1, 1.8, 0.6, 1),
    ing('breadcrumbs', 'pantry', 'coating,baking,crunch', SRC2, 395, 13.4, 71.8, 5.3, 4.5, 6.2, 732),
    ing('bacon', 'meat', 'pork,cured,smoky', SRC2, 541, 37, 1.4, 42, 0, 0, 2310),
    ing('frozen peas', 'frozen', 'vegetable,frozen,sweet', SRC2, 77, 5.2, 13.6, 0.3, 4.5, 5.5, 103),
    ing('chiles', 'produce', 'vegetable,hot,spicy', SRC2, 40, 1.9, 8.8, 0.4, 1.5, 5.3, 9),
    ing('za\'atar', 'spices', 'spice,blend,middle eastern', SRC2),
    ing('tahini', 'pantry', 'paste,sesame,mediterranean', SRC2, 595, 17, 21.2, 53.8, 9.3, 0.5, 115),
    ing('beans', 'pulses', 'legume,protein,versatile', SRC2, 333, 23.6, 60, 0.8, 24.9, 2.1, 5),
    // === Simone Jones Tyner ===
    ing('all-purpose flour', 'pantry', 'baking,staple,wheat', SRC3, 364, 10.3, 76.3, 1, 2.7, 0.3, 2),
    ing('granulated sugar', 'pantry', 'sweetener,baking,staple', SRC3, 387, 0, 100, 0, 0, 100, 0),
    ing('confectioner\'s sugar', 'pantry', 'sweetener,baking,icing', SRC3, 389, 0, 99.8, 0, 0, 97.8, 0),
    ing('brown sugar', 'pantry', 'sweetener,baking,molasses', SRC3, 380, 0.1, 98.1, 0, 0, 97, 28),
    ing('baking soda', 'pantry', 'baking,leavening,essential', SRC3, 0, 0, 0, 0, 0, 0, 27360),
    ing('baking powder', 'pantry', 'baking,leavening,essential', SRC3, 53, 0, 27.7, 0, 0.2, 0, 10600),
    ing('bread', 'pantry', 'staple,wheat,carb', SRC3, 265, 9, 49, 3.2, 2.7, 5, 491),
    ing('crackers', 'pantry', 'snack,wheat,crispy', SRC3, 421, 10, 74, 9.5, 3, 0, 712),
    ing('corn flakes', 'pantry', 'cereal,breakfast,processed', SRC3, 357, 7, 84, 0.4, 3.3, 8.4, 729),
    ing('potatoes', 'produce', 'vegetable,starchy,staple', SRC3, 77, 2, 17, 0.1, 2.2, 0.8, 6),
    ing('ketchup', 'pantry', 'condiment,sweet,tomato', SRC3, 112, 1.7, 25.8, 0.4, 0.3, 22.8, 907),
    ing('relish', 'pantry', 'condiment,pickled,sweet', SRC3, 130, 0.5, 35, 0.4, 1.3, 23.5, 1010),
    ing('mayonnaise', 'pantry', 'condiment,creamy,emulsion', SRC3, 680, 1, 0.6, 75, 0, 0.6, 635),
    ing('apple cider vinegar', 'pantry', 'vinegar,condiment,acidic', SRC3, 21, 0, 0.9, 0, 0, 0.4, 5),
    ing('white vinegar', 'pantry', 'vinegar,cleaning,cooking', SRC3, 18, 0, 0.04, 0, 0, 0.04, 2),
    ing('balsamic vinegar', 'pantry', 'vinegar,condiment,italian', SRC3, 88, 0.5, 17.0, 0, 0, 14.95, 23),
    ing('worcestershire sauce', 'pantry', 'condiment,sauce,umami', SRC3, 78, 0, 19.5, 0, 0, 10.2, 980),
    ing('hot sauce', 'pantry', 'condiment,spicy,versatile', SRC3, 11, 0.6, 1.7, 0.4, 0.5, 0.9, 2643),
    ing('vegetable oil', 'pantry', 'oil,cooking,neutral', SRC3, 884, 0, 0, 100, 0, 0, 0),
    ing('cooking spray', 'pantry', 'oil,cooking,low calorie', SRC3),
    ing('cream of chicken soup', 'pantry', 'canned,soup,cooking', SRC3, 56, 1.3, 5.8, 3.1, 0.3, 0.4, 450),
    ing('cream of mushroom soup', 'pantry', 'canned,soup,cooking', SRC3, 51, 0.7, 4.2, 3.4, 0.3, 0.4, 397),
    ing('chicken broth', 'pantry', 'broth,stock,cooking', SRC3, 7, 1.0, 0.2, 0.2, 0, 0.2, 343),
    ing('vegetable broth', 'pantry', 'broth,stock,vegetarian', SRC3, 6, 0.2, 1.1, 0.1, 0, 0.3, 297),
    ing('tomato paste', 'pantry', 'concentrated,cooking,italian', SRC3, 82, 4.3, 18.9, 0.5, 4.4, 12.2, 98),
    ing('pasta sauce', 'pantry', 'sauce,italian,cooking', SRC3, 51, 1.5, 8.3, 1.4, 1.5, 5.5, 384),
    ing('canned beans', 'pantry', 'legume,canned,protein', SRC3, 114, 7.3, 20.7, 0.5, 5.5, 0.7, 364),
    ing('tuna', 'seafood', 'fish,canned,protein', SRC3, 116, 25.5, 0, 0.8, 0, 0, 50),
    ing('kosher salt', 'spices', 'seasoning,essential,basic', SRC3, 0, 0, 0, 0, 0, 0, 38758),
    ing('red pepper flakes', 'spices', 'spice,hot,dried', SRC3, 318, 12, 56.6, 17.3, 34.8, 10.3, 30),
    ing('parsley flakes', 'herbs', 'herb,dried,garnish', SRC3, 292, 26.6, 51.7, 5.5, 26.7, 0, 452),
    ing('garlic powder', 'spices', 'spice,dried,allium', SRC3, 331, 16.6, 72.7, 0.7, 9, 2.4, 60),
    ing('cayenne pepper', 'spices', 'spice,hot,dried', SRC3, 318, 12, 56.6, 17.3, 27.2, 10.3, 30),
    ing('paprika', 'spices', 'spice,mild,colorful', SRC3, 282, 14.1, 53.99, 13, 34.9, 10.3, 68),
    ing('bay leaves', 'spices', 'herb,dried,aromatic', SRC3, 313, 7.6, 74.97, 8.4, 26.3, 0, 23),
    ing('vanilla extract', 'pantry', 'baking,extract,sweet', SRC3, 288, 0.1, 12.65, 0.1, 0, 12.65, 9),
    ing('chili powder', 'spices', 'spice,blend,hot', SRC3, 282, 13.5, 49.7, 14.3, 34.8, 7.2, 1010),
    ing('onion powder', 'spices', 'spice,dried,allium', SRC3, 341, 10.4, 79.1, 1.1, 15.2, 6.6, 73),
    ing('lemons', 'produce', 'fruit,fresh,citrus', SRC3, 29, 1.1, 9.3, 0.3, 2.8, 2.5, 2),
    ing('mozzarella cheese', 'dairy', 'dairy,cheese,mild', SRC3, 280, 28.2, 3.1, 17.1, 0, 1.1, 628),
    ing('peas', 'frozen', 'vegetable,frozen,sweet', SRC3, 81, 5.4, 14.4, 0.4, 5.7, 5.7, 5),
    ing('green beans', 'produce', 'vegetable,fresh,versatile', SRC3, 31, 1.8, 7, 0.1, 3.4, 3.3, 6),
    ing('sausage', 'meat', 'pork,cured,seasoned', SRC3, 301, 12.3, 1.1, 27.3, 0, 0, 808),
    ing('chicken breast', 'meat', 'poultry,protein,lean', SRC3, 106, 22.5, 0, 1.9, 0, 0, 66),
    ing('chicken thighs', 'meat', 'poultry,protein,juicy', SRC3, 177, 24.9, 0, 8, 0, 0, 84),
    ing('ground beef', 'meat', 'beef,protein,versatile', SRC3, 254, 17.2, 0, 20, 0, 0, 66),
    ing('ground turkey', 'meat', 'poultry,protein,lean', SRC3, 150, 27.4, 0, 7.7, 0, 0, 75),
    // === My Eclectic Bites ===
    ing('dried basil', 'spices', 'herb,dried,italian', SRC4, 233, 22.98, 47.75, 4.07, 37.7, 1.71, 34),
    ing('dried oregano', 'spices', 'herb,dried,italian', SRC4, 265, 9, 68.9, 4.3, 42.5, 4.1, 25),
    ing('dried thyme', 'spices', 'herb,dried,aromatic', SRC4, 276, 9.1, 63.9, 7.4, 37, 0, 55),
    ing('extra virgin olive oil', 'pantry', 'oil,cooking,mediterranean', SRC4, 884, 0, 0, 100, 0, 0, 2),
    ing('rice wine vinegar', 'pantry', 'vinegar,asian,mild', SRC4, 18, 0, 0.04, 0, 0, 0.04, 2),
    ing('red wine vinegar', 'pantry', 'vinegar,condiment,tangy', SRC4, 19, 0, 0.3, 0, 0, 0, 8),
    ing('dijon mustard', 'pantry', 'condiment,spicy,french', SRC4, 66, 4.1, 5.6, 3.8, 3.5, 3, 1135),
    ing('yellow mustard', 'pantry', 'condiment,mild,american', SRC4, 60, 4.4, 5.8, 3.3, 4, 2.2, 1135),
    ing('oyster sauce', 'pantry', 'condiment,asian,umami', SRC4, 51, 1.4, 11.0, 0, 0, 3.3, 2733),
    ing('diced tomatoes', 'pantry', 'canned,cooking,italian', SRC4, 17, 0.8, 3.6, 0.1, 0.9, 2.4, 132),
    ing('tomato sauce', 'pantry', 'sauce,cooking,italian', SRC4, 24, 1.3, 5.4, 0.1, 1.5, 3.6, 346),
    ing('dried pasta', 'grains', 'wheat,staple,italian', SRC4, 371, 13.04, 74.67, 1.51, 3.2, 2.67, 6),
    ing('whole-wheat pasta', 'grains', 'wheat,whole grain,fiber', SRC4, 348, 14.6, 73.4, 1.4, 8.6, 2.7, 8),
    ing('oats', 'grains', 'cereal,whole grain,fiber', SRC4, 389, 16.9, 66.3, 6.9, 10.6, 0, 2),
    ing('dried beans', 'pulses', 'legume,protein,dried', SRC4, 333, 23.6, 60, 0.8, 24.9, 2.1, 5),
    ing('sesame seeds', 'nuts', 'seed,calcium,aromatic', SRC4, 573, 17.7, 23.4, 49.7, 11.8, 0.3, 11),
    ing('onion', 'produce', 'vegetable,fresh,allium', SRC4, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4),
  ];
}

// ============================================================
// Main execution
// ============================================================
async function main() {
  console.log('==============================================');
  console.log('  MealPlan Ingredient Scraper & Generator');
  console.log('==============================================\n');

  // Step 1: Scrape FooDB
  console.log('Step 1: Scraping FooDB...');
  const fooDBFoods = await scrapeAllFooDB();

  // Step 2: Load known nutrition data
  console.log('\nStep 2: Loading known nutrition data...');
  const knownNutrition = getKnownNutrition();
  console.log(`  ${knownNutrition.size} items with pre-cached nutrition`);

  // Step 3: Build FooDB ingredient list
  console.log('\nStep 3: Building FooDB ingredient list...');
  const SRC1 = 'FooDB (foodb.ca)';
  const fooDBIngredients: Ingredient[] = [];
  let nutritionHits = 0;
  let nutritionMisses = 0;

  for (const food of fooDBFoods) {
    const name = food.name.toLowerCase().trim();
    const category = mapFooDBCategory(food.group, food.subGroup);
    const tags = generateTags(food.name, food.group, food.subGroup);

    // Look up nutrition from cache
    const nutrition = knownNutrition.get(name);

    if (nutrition) {
      nutritionHits++;
      fooDBIngredients.push({
        Name: name,
        Category: category,
        Tags: tags,
        Source: SRC1,
        Calories_kcal: nutrition.calories ?? '',
        Protein_g: nutrition.protein ?? '',
        Carbs_g: nutrition.carbs ?? '',
        Fat_g: nutrition.fat ?? '',
        Fiber_g: nutrition.fiber ?? '',
        Sugar_g: nutrition.sugar ?? '',
        Sodium_mg: nutrition.sodium ?? '',
      });
    } else {
      nutritionMisses++;
      fooDBIngredients.push({
        Name: name,
        Category: category,
        Tags: tags,
        Source: SRC1,
        Calories_kcal: '',
        Protein_g: '',
        Carbs_g: '',
        Fat_g: '',
        Fiber_g: '',
        Sugar_g: '',
        Sodium_mg: '',
      });
    }
  }

  console.log(`  FooDB items: ${fooDBIngredients.length}`);
  console.log(`  With nutrition: ${nutritionHits}, Without: ${nutritionMisses}`);

  // Step 4: Try USDA API for items without nutrition (if DEMO_KEY available)
  const itemsWithoutNutrition = fooDBIngredients.filter(i => i.Calories_kcal === '');
  console.log(`\nStep 4: Looking up nutrition from USDA for ${itemsWithoutNutrition.length} items...`);
  console.log('  (Using DEMO_KEY - rate limited to ~30 req/hour, will skip on limit)');

  let usdaHits = 0;
  let usdaSkipped = 0;

  for (let i = 0; i < itemsWithoutNutrition.length; i++) {
    const item = itemsWithoutNutrition[i];

    // DEMO_KEY limit: stop after reasonable number of requests
    if (usdaRequestCount >= 25) {
      usdaSkipped = itemsWithoutNutrition.length - i;
      console.log(`  Stopping USDA lookups at ${usdaRequestCount} requests (${usdaSkipped} items skipped)`);
      break;
    }

    if (i % 10 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${itemsWithoutNutrition.length} (${usdaHits} hits so far)`);
    }

    try {
      const nutrition = await lookupNutrition(item.Name);
      if (nutrition.calories !== null) {
        item.Calories_kcal = nutrition.calories;
        item.Protein_g = nutrition.protein ?? '';
        item.Carbs_g = nutrition.carbs ?? '';
        item.Fat_g = nutrition.fat ?? '';
        item.Fiber_g = nutrition.fiber ?? '';
        item.Sugar_g = nutrition.sugar ?? '';
        item.Sodium_mg = nutrition.sodium ?? '';
        usdaHits++;
      }
    } catch (err) {
      // Skip on error
    }

    await sleep(300); // Rate limit protection
  }

  console.log(`  USDA lookups: ${usdaHits} hits, ${usdaSkipped} skipped`);

  // Step 5: Merge with other sources
  console.log('\nStep 5: Merging with other sources...');
  const otherIngredients = getOtherSourceIngredients();
  console.log(`  Other source items: ${otherIngredients.length}`);

  const allRaw = [...fooDBIngredients, ...otherIngredients];

  // Deduplicate (keep first occurrence, prefer ones with nutrition data)
  const seen = new Map<string, Ingredient>();
  for (const item of allRaw) {
    const key = item.Name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      const existing = seen.get(key)!;
      if (existing.Calories_kcal === '' && item.Calories_kcal !== '') {
        seen.set(key, item);
      }
    }
  }

  const deduplicated = Array.from(seen.values()).sort((a, b) => {
    const catCmp = a.Category.localeCompare(b.Category);
    if (catCmp !== 0) return catCmp;
    return a.Name.localeCompare(b.Name);
  });

  console.log(`  Total raw: ${allRaw.length}, After dedup: ${deduplicated.length}`);

  // Step 6: Generate Excel
  console.log('\nStep 6: Generating Excel...');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(deduplicated);

  ws['!cols'] = [
    { wch: 30 },  // Name
    { wch: 12 },  // Category
    { wch: 40 },  // Tags
    { wch: 42 },  // Source
    { wch: 14 },  // Calories
    { wch: 12 },  // Protein
    { wch: 10 },  // Carbs
    { wch: 10 },  // Fat
    { wch: 10 },  // Fiber
    { wch: 10 },  // Sugar
    { wch: 12 },  // Sodium
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');

  // Summary sheet
  const withNutrition = deduplicated.filter(i => i.Calories_kcal !== '').length;
  const summary = [
    { Source: 'FooDB (foodb.ca)', 'Items Scraped': fooDBIngredients.length, 'URL': 'https://foodb.ca/foods' },
    { Source: 'Tasting Table', 'Items Scraped': otherIngredients.filter(i => i.Source.includes('Tasting')).length, 'URL': 'https://www.tastingtable.com/1308478/essential-ingredients-every-beginner-cook-needs-have/' },
    { Source: 'Simone Jones Tyner', 'Items Scraped': otherIngredients.filter(i => i.Source.includes('Simone')).length, 'URL': 'https://simonejonestyner.com/75-ingredients-you-should-always-keep-in-your-kitchen/' },
    { Source: 'My Eclectic Bites', 'Items Scraped': otherIngredients.filter(i => i.Source.includes('Eclectic')).length, 'URL': 'https://www.myeclecticbites.com/essential-ingredients/' },
    { Source: 'TOTAL (before dedup)', 'Items Scraped': allRaw.length, 'URL': '' },
    { Source: 'TOTAL (after dedup)', 'Items Scraped': deduplicated.length, 'URL': '' },
    { Source: 'Items with nutrition', 'Items Scraped': withNutrition, 'URL': '' },
    { Source: 'Items without nutrition', 'Items Scraped': deduplicated.length - withNutrition, 'URL': '' },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Sources');

  XLSX.writeFile(wb, 'ingredients-import.xlsx');
  console.log('  ✓ ingredients-import.xlsx');

  // Step 7: Generate JSON
  console.log('\nStep 7: Generating JSON for API import...');
  const jsonExport = {
    ingredients: deduplicated.map(i => ({
      name: i.Name,
      category: i.Category,
      tags: i.Tags,
    })),
  };

  fs.writeFileSync('ingredients-import.json', JSON.stringify(jsonExport, null, 2));
  console.log('  ✓ ingredients-import.json');

  // Save full data with nutrition as separate JSON (for reference)
  fs.writeFileSync('ingredients-full.json', JSON.stringify(deduplicated, null, 2));
  console.log('  ✓ ingredients-full.json (with nutrition data)');

  // Final summary
  console.log('\n==============================================');
  console.log('  Generation Complete!');
  console.log('==============================================');
  console.log(`  FooDB scraped:      ${fooDBIngredients.length} items`);
  console.log(`  Other sources:      ${otherIngredients.length} items`);
  console.log(`  Total raw:          ${allRaw.length}`);
  console.log(`  After dedup:        ${deduplicated.length}`);
  console.log(`  With nutrition:     ${withNutrition}`);
  console.log(`  Without nutrition:  ${deduplicated.length - withNutrition}`);
  console.log(`  USDA API calls:     ${usdaRequestCount}`);
  console.log('\n  Files:');
  console.log('    - ingredients-import.xlsx  (Excel with nutrition + Sources sheet)');
  console.log('    - ingredients-import.json  (JSON for API bulk import)');
  console.log('    - ingredients-full.json    (Full data with nutrition)');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
