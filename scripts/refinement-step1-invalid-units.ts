/**
 * Refinement Step 1: Fix Invalid Units
 *
 * Queries all recipe ingredients, identifies those with units not in the valid list,
 * auto-fixes known mappings, and reports remaining unfixed units.
 *
 * Run with:
 *   cd "C:\00 Paris\MealPlan"
 *   "C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" scripts/refinement-step1-invalid-units.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_UNITS = new Set([
  'g', 'kg', 'mg', 'oz', 'lb', 't',
  'ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal',
  'wineglass', 'coffee cup', 'tea cup',
  'piece', 'pcs', 'unit', 'item',
  'clove', 'head', 'bulb', 'stalk', 'stick', 'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip',
  'pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop',
  'small', 'medium', 'large', 'extra-large',
  'pack', 'packet',
]);

// Mapping of invalid unit -> { newUnit, notePrefix? }
const FIX_MAP: Record<string, { newUnit: string; notePrefix?: string }> = {
  'tablespoon':  { newUnit: 'tbsp' },
  'tablespoons': { newUnit: 'tbsp' },
  'teaspoon':    { newUnit: 'tsp' },
  'teaspoons':   { newUnit: 'tsp' },
  'pound':       { newUnit: 'lb' },
  'pounds':      { newUnit: 'lb' },
  'ounce':       { newUnit: 'oz' },
  'ounces':      { newUnit: 'oz' },
  'cups':        { newUnit: 'cup' },
  'can':         { newUnit: 'piece', notePrefix: 'can' },
  'cans':        { newUnit: 'piece', notePrefix: 'can' },
  'jar':         { newUnit: 'piece', notePrefix: 'jar' },
  'whole':       { newUnit: 'piece' },
  'serving':     { newUnit: 'piece' },
  'servings':    { newUnit: 'piece' },
  'sheet':       { newUnit: 'piece' },
  'sheets':      { newUnit: 'piece' },
  'link':        { newUnit: 'piece' },
  'bag':         { newUnit: 'pack' },
  '':            { newUnit: 'piece' },
};

async function main() {
  console.log('=== Refinement Step 1: Fix Invalid Units ===\n');

  // 1. Query all recipe ingredients with related data
  const allIngredients = await prisma.recipeIngredient.findMany({
    include: {
      ingredient: { select: { name: true } },
      recipe: { select: { title: true } },
    },
  });

  console.log(`Total recipe ingredients: ${allIngredients.length}\n`);

  // 2. Find invalid units
  const invalidItems: typeof allIngredients = [];
  for (const item of allIngredients) {
    const unit = (item.unit ?? '').trim();
    if (!VALID_UNITS.has(unit)) {
      invalidItems.push(item);
    }
  }

  if (invalidItems.length === 0) {
    console.log('No invalid units found. All recipe ingredients use valid units.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${invalidItems.length} recipe ingredients with invalid units.\n`);

  // 3. Group by unit
  const byUnit = new Map<string, typeof invalidItems>();
  for (const item of invalidItems) {
    const unit = (item.unit ?? '').trim();
    const key = unit === '' ? '(empty)' : unit;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key)!.push(item);
  }

  console.log('--- Invalid units summary ---');
  const sortedUnits = [...byUnit.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [unit, items] of sortedUnits) {
    const lookupKey = (unit === '(empty)' ? '' : unit).toLowerCase();
    const fixable = FIX_MAP[lookupKey] ? 'FIXABLE' : 'UNFIXABLE';
    console.log(`  "${unit}": ${items.length} occurrence(s) [${fixable}]`);
    for (const item of items.slice(0, 5)) {
      console.log(`    - ${item.quantity} ${item.unit} ${item.ingredient.name} (recipe: "${item.recipe.title}")`);
    }
    if (items.length > 5) {
      console.log(`    ... and ${items.length - 5} more`);
    }
  }

  // 4. Auto-fix fixable units
  console.log('\n--- Applying fixes ---\n');

  let fixedCount = 0;
  let unfixedCount = 0;
  const unfixedUnits = new Map<string, number>();

  for (const item of invalidItems) {
    const rawUnit = (item.unit ?? '').trim();
    const lookupKey = rawUnit.toLowerCase();
    const fix = FIX_MAP[lookupKey];

    if (fix) {
      // Build updated notes
      let newNotes = item.notes ?? '';
      if (fix.notePrefix) {
        // Prepend "can" or "jar" to notes
        newNotes = newNotes
          ? `${fix.notePrefix}; ${newNotes}`
          : fix.notePrefix;
      }

      await prisma.recipeIngredient.update({
        where: {
          recipeId_ingredientId: {
            recipeId: item.recipeId,
            ingredientId: item.ingredientId,
          },
        },
        data: {
          unit: fix.newUnit,
          notes: newNotes || null,
        },
      });

      console.log(`  FIXED: "${rawUnit}" -> "${fix.newUnit}"${fix.notePrefix ? ` (note: "${fix.notePrefix}")` : ''} | ${item.quantity} ${item.ingredient.name} in "${item.recipe.title}"`);
      fixedCount++;
    } else {
      const key = rawUnit === '' ? '(empty)' : rawUnit;
      unfixedUnits.set(key, (unfixedUnits.get(key) ?? 0) + 1);
      unfixedCount++;
    }
  }

  // 5. Report
  console.log('\n=== Summary ===');
  console.log(`  Fixed:   ${fixedCount}`);
  console.log(`  Unfixed: ${unfixedCount}`);

  if (unfixedUnits.size > 0) {
    console.log('\n--- Remaining unfixed units ---');
    const sortedUnfixed = [...unfixedUnits.entries()].sort((a, b) => b[1] - a[1]);
    for (const [unit, count] of sortedUnfixed) {
      console.log(`  "${unit}": ${count} occurrence(s)`);
      // Show examples for unfixed
      const examples = invalidItems.filter(i => {
        const u = (i.unit ?? '').trim();
        return (u === '' ? '(empty)' : u) === unit;
      }).filter(i => !FIX_MAP[(i.unit ?? '').trim().toLowerCase()]);
      for (const ex of examples.slice(0, 3)) {
        console.log(`    - ${ex.quantity} ${ex.unit} ${ex.ingredient.name} (recipe: "${ex.recipe.title}")`);
      }
    }
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
