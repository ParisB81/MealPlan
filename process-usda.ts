/**
 * process-usda.ts
 *
 * Reads USDA FoodData Central SR Legacy CSV files and generates:
 *   - ingredients-import.xlsx (with nutrition data)
 *   - ingredients-import.json (for API bulk import)
 *
 * Data source: USDA FoodData Central SR Legacy (April 2018)
 *   https://fdc.nal.usda.gov/download-datasets/
 *   Public domain (CC0 1.0 Universal)
 *
 * Usage:
 *   cd "C:\00 Paris\MealPlan"
 *   "C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" process-usda.ts
 */

import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';

// ============================================================
// Configuration
// ============================================================
const SR_LEGACY_DIR = path.join(__dirname, 'sr_legacy', 'FoodData_Central_sr_legacy_food_csv_2018-04');

// Food categories to INCLUDE (raw/basic cooking ingredients)
// Category IDs from food_category.csv
const INCLUDE_CATEGORIES: Record<number, string> = {
  1: 'dairy',        // Dairy and Egg Products
  2: 'spices',       // Spices and Herbs
  4: 'pantry',       // Fats and Oils
  5: 'meat',         // Poultry Products
  9: 'produce',      // Fruits and Fruit Juices
  10: 'meat',        // Pork Products
  11: 'produce',     // Vegetables and Vegetable Products
  12: 'nuts',        // Nut and Seed Products
  13: 'meat',        // Beef Products
  15: 'seafood',     // Finfish and Shellfish Products
  16: 'pulses',      // Legumes and Legume Products
  17: 'meat',        // Lamb, Veal, and Game Products
  20: 'grains',      // Cereal Grains and Pasta
  // 14: beverages — skip
  // 19: sweets — skip (confectionery)
};

// Categories to EXCLUDE entirely:
// 3: Baby Foods, 6: Soups/Sauces, 7: Sausages/Luncheon, 8: Breakfast Cereals,
// 14: Beverages, 18: Baked Products, 19: Sweets, 21: Fast Foods,
// 22: Meals/Entrees, 23: Snacks, 24: American Indian Foods, 25: Restaurant Foods

// Nutrient IDs we need (per 100g)
const NUTRIENT_MAP: Record<number, string> = {
  1008: 'calories',   // Energy (kcal)
  1003: 'protein',    // Protein (g)
  1005: 'carbs',      // Carbohydrate, by difference (g)
  1004: 'fat',        // Total lipid/fat (g)
  1079: 'fiber',      // Fiber, total dietary (g)
  2000: 'sugar',      // Total Sugars (g)
  1093: 'sodium',     // Sodium, Na (mg)
};

// Keywords that indicate processed/non-raw foods to filter out
const EXCLUDE_KEYWORDS = [
  'cooked', 'fried', 'baked', 'roasted', 'boiled', 'steamed', 'stewed',
  'canned', 'frozen', 'dried', 'dehydrated', 'pickled', 'marinated',
  'breaded', 'braised', 'grilled', 'broiled', 'microwaved', 'smoked',
  'cured', 'creamed', 'mashed', 'hash', 'au gratin',
  'fast food', 'restaurant', 'brand', 'pillsbury', 'kraft', 'campbell',
  'prepared', 'ready-to', 'instant', 'mix,', 'with sauce',
  'baby food', 'infant', 'formula',
  'imitation', 'substitute', 'analog',
  // Keep "raw" versions but filter out heavily processed
];

// Keywords that indicate we WANT this item (raw/basic)
const PREFER_KEYWORDS = ['raw', 'fresh', 'uncooked', 'whole', 'mature seeds'];

// ============================================================
// CSV Parser (simple, handles quoted fields)
// ============================================================
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================
// USDA category → our category mapping
// ============================================================
function mapCategory(usdaCategoryId: number, description: string): string {
  const base = INCLUDE_CATEGORIES[usdaCategoryId] || 'other';
  const desc = description.toLowerCase();

  // Refine within produce
  if (base === 'produce') {
    if (desc.includes('fruit') || desc.includes('juice')) return 'produce';
    if (desc.includes('vegetable')) return 'produce';
  }

  // Refine herbs vs spices
  if (base === 'spices') {
    if (desc.includes('herb') || desc.includes('basil') || desc.includes('parsley') ||
        desc.includes('cilantro') || desc.includes('dill') || desc.includes('mint') ||
        desc.includes('rosemary') || desc.includes('thyme') || desc.includes('oregano') ||
        desc.includes('sage') || desc.includes('bay ') || desc.includes('chive')) {
      return 'herbs';
    }
    return 'spices';
  }

  return base;
}

