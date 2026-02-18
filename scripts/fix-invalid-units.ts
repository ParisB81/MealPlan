import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid units from validUnits.ts
const VALID_UNITS = [
  'g', 'kg', 'mg', 'oz', 'lb', 't',
  'ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal',
  'wineglass', 'coffee cup', 'tea cup',
  'piece', 'pcs', 'unit', 'item', 'clove', 'head', 'bulb', 'stalk', 'stick',
  'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip',
  'pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop',
  'small', 'medium', 'large', 'extra-large',
  'pack', 'packet',
];

// Unit normalization map
const UNIT_MAP: Record<string, string> = {
  // Long-form to abbreviation
  'tablespoon': 'tbsp',
  'tablespoon(s)': 'tbsp',
  'teaspoon': 'tsp',
  'teaspoon(s)': 'tsp',
  'clove(s)': 'clove',
  'kilo': 'kg',
  // Greek
  'στικ': 'stick',
  // Fractions (these are likely errors - quantity should be fractional)
  '1/2': 'piece',  // Will need to multiply quantity by 0.5
  '1/4': 'piece',  // Will need to multiply quantity by 0.25
  '½': 'piece',    // Will need to multiply quantity by 0.5
  // Modifiers - map to base unit
  'heaping': 'tbsp',   // heaping usually applies to tbsp
  'level': 'tsp',      // level usually applies to tsp
  // Other
  'sheets': 'piece',
  'slices': 'slice',
  'ribs': 'stalk',     // celery ribs = stalks
};

