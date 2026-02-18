import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// More aggressive fixes for remaining problematic ingredients
const FIXES: Record<string, string> = {
  // Prep-only terms - should be merged into real ingredients or deleted
  'sliced': 'DELETE',
  'chopped': 'DELETE',
  'finely chopped': 'DELETE',
  'finely diced': 'DELETE',
  'finely minced': 'DELETE',
  'thinly sliced': 'DELETE',
  'peeled and sliced': 'DELETE',
  'peeled and diced': 'DELETE',
  'peeled and finely chopped': 'DELETE',
  'seeded and finely chopped': 'DELETE',
  'cut into 1/2-inch cubes': 'DELETE',
  'cut into chunks': 'DELETE',

  // Rice consolidation
  'cooked rice': 'rice',
  'cooked white rice': 'white rice',

  // Tomato variants
  'canned diced tomatoes': 'diced tomatoes',
  'can diced tomatoes 400gr': 'diced tomatoes',
  'fire-roasted diced tomatoes': 'diced tomatoes',
  'peeled and diced tomatoes': 'diced tomatoes',

  // Onion variants
  'chopped red onion': 'red onion',
  'diced red onion': 'red onion',
  'chopped scallion': 'scallion',
  'green onions': 'green onion',

  // Other veggies
  'diced green chiles': 'green chiles',
  'diced seedless cucumber': 'cucumber',
  'frozen chopped spinach': 'frozen spinach',
  'sliced french bread': 'french bread',

  // Broth/stock
  'cup beef broth': 'beef broth',
  'cup chicken stock': 'chicken broth',

  // Measurement prefixes - extract the ingredient
  'tablespoons fresh lemon juice': 'lemon juice',
  'teaspoon cumin': 'cumin',
  'teaspoon salt': 'salt',
  'teaspoons kosher salt': 'kosher salt',
  'teaspoons worcestershire sauce': 'worcestershire sauce',
  'tablespoon granulated sugar': 'granulated sugar',
  'tablespoon salt': 'salt',
  'tablespoon tomato paste': 'tomato paste',
  'teaspoon baking soda': 'baking soda',
  'teaspoon cinnamon': 'cinnamon',
  'teaspoon corn starch': 'corn starch',
  'teaspoon paprika': 'paprika',
  '½ teaspoon granulated garlic': 'granulated garlic',
  '½ teaspoon onion powder': 'onion powder',
  '¼ teaspoon crushed red pepper': 'red pepper flakes',
  '⅓ cup dry white wine or reduced sodium chicken broth': 'white wine',

  // Salt/pepper to taste
  'kosher salt to taste': 'kosher salt',
  'salt to taste': 'salt',
  'freshly ground black pepper to taste': 'black pepper',
  'salt and freshly ground black pepper to taste': 'salt and pepper',
  'salt and ground black pepper to taste': 'salt and pepper',
  'salt and ground pepper to taste': 'salt and pepper',
  'salt and pepper to taste': 'salt and pepper',

  // Rigatoni
  'uncooked rigatoni': 'rigatoni',
};

async function refinePhase2() {
  console.log('=== INGREDIENT REFINEMENT PHASE 2 ===\n');

  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  console.log(`Total ingredients: ${ingredients.length}\n`);

  // Build map
  const existingNames = new Map<string, string>();
  for (const ing of ingredients) {
    existingNames.set(ing.name.toLowerCase(), ing.id);
  }

  let fixed = 0, deleted = 0, merged = 0;

  for (const [oldName, action] of Object.entries(FIXES)) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!ingredient) continue;

    console.log(`Processing: "${oldName}"`);

    if (action === 'DELETE') {
      // Check usages
      const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ingredient.id } });
      const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ingredient.id } });

      if (recipeCount === 0 && shoppingCount === 0) {
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        console.log(`  DELETED (unused)`);
        deleted++;
      } else {
        // These are garbage ingredients used in recipes - need to find what they should be
        // For now, list them for manual intervention
        console.log(`  IN USE (${recipeCount} recipes, ${shoppingCount} shopping) - finding recipes...`);

        const usages = await prisma.recipeIngredient.findMany({
          where: { ingredientId: ingredient.id },
          include: { recipe: { select: { title: true } } },
        });

        for (const u of usages) {
          console.log(`    - In recipe: "${u.recipe.title}"`);
        }

        // Delete the recipe ingredient entries since they're garbage
        if (recipeCount > 0) {
          await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ingredient.id } });
          console.log(`  Removed ${recipeCount} garbage recipe ingredient entries`);
        }
        if (shoppingCount > 0) {
          await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ingredient.id } });
          console.log(`  Removed ${shoppingCount} garbage shopping list entries`);
        }
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        console.log(`  DELETED ingredient`);
        deleted++;
      }
      continue;
    }

    // Normal fix - merge or rename
    const targetId = existingNames.get(action.toLowerCase());

    if (targetId && targetId !== ingredient.id) {
      // Merge into existing
      await mergeIngredient(ingredient.id, targetId, oldName, action);
      merged++;
    } else if (!targetId) {
      // Rename
      try {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { name: action.toLowerCase() },
        });
        existingNames.set(action.toLowerCase(), ingredient.id);
        console.log(`  RENAMED -> "${action}"`);
        fixed++;
      } catch (e) {
        console.log(`  ERROR renaming`);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Renamed: ${fixed}`);
  console.log(`Merged: ${merged}`);
  console.log(`Deleted: ${deleted}`);

  // Final count
  const finalCount = await prisma.ingredient.count();
  console.log(`\nFinal ingredient count: ${finalCount}`);

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
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
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

  // Delete source
  try {
    await prisma.ingredient.delete({ where: { id: sourceId } });
    console.log(`  Merged and deleted`);
  } catch (e) {
    console.log(`  Merged but could not delete`);
  }
}

refinePhase2().catch(console.error);