// ============================================================
// Generate tags from food description and category
// ============================================================
function generateTags(description: string, categoryId: number): string {
  const tags: string[] = [];
  const desc = description.toLowerCase();

  // Category-based tags
  switch (categoryId) {
    case 1: tags.push('dairy'); break;
    case 2:
      if (desc.includes('spice') || desc.includes('pepper') || desc.includes('cinnamon') ||
          desc.includes('cumin') || desc.includes('turmeric') || desc.includes('nutmeg') ||
          desc.includes('clove') || desc.includes('cardamom') || desc.includes('saffron'))
        tags.push('spice');
      else tags.push('herb');
      break;
    case 4: tags.push('fat', 'oil'); break;
    case 5: tags.push('poultry', 'protein'); break;
    case 9: tags.push('fruit'); break;
    case 10: tags.push('pork', 'protein'); break;
    case 11: tags.push('vegetable'); break;
    case 12: tags.push('nut', 'protein'); break;
    case 13: tags.push('beef', 'protein'); break;
    case 15: tags.push('seafood', 'protein'); break;
    case 16: tags.push('legume', 'protein'); break;
    case 17: tags.push('meat', 'protein'); break;
    case 20: tags.push('grain'); break;
  }

  // Descriptor-based tags
  if (desc.includes('raw')) tags.push('fresh');
  if (desc.includes('organic')) tags.push('organic');
  if (desc.includes('whole')) tags.push('whole');
  if (desc.includes('seed')) tags.push('seed');
  if (desc.includes('oil')) tags.push('oil');
  if (desc.includes('butter') && categoryId === 1) tags.push('butter');
  if (desc.includes('cheese')) tags.push('cheese');
  if (desc.includes('egg')) tags.push('egg');
  if (desc.includes('berry') || desc.includes('berries')) tags.push('berry');
  if (desc.includes('citrus') || desc.includes('lemon') || desc.includes('orange') || desc.includes('lime') || desc.includes('grapefruit')) tags.push('citrus');
  if (desc.includes('tropical') || desc.includes('mango') || desc.includes('papaya') || desc.includes('banana') || desc.includes('pineapple')) tags.push('tropical');
  if (desc.includes('leafy') || desc.includes('lettuce') || desc.includes('spinach') || desc.includes('kale') || desc.includes('chard')) tags.push('leafy');
  if (desc.includes('root') || desc.includes('carrot') || desc.includes('beet') || desc.includes('turnip') || desc.includes('parsnip')) tags.push('root');

  return [...new Set(tags)].join(',');
}

// ============================================================
// Clean up food description to a simpler ingredient name
// ============================================================
function cleanName(description: string): string {
  let name = description
    // Remove brand names and specifics
    .replace(/,\s*(UPC|GTIN).*$/i, '')
    // Remove "NFS" (not further specified)
    .replace(/,?\s*NFS\s*$/i, '')
    // Remove trailing states like ", raw" (we'll filter for raw only)
    .replace(/,\s*raw\s*$/i, '')
    // Remove common qualifiers but keep useful ones
    .replace(/,\s*(year-round average|with skin|without skin|without seeds|all commercial varieties|all varieties)\s*$/i, '')
    // Clean up extra commas and whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Lowercase
  name = name.toLowerCase();

  return name;
}

// ============================================================
// Decide if a food should be included based on its description
// ============================================================
function shouldInclude(description: string, categoryId: number): boolean {
  // Must be in an included category
  if (!INCLUDE_CATEGORIES[categoryId]) return false;

  const desc = description.toLowerCase();

  // Exclude heavily processed items
  for (const kw of EXCLUDE_KEYWORDS) {
    if (desc.includes(kw)) {
      // But allow if also has "raw" in it (e.g., "Beef, raw")
      if (PREFER_KEYWORDS.some(pk => desc.includes(pk))) {
        return true;
      }
      return false;
    }
  }

  return true;
}

