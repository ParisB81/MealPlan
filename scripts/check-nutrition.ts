/**
 * check-nutrition.ts
 *
 * Finds all active recipes that are missing nutritional data.
 * Outputs a summary to the console and exports the list to Excel.
 *
 * Usage:
 *   cd "C:\00 Paris\MealPlan"
 *   "C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" scripts/check-nutrition.ts
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

const EXCEL_OUTPUT = path.join('C:', '00 Paris', 'MealPlan', 'recipes-missing-nutrition.xlsx');

async function main() {
  console.log('=== RECIPE NUTRITION CHECK ===\n');

  // Query all active recipes with their nutrition records
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    include: {
      nutrition: true,
    },
    orderBy: { title: 'asc' },
  });

  const totalActive = recipes.length;
  console.log(`Total active recipes: ${totalActive}\n`);

  // Categorize recipes
  const missingNutrition: typeof recipes = [];
  const hasNutrition: typeof recipes = [];

  for (const recipe of recipes) {
    const n = recipe.nutrition;

    // Missing = no nutrition record at all, or all fields are null/zero
    if (
      !n ||
      (
        (!n.calories || n.calories === 0) &&
        (!n.protein || n.protein === 0) &&
        (!n.carbs || n.carbs === 0) &&
        (!n.fat || n.fat === 0) &&
        (!n.fiber || n.fiber === 0) &&
        (!n.sugar || n.sugar === 0) &&
        (!n.sodium || n.sodium === 0)
      )
    ) {
      missingNutrition.push(recipe);
    } else {
      hasNutrition.push(recipe);
    }
  }

  // Further split: has at least calories vs has some data but no calories
  const withCalories = hasNutrition.filter(
    (r) => r.nutrition && r.nutrition.calories && r.nutrition.calories > 0
  );
  const withoutCalories = hasNutrition.filter(
    (r) => !r.nutrition || !r.nutrition.calories || r.nutrition.calories === 0
  );

  console.log(`With complete nutrition (at least calories): ${withCalories.length}`);
  if (withoutCalories.length > 0) {
    console.log(`With partial nutrition (some data but no calories): ${withoutCalories.length}`);
  }
  console.log(`Missing nutrition: ${missingNutrition.length}`);
  console.log(
    `\nCoverage: ${((withCalories.length / totalActive) * 100).toFixed(1)}% have calories\n`
  );

  // Print missing list
  if (missingNutrition.length > 0) {
    console.log('--- Recipes Missing Nutrition ---\n');
    console.log(
      `${'#'.padEnd(4)} ${'ID'.padEnd(28)} ${'Title'.padEnd(50)} Tags`
    );
    console.log('-'.repeat(130));

    missingNutrition.forEach((r, i) => {
      const num = String(i + 1).padEnd(4);
      const id = r.id.padEnd(28);
      const title =
        r.title.length > 48
          ? r.title.substring(0, 45) + '...'
          : r.title.padEnd(50);
      const tags = r.tags || '';
      console.log(`${num} ${id} ${title} ${tags}`);
    });

    // Export to Excel
    const rows = missingNutrition.map((r, i) => ({
      '#': i + 1,
      'Recipe ID': r.id,
      Title: r.title,
      Tags: r.tags || '',
      'Source URL': r.sourceUrl || '',
      Servings: r.servings,
      Created: r.createdAt.toISOString().split('T')[0],
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 }, // #
      { wch: 28 }, // Recipe ID
      { wch: 50 }, // Title
      { wch: 40 }, // Tags
      { wch: 60 }, // Source URL
      { wch: 10 }, // Servings
      { wch: 12 }, // Created
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Missing Nutrition');

    // Add summary sheet
    const summaryRows = [
      { Metric: 'Total Active Recipes', Value: totalActive },
      { Metric: 'With Nutrition (has calories)', Value: withCalories.length },
      {
        Metric: 'With Partial Nutrition (no calories)',
        Value: withoutCalories.length,
      },
      { Metric: 'Missing Nutrition', Value: missingNutrition.length },
      {
        Metric: 'Coverage %',
        Value: `${((withCalories.length / totalActive) * 100).toFixed(1)}%`,
      },
      {
        Metric: 'Report Date',
        Value: new Date().toISOString().split('T')[0],
      },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    XLSX.writeFile(wb, EXCEL_OUTPUT);
    console.log(`\nExported to: ${EXCEL_OUTPUT}`);
  } else {
    console.log('All active recipes have nutritional data!');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
