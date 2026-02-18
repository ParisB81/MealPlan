import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const TAG_CATEGORIES: Record<string, string[]> = {
  Meal: [
    'Appetizers / Starters', 'Baking & Pastry', 'Breakfast', 'Brunch', 'Desserts',
    'Drinks / Beverages', 'Main Dishes', 'Salads', 'Sauces & Condiments', 'Side Dishes',
    'Snacks', 'Soups', 'Dips', 'Broths',
  ],
  Base: [
    'Beef', 'Bread/ Pita/ Sandwitch', 'Cheese', 'Chicken', 'Chocolate', 'Dairy', 'Eggs',
    'Fish', 'Fresh', 'Lamb / Goat', 'Legumes', 'Mixed / Assorted', 'Mushrooms', 'Pasta',
    'Pork', 'Rice & Grains', 'Salad', 'Seafood', 'Tofu / Soy', 'Turkey', 'Vegetables',
    'Potatoes', 'Pizza', 'Bowls', 'Seasonings/ Spices', 'Pastry', 'Dry Nuts',
  ],
  Duration: [
    'Under 15 minutes', '15–30 minutes', '30–60 minutes', 'Over 60 minutes',
  ],
  Country: [
    'Balkan', 'Greek', 'Turkish', 'Spanish', 'Italian', 'French', 'Portuguese', 'German',
    'International', 'Georgian', 'Armenian', 'Moroccan', 'Egyptian', 'Lebanese', 'Iranian',
    'Indian', 'Chinese', 'Japanese', 'Vietnamese', 'Thai', 'Chilean', 'American', 'Brazilian',
    'Peruvian', 'Mexican',
  ],
  Store: [
    'Freezer-friendly', 'Leftovers-friendly', 'Make-ahead', 'One-pot meals',
  ],
  Method: [
    'Air fryer', 'Baked', 'Boiled', 'Braised', 'Fried', 'Grilled', 'Pan-fried',
    'Pressure cooker', 'Raw / No-cook', 'Roasted', 'Slow-cooked', 'Sous-vide', 'Steamed', 'Stewed',
  ],
};

const categoryTagSets: Record<string, Set<string>> = {};
for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
  categoryTagSets[cat] = new Set(tags.map(t => t.toLowerCase()));
}

const CATEGORY_NAMES = Object.keys(TAG_CATEGORIES);

interface RecipeAnalysis {
  id: string;
  title: string;
  tags: string;
  sourceUrl: string | null;
  recipeTags: string[];
  missingCategories: string[];
  presentCategories: string[];
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: { id: true, title: true, tags: true, sourceUrl: true },
    orderBy: { title: 'asc' },
  });

  console.log('Total active recipes: ' + recipes.length + '\n');

  const analyses: RecipeAnalysis[] = [];

  for (const recipe of recipes) {
    const rawTags = recipe.tags
      ? recipe.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const lowerTags = rawTags.map(t => t.toLowerCase());

    const missingCategories: string[] = [];
    const presentCategories: string[] = [];

    for (const cat of CATEGORY_NAMES) {
      const tagSet = categoryTagSets[cat];
      const hasMatch = lowerTags.some(t => tagSet.has(t));
      if (hasMatch) {
        presentCategories.push(cat);
      } else {
        missingCategories.push(cat);
      }
    }

    analyses.push({
      id: recipe.id,
      title: recipe.title,
      tags: recipe.tags || '',
      sourceUrl: recipe.sourceUrl,
      recipeTags: rawTags,
      missingCategories,
      presentCategories,
    });
  }

  // Console summary
  console.log('=== PER-CATEGORY COVERAGE ===\n');
  console.log(
    'Category'.padEnd(12) +
    'Has Tag'.padStart(10) +
    'Missing'.padStart(10) +
    'Coverage'.padStart(10)
  );
  console.log('-'.repeat(42));

  const summaryRows: { category: string; hasTag: number; missing: number; coverage: string }[] = [];

  for (const cat of CATEGORY_NAMES) {
    const hasTag = analyses.filter(a => a.presentCategories.includes(cat)).length;
    const missing = analyses.length - hasTag;
    const pct = ((hasTag / analyses.length) * 100).toFixed(1) + '%';
    summaryRows.push({ category: cat, hasTag, missing, coverage: pct });
    console.log(
      cat.padEnd(12) +
      String(hasTag).padStart(10) +
      String(missing).padStart(10) +
      pct.padStart(10)
    );
  }

  const recipesWithMissing = analyses
    .filter(a => a.missingCategories.length > 0)
    .sort((a, b) => b.missingCategories.length - a.missingCategories.length);

  console.log('\n=== RECIPES WITH MISSING CATEGORIES ===');
  console.log(recipesWithMissing.length + ' of ' + analyses.length + ' recipes are missing at least one category.\n');

  const top = recipesWithMissing.slice(0, 20);
  for (const r of top) {
    console.log('  [' + r.missingCategories.length + ' missing] ' + r.title);
    console.log('    Missing: ' + r.missingCategories.join(', '));
    console.log('    Tags: ' + (r.tags || '(none)'));
  }
  if (recipesWithMissing.length > 20) {
    console.log('  ... and ' + (recipesWithMissing.length - 20) + ' more (see Excel report)');
  }

  console.log('\n=== MISSING PER CATEGORY (counts) ===\n');
  for (const cat of CATEGORY_NAMES) {
    const missing = analyses.filter(a => a.missingCategories.includes(cat));
    console.log('  ' + cat + ': ' + missing.length + ' recipes missing');
  }

  // Export to Excel
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Category', 'Has Tag', 'Missing', 'Total', 'Coverage %'],
    ...summaryRows.map(r => [r.category, r.hasTag, r.missing, analyses.length, r.coverage]),
    [],
    ['Total Active Recipes', analyses.length],
    ['Recipes Missing At Least 1 Category', recipesWithMissing.length],
    ['Fully Tagged Recipes', analyses.length - recipesWithMissing.length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  const missingData: any[][] = [
    ['Recipe Title', 'Missing Categories', 'Num Missing', 'Current Tags', 'Recipe ID'],
    ...recipesWithMissing.map(r => [
      r.title,
      r.missingCategories.join(', '),
      r.missingCategories.length,
      r.tags || '(none)',
      r.id,
    ]),
  ];
  const missingSheet = XLSX.utils.aoa_to_sheet(missingData);
  missingSheet['!cols'] = [
    { wch: 40 }, { wch: 45 }, { wch: 12 }, { wch: 60 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, missingSheet, 'Missing Tags');

  const perCatRows: any[][] = [['Category', 'Recipe Title', 'Current Tags', 'Recipe ID']];
  for (const cat of CATEGORY_NAMES) {
    const missing = analyses
      .filter(a => a.missingCategories.includes(cat))
      .sort((a, b) => a.title.localeCompare(b.title));
    for (const r of missing) {
      perCatRows.push([cat, r.title, r.tags || '(none)', r.id]);
    }
  }
  const perCatSheet = XLSX.utils.aoa_to_sheet(perCatRows);
  perCatSheet['!cols'] = [
    { wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, perCatSheet, 'By Category');

  const outputPath = path.join('C:\\00 Paris\\MealPlan', 'tag-coverage-report.xlsx');
  XLSX.writeFile(wb, outputPath);
  console.log('\nExcel report saved to: ' + outputPath);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