// ============================================================
// Score a food item (higher = more preferred for dedup)
// "raw" items score highest, then unqualified, then processed
// ============================================================
function scoreFood(description: string): number {
  const desc = description.toLowerCase();
  let score = 0;

  if (desc.includes('raw')) score += 100;
  if (desc.includes('fresh')) score += 50;
  if (desc.includes('whole')) score += 25;
  if (desc.includes('mature seeds')) score += 20;
  if (desc.includes('uncooked')) score += 80;

  // Penalize processed
  if (desc.includes('cooked')) score -= 50;
  if (desc.includes('canned')) score -= 40;
  if (desc.includes('frozen')) score -= 30;
  if (desc.includes('dried')) score -= 10;

  return score;
}

// ============================================================
// Main processing
// ============================================================
function main() {
  console.log('==============================================');
  console.log('  USDA SR Legacy → Ingredients Processor');
  console.log('==============================================\n');

  // Step 1: Read food.csv
  console.log('Step 1: Reading food.csv...');
  const foodContent = fs.readFileSync(path.join(SR_LEGACY_DIR, 'food.csv'), 'utf-8');
  const foods = parseCSV(foodContent);
  console.log(`  Total foods in SR Legacy: ${foods.length}`);

  // Step 2: Filter to relevant categories
  console.log('\nStep 2: Filtering to raw/basic ingredient categories...');
  const relevantFoods = foods.filter(f => {
    const catId = parseInt(f.food_category_id);
    return shouldInclude(f.description, catId);
  });
  console.log(`  After category + keyword filter: ${relevantFoods.length}`);

  // Step 3: Read food_nutrient.csv and build lookup
  console.log('\nStep 3: Reading food_nutrient.csv...');
  const nutrientContent = fs.readFileSync(path.join(SR_LEGACY_DIR, 'food_nutrient.csv'), 'utf-8');
  const nutrients = parseCSV(nutrientContent);
  console.log(`  Total nutrient records: ${nutrients.length}`);

  // Build nutrient lookup: fdc_id -> { calories, protein, carbs, fat, fiber, sugar, sodium }
  console.log('  Building nutrient lookup...');
  const nutrientLookup = new Map<string, Record<string, number>>();
  const relevantNutrientIds = new Set(Object.keys(NUTRIENT_MAP).map(Number));

  for (const n of nutrients) {
    const nutrientId = parseInt(n.nutrient_id);
    if (!relevantNutrientIds.has(nutrientId)) continue;

    const fdcId = n.fdc_id;
    if (!nutrientLookup.has(fdcId)) {
      nutrientLookup.set(fdcId, {});
    }
    const fieldName = NUTRIENT_MAP[nutrientId];
    nutrientLookup.get(fdcId)![fieldName] = parseFloat(n.amount) || 0;
  }
  console.log(`  Foods with nutrition data: ${nutrientLookup.size}`);

  // Step 4: Build ingredient list with deduplication
  console.log('\nStep 4: Building ingredient list with deduplication...');

  // Group by cleaned name, keep best version (highest score = most "raw")
  const nameGroups = new Map<string, { food: typeof foods[0]; score: number }>();

  for (const food of relevantFoods) {
    const cleanedName = cleanName(food.description);
    const score = scoreFood(food.description);

    if (!nameGroups.has(cleanedName)) {
      nameGroups.set(cleanedName, { food, score });
    } else {
      const existing = nameGroups.get(cleanedName)!;
      if (score > existing.score) {
        nameGroups.set(cleanedName, { food, score });
      }
    }
  }

  console.log(`  Unique ingredients after dedup: ${nameGroups.size}`);

  // Step 5: Build final ingredient objects
  console.log('\nStep 5: Building final ingredient objects...');

  interface OutputIngredient {
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

  const SRC = 'USDA FoodData Central (SR Legacy)';
  const ingredients: OutputIngredient[] = [];
  let withNutrition = 0;

  for (const [name, { food }] of nameGroups) {
    const catId = parseInt(food.food_category_id);
    const category = mapCategory(catId, food.description);
    const tags = generateTags(food.description, catId);
    const nutrition = nutrientLookup.get(food.fdc_id);

    const ingredient: OutputIngredient = {
      Name: name,
      Category: category,
      Tags: tags,
      Source: SRC,
      Calories_kcal: nutrition?.calories ?? '',
      Protein_g: nutrition?.protein ?? '',
      Carbs_g: nutrition?.carbs ?? '',
      Fat_g: nutrition?.fat ?? '',
      Fiber_g: nutrition?.fiber ?? '',
      Sugar_g: nutrition?.sugar ?? '',
      Sodium_mg: nutrition?.sodium ?? '',
    };

    if (nutrition?.calories !== undefined) withNutrition++;
    ingredients.push(ingredient);
  }

  // Sort by category, then name
  ingredients.sort((a, b) => {
    const catCmp = a.Category.localeCompare(b.Category);
    if (catCmp !== 0) return catCmp;
    return a.Name.localeCompare(b.Name);
  });

  console.log(`  Total ingredients: ${ingredients.length}`);
  console.log(`  With nutrition: ${withNutrition}`);

  // Category breakdown
  const catCounts = new Map<string, number>();
  for (const ing of ingredients) {
    catCounts.set(ing.Category, (catCounts.get(ing.Category) || 0) + 1);
  }
  console.log('\n  Category breakdown:');
  for (const [cat, count] of [...catCounts.entries()].sort()) {
    console.log(`    ${cat}: ${count}`);
  }

  // Step 6: Generate Excel
  console.log('\nStep 6: Generating Excel...');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(ingredients);

  ws['!cols'] = [
    { wch: 45 },  // Name
    { wch: 12 },  // Category
    { wch: 35 },  // Tags
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
  const summary = [
    { Field: 'Source', Value: 'USDA FoodData Central - SR Legacy (April 2018)' },
    { Field: 'URL', Value: 'https://fdc.nal.usda.gov/download-datasets/' },
    { Field: 'License', Value: 'Public Domain (CC0 1.0)' },
    { Field: 'Total foods in SR Legacy', Value: String(foods.length) },
    { Field: 'After category filter', Value: String(relevantFoods.length) },
    { Field: 'After deduplication', Value: String(ingredients.length) },
    { Field: 'With nutrition data', Value: String(withNutrition) },
    { Field: '', Value: '' },
    { Field: 'Included categories', Value: '' },
    ...Object.entries(INCLUDE_CATEGORIES).map(([id, cat]) => ({
      Field: `  Category ${id}`,
      Value: `${cat} (${foods.filter(f => f.food_category_id === id).length} items)`,
    })),
    { Field: '', Value: '' },
    { Field: 'Nutrition data', Value: 'Per 100g raw weight' },
    { Field: 'Calories', Value: 'kcal (nutrient ID 1008)' },
    { Field: 'Protein', Value: 'g (nutrient ID 1003)' },
    { Field: 'Carbohydrates', Value: 'g (nutrient ID 1005)' },
    { Field: 'Fat', Value: 'g (nutrient ID 1004)' },
    { Field: 'Fiber', Value: 'g (nutrient ID 1079)' },
    { Field: 'Sugar', Value: 'g (nutrient ID 2000)' },
    { Field: 'Sodium', Value: 'mg (nutrient ID 1093)' },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'About');

  XLSX.writeFile(wb, 'ingredients-import.xlsx');
  console.log('  ✓ ingredients-import.xlsx');

  // Step 7: Generate JSON (for API bulk import)
  console.log('\nStep 7: Generating JSON...');
  const jsonExport = {
    source: 'USDA FoodData Central - SR Legacy (April 2018)',
    license: 'Public Domain (CC0 1.0)',
    url: 'https://fdc.nal.usda.gov/download-datasets/',
    total: ingredients.length,
    ingredients: ingredients.map(i => ({
      name: i.Name,
      category: i.Category,
      tags: i.Tags,
    })),
  };

  fs.writeFileSync('ingredients-import.json', JSON.stringify(jsonExport, null, 2));
  console.log('  ✓ ingredients-import.json');

  // Save full data with nutrition (for reference)
  fs.writeFileSync('ingredients-full.json', JSON.stringify(ingredients, null, 2));
  console.log('  ✓ ingredients-full.json (with nutrition data)');

  // Final summary
  console.log('\n==============================================');
  console.log('  Processing Complete!');
  console.log('==============================================');
  console.log(`  Total ingredients: ${ingredients.length}`);
  console.log(`  With nutrition:    ${withNutrition}`);
  console.log('\n  Files generated:');
  console.log('    - ingredients-import.xlsx  (Excel with nutrition + About sheet)');
  console.log('    - ingredients-import.json  (JSON for API bulk import)');
  console.log('    - ingredients-full.json    (Full data with nutrition)');
}

main();
