import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Direct ingredient fixes: messy name -> clean name
const DIRECT_FIXES: Record<string, string> = {
  // Malformed/fragment ingredients - these are garbage and should be deleted or merged
  'and cooled rice': 'cooked rice',
  'and half': 'half and half',
  'and pepper to taste': 'salt and pepper',
  'beaten': 'egg',
  'cayenne pepper to taste': 'cayenne pepper',
  'chopped': 'DELETE', // Mark for deletion - not a real ingredient
  'chopped cilantro': 'cilantro',
  'chopped fresh parsley': 'parsley',
  'finely minced': 'DELETE',
  'extract': 'vanilla extract',
  'chuck': 'beef chuck',

  // Consolidate plurals to singular
  'carrots': 'carrot',
  'eggplants': 'eggplant',
  'beef bouillon cubes': 'beef bouillon cube',
  'chicken bouillon cubes': 'chicken bouillon cube',
  'coriander seeds': 'coriander seed',

  // Consolidate stock/broth variants
  'chicken stock': 'chicken broth',
  'chicken stock pot': 'chicken broth',

  // Consolidate olive oil variants
  'virgin olive oil': 'olive oil',
  'extra virgin olive oil': 'olive oil',

  // Consolidate tomato variants
  'canned tomatoes': 'canned diced tomatoes',

  // Consolidate cheese variants
  'cheddar': 'cheddar cheese',

  // Consolidate broccoli
  'broccoli florets': 'broccoli',

  // Misc fixes
  'coleslaw mix': 'coleslaw',
  'french fries': 'frozen french fries',
};

// Patterns to find and fix - ingredients containing these terms need attention
const PROBLEM_PATTERNS = [
  'chopped',
  'cooked',
  'crushed',
  'cup ',
  'cups ',
  'cut into',
  'diced',
  'minced',
  'sliced',
];