// Pattern: can sizes like "(14", "(15", "(28" - these are ounce cans
// Format is typically "(14 oz)" or "(14-ounce)" - unit should be "piece" (1 can)
const CAN_SIZE_PATTERN = /^\((\d+\.?\d*)/;

// Pattern: ingredient name in unit field
// These need the unit field cleaned and ingredient name potentially updated
const INGREDIENT_PATTERNS: Record<string, { newUnit: string; appendToName?: string }> = {
  'avocado': { newUnit: 'piece' },
  'avocado,': { newUnit: 'piece' },
  'bay': { newUnit: 'leaf', appendToName: ' leaf' },  // bay -> bay leaf
  'carrots,': { newUnit: 'piece' },
  'cucumber,': { newUnit: 'piece' },
  'eggs,': { newUnit: 'piece' },
  'green': { newUnit: 'piece' },  // green onion, green pepper
  'hoagie': { newUnit: 'piece' },  // hoagie roll
  'jalapeno': { newUnit: 'piece' },
  'jalapeno,': { newUnit: 'piece' },
  'jalapenos,': { newUnit: 'piece' },
  'lemon,': { newUnit: 'piece' },
  'onion,': { newUnit: 'piece' },
  'orange': { newUnit: 'piece' },
  'pita': { newUnit: 'piece' },
  'potatoes,': { newUnit: 'piece' },
  'red': { newUnit: 'piece' },  // red onion, red pepper
  'red,': { newUnit: 'piece' },
  'roma': { newUnit: 'piece' },  // roma tomato
  'saltine': { newUnit: 'piece' },
  'shallots,': { newUnit: 'piece' },
  'skinless,': { newUnit: 'piece' },  // chicken breast
  'sweet': { newUnit: 'piece' },  // sweet potato
  'thick': { newUnit: 'slice' },
  'white': { newUnit: 'piece' },  // white onion
  'yellow': { newUnit: 'piece' },  // yellow onion
  'zucchini,': { newUnit: 'piece' },
  'zucchinis,': { newUnit: 'piece' },
  'bone-in,': { newUnit: 'piece' },
  'cooked': { newUnit: 'cup' },  // cooked rice/pasta
  'fresh': { newUnit: 'sprig' },  // fresh herbs
};

interface FixAction {
  recipeIngredientId: string;
  recipeTitle: string;
  ingredientId: string;
  ingredientName: string;
  oldUnit: string;
  oldQuantity: number;
  newUnit: string;
  newQuantity: number;
  newIngredientName?: string;
  notes?: string;
  action: string;
}

async function fixInvalidUnits() {
  console.log('Fetching all recipe ingredients...');

  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: {
      recipe: { select: { id: true, title: true } },
      ingredient: { select: { id: true, name: true } },
    },
  });

  console.log(`Found ${recipeIngredients.length} total recipe ingredients`);

  const fixes: FixAction[] = [];
  const skipped: { unit: string; ingredient: string; recipe: string }[] = [];

  for (const ri of recipeIngredients) {
    const unit = ri.unit;
    const unitLower = unit.toLowerCase();

    // Skip if already valid
    if (VALID_UNITS.includes(unitLower)) {
      continue;
    }

    let fix: Partial<FixAction> = {
      recipeIngredientId: ri.id,
      recipeTitle: ri.recipe.title,
      ingredientId: ri.ingredient.id,
      ingredientName: ri.ingredient.name,
      oldUnit: unit,
      oldQuantity: ri.quantity,
      newQuantity: ri.quantity,
    };

    // Check for direct unit mapping
    if (UNIT_MAP[unitLower]) {
      fix.newUnit = UNIT_MAP[unitLower];
      fix.action = `Map "${unit}" → "${fix.newUnit}"`;

      // Handle fraction units - adjust quantity
      if (unitLower === '1/2' || unitLower === '½') {
        fix.newQuantity = ri.quantity * 0.5;
        fix.action += ` (qty × 0.5)`;
      } else if (unitLower === '1/4') {
        fix.newQuantity = ri.quantity * 0.25;
        fix.action += ` (qty × 0.25)`;
      }

      fixes.push(fix as FixAction);
      continue;
    }

    // Check for can size pattern
    const canMatch = unit.match(CAN_SIZE_PATTERN);
    if (canMatch) {
      // Extract the ounce size and add to notes
      const ozSize = canMatch[1];
      fix.newUnit = 'piece';
      fix.notes = `${ozSize} oz can`;
      fix.action = `Can size "${unit}" → "piece" (note: ${ozSize} oz can)`;
      fixes.push(fix as FixAction);
      continue;
    }

    // Check for ingredient in unit field
    if (INGREDIENT_PATTERNS[unitLower]) {
      const pattern = INGREDIENT_PATTERNS[unitLower];
      fix.newUnit = pattern.newUnit;
      fix.action = `Ingredient-in-unit "${unit}" → "${fix.newUnit}"`;

      if (pattern.appendToName) {
        // Check if ingredient name already has this suffix
        if (!ri.ingredient.name.toLowerCase().includes(pattern.appendToName.trim().toLowerCase())) {
          fix.newIngredientName = ri.ingredient.name + pattern.appendToName;
          fix.action += ` (rename ingredient to "${fix.newIngredientName}")`;
        }
      }

      fixes.push(fix as FixAction);
      continue;
    }

    // Unknown pattern - skip and log
    skipped.push({
      unit,
      ingredient: ri.ingredient.name,
      recipe: ri.recipe.title,
    });
  }

  console.log(`\nFound ${fixes.length} fixable entries`);
  console.log(`Skipped ${skipped.length} entries (unknown patterns)`);

  if (skipped.length > 0) {
    console.log('\n=== SKIPPED ENTRIES (need manual review) ===');
    const uniqueSkipped = [...new Set(skipped.map(s => s.unit))];
    uniqueSkipped.forEach(unit => {
      const examples = skipped.filter(s => s.unit === unit).slice(0, 2);
      console.log(`  "${unit}": ${examples.map(e => e.ingredient).join(', ')}`);
    });
  }

  // Group fixes by action type for summary
  console.log('\n=== FIX SUMMARY ===');
  const actionGroups = fixes.reduce((acc, fix) => {
    const key = fix.action.split(' (')[0]; // Remove notes for grouping
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(actionGroups)
    .sort((a, b) => b[1] - a[1])
    .forEach(([action, count]) => {
      console.log(`  ${action}: ${count}`);
    });

  // Apply fixes
  console.log('\n=== APPLYING FIXES ===');
  let successCount = 0;
  let errorCount = 0;

  for (const fix of fixes) {
    try {
      // Build update data
      const updateData: any = {
        unit: fix.newUnit,
        quantity: Math.round(fix.newQuantity * 100) / 100, // Round to 2 decimals
      };

      // Add notes if provided (append to existing notes)
      if (fix.notes) {
        const existingNotes = await prisma.recipeIngredient.findUnique({
          where: { id: fix.recipeIngredientId },
          select: { notes: true },
        });
        updateData.notes = existingNotes?.notes
          ? `${existingNotes.notes}; ${fix.notes}`
          : fix.notes;
      }

      // Update the recipe ingredient
      await prisma.recipeIngredient.update({
        where: { id: fix.recipeIngredientId },
        data: updateData,
      });

      // If we need to rename the ingredient, check if target name exists
      if (fix.newIngredientName) {
        const newNameLower = fix.newIngredientName.toLowerCase().trim();
        const existingIngredient = await prisma.ingredient.findUnique({
          where: { name: newNameLower },
        });

        if (existingIngredient) {
          // Target ingredient exists - update recipe ingredient to point to it
          await prisma.recipeIngredient.update({
            where: { id: fix.recipeIngredientId },
            data: { ingredientId: existingIngredient.id },
          });
        } else {
          // Rename the current ingredient (only if not used elsewhere with different context)
          const usageCount = await prisma.recipeIngredient.count({
            where: { ingredientId: fix.ingredientId },
          });

          if (usageCount === 1) {
            // Only used once, safe to rename
            await prisma.ingredient.update({
              where: { id: fix.ingredientId },
              data: { name: newNameLower },
            });
          } else {
            // Used elsewhere - create new ingredient and update reference
            const newIngredient = await prisma.ingredient.create({
              data: { name: newNameLower },
            });
            await prisma.recipeIngredient.update({
              where: { id: fix.recipeIngredientId },
              data: { ingredientId: newIngredient.id },
            });
          }
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Error fixing ${fix.ingredientName} in ${fix.recipeTitle}:`, error);
      errorCount++;
    }
  }

  console.log(`\nCompleted: ${successCount} fixed, ${errorCount} errors`);

  // Verify remaining invalid units
  const remaining = await prisma.recipeIngredient.findMany({
    where: {
      NOT: {
        unit: { in: VALID_UNITS },
      },
    },
    include: {
      ingredient: { select: { name: true } },
    },
  });

  console.log(`\nRemaining invalid units: ${remaining.length}`);
  if (remaining.length > 0) {
    const uniqueRemaining = [...new Set(remaining.map(r => r.unit))];
    console.log('Unique remaining invalid units:', uniqueRemaining);
  }

  await prisma.$disconnect();
}

fixInvalidUnits().catch(console.error);