async function analyzeAndFix() {
  console.log('=== INGREDIENT REFINEMENT SCRIPT ===\n');

  // Get all ingredients
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`Total ingredients: ${ingredients.length}\n`);

  // Build existing names map
  const existingNames = new Map<string, string>();
  for (const ing of ingredients) {
    existingNames.set(ing.name.toLowerCase(), ing.id);
  }

  // Track stats
  let fixedCount = 0;
  let deletedCount = 0;
  let mergedCount = 0;
  const toReview: string[] = [];

  // PHASE 1: Apply direct fixes
  console.log('=== PHASE 1: APPLYING DIRECT FIXES ===\n');

  for (const [oldName, newName] of Object.entries(DIRECT_FIXES)) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!ingredient) continue;

    console.log(`Processing: "${oldName}"`);

    if (newName === 'DELETE') {
      // Check if it's used anywhere
      const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ingredient.id } });
      const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ingredient.id } });

      if (recipeCount === 0 && shoppingCount === 0) {
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        console.log(`  DELETED (unused garbage ingredient)`);
        deletedCount++;
      } else {
        console.log(`  KEPT (in use: ${recipeCount} recipes, ${shoppingCount} shopping items) - needs manual review`);
        toReview.push(oldName);
      }
      continue;
    }

    // Check if target exists
    const targetId = existingNames.get(newName.toLowerCase());

    if (targetId && targetId !== ingredient.id) {
      // Target exists - merge all usages
      await mergeIngredient(ingredient.id, targetId, oldName, newName);
      mergedCount++;
    } else if (!targetId) {
      // Target doesn't exist - rename
      try {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { name: newName.toLowerCase() },
        });
        existingNames.set(newName.toLowerCase(), ingredient.id);
        console.log(`  RENAMED: -> "${newName}"`);
        fixedCount++;
      } catch (e) {
        console.log(`  ERROR renaming`);
      }
    }
  }

  // PHASE 2: Find ingredients with problem patterns
  console.log('\n=== PHASE 2: SCANNING FOR PROBLEM PATTERNS ===\n');

  for (const ingredient of ingredients) {
    const name = ingredient.name;

    for (const pattern of PROBLEM_PATTERNS) {
      if (name.includes(pattern)) {
        // Check if already processed
        const stillExists = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
        if (!stillExists) continue;

        // Try to extract the base ingredient
        const cleanedName = extractBaseIngredient(name, pattern);

        if (cleanedName && cleanedName !== name) {
          console.log(`Found: "${name}" -> suggest: "${cleanedName}"`);

          const targetId = existingNames.get(cleanedName.toLowerCase());
          if (targetId && targetId !== ingredient.id) {
            // Target exists - merge
            await mergeIngredient(ingredient.id, targetId, name, cleanedName);
            mergedCount++;
          } else if (cleanedName.length > 2) {
            // Rename if it makes sense
            const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ingredient.id } });
            if (recipeCount === 0) {
              // Not used - just delete
              try {
                await prisma.ingredient.delete({ where: { id: ingredient.id } });
                console.log(`  DELETED (unused)`);
                deletedCount++;
              } catch (e) {
                // Has shopping list refs
                toReview.push(name);
              }
            } else {
              toReview.push(name);
            }
          }
        }
        break;
      }
    }
  }

  // PHASE 3: List remaining issues for review
  console.log('\n=== PHASE 3: ITEMS NEEDING MANUAL REVIEW ===\n');

  // Re-fetch ingredients after changes
  const remainingIngredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  const stillProblematic: { name: string; usages: number }[] = [];

  for (const ing of remainingIngredients) {
    const isProblematic = PROBLEM_PATTERNS.some(p => ing.name.includes(p)) ||
      ing.name.startsWith('and ') ||
      ing.name.includes(' to taste') ||
      /^\d/.test(ing.name) ||
      ing.name.includes('tablespoon') ||
      ing.name.includes('teaspoon');

    if (isProblematic) {
      const count = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      stillProblematic.push({ name: ing.name, usages: count });
    }
  }

  if (stillProblematic.length > 0) {
    console.log('Still need attention:');
    for (const item of stillProblematic.sort((a, b) => b.usages - a.usages)) {
      console.log(`  "${item.name}" (${item.usages} usages)`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Fixed/Renamed: ${fixedCount}`);
  console.log(`Merged: ${mergedCount}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Need review: ${stillProblematic.length}`);

  await prisma.$disconnect();
}

async function mergeIngredient(sourceId: string, targetId: string, sourceName: string, targetName: string) {
  console.log(`  MERGING into "${targetName}"...`);

  // Update recipe ingredients
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId: sourceId },
  });

  for (const ri of recipeIngredients) {
    const existing = await prisma.recipeIngredient.findFirst({
      where: { recipeId: ri.recipeId, ingredientId: targetId },
    });

    if (existing) {
      // Already has target - delete source
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
      // Update to target
      await prisma.recipeIngredient.update({
        where: { id: ri.id },
        data: { ingredientId: targetId },
      });
    }
  }

  // Update shopping list items
  const shoppingItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: sourceId },
  });

  for (const item of shoppingItems) {
    const existing = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId: item.shoppingListId, ingredientId: targetId },
    });

    if (existing) {
      await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
      await prisma.shoppingListItem.delete({ where: { id: item.id } });
    } else {
      await prisma.shoppingListItem.update({
        where: { id: item.id },
        data: { ingredientId: targetId },
      });
    }
  }

  // Delete source ingredient
  try {
    await prisma.ingredient.delete({ where: { id: sourceId } });
    console.log(`  Merged and deleted "${sourceName}"`);
  } catch (e) {
    console.log(`  Merged but could not delete (has other refs)`);
  }
}

function extractBaseIngredient(name: string, pattern: string): string | null {
  // Try to extract the base ingredient by removing the pattern and cleaning up
  let cleaned = name;

  // Common patterns
  const removals = [
    /^chopped\s+/i,
    /\s+chopped$/i,
    /^cooked\s+/i,
    /\s+cooked$/i,
    /^crushed\s+/i,
    /\s+crushed$/i,
    /^diced\s+/i,
    /\s+diced$/i,
    /^minced\s+/i,
    /\s+minced$/i,
    /^sliced\s+/i,
    /\s+sliced$/i,
    /^\d+\s*cups?\s+/i,
    /^\d+\/\d+\s*cups?\s+/i,
    /,?\s*cut into.*$/i,
  ];

  for (const regex of removals) {
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned.trim();

  // Don't return if too short or same as original
  if (cleaned.length < 3 || cleaned === name) {
    return null;
  }

  return cleaned;
}

analyzeAndFix().catch(console.error);
