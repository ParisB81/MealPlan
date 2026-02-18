import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFinal() {
  const fixes: Record<string, string> = {
    'chicken breasts, cut into large chunks': 'chicken breast',
    'egg yolks (from medium eggs)': 'egg yolk',
    'eggs (medium)': 'egg',
    'gruyere cheese (grated)': 'gruyere cheese',
    'onion, thinly sliced': 'onion',
    'parsley (finely chopped)': 'parsley',
    'thyme (fresh)': 'thyme',
  };

  for (const [oldName, newName] of Object.entries(fixes)) {
    console.log(`\nProcessing: "${oldName}" -> "${newName}"`);

    // Find the messy ingredient
    const messy = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!messy) {
      console.log('  Source not found, skipping');
      continue;
    }

    // Find the clean target
    const clean = await prisma.ingredient.findUnique({ where: { name: newName } });
    if (!clean) {
      // Target doesn't exist - just rename
      await prisma.ingredient.update({
        where: { id: messy.id },
        data: { name: newName },
      });
      console.log(`  Renamed directly (target didn't exist)`);
      continue;
    }

    // Check recipe ingredients
    const recipeUsages = await prisma.recipeIngredient.count({
      where: { ingredientId: messy.id },
    });
    console.log(`  Recipe usages: ${recipeUsages}`);

    // Check shopping list items
    const shoppingUsages = await prisma.shoppingListItem.count({
      where: { ingredientId: messy.id },
    });
    console.log(`  Shopping list usages: ${shoppingUsages}`);

    // Handle shopping list items first
    if (shoppingUsages > 0) {
      const shoppingItems = await prisma.shoppingListItem.findMany({
        where: { ingredientId: messy.id },
      });

      for (const item of shoppingItems) {
        // Check if target already exists in this shopping list
        const existing = await prisma.shoppingListItem.findFirst({
          where: { shoppingListId: item.shoppingListId, ingredientId: clean.id },
        });

        if (existing) {
          // Merge quantities and delete duplicate
          await prisma.shoppingListItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
          await prisma.shoppingListItem.delete({ where: { id: item.id } });
          console.log(`  Merged shopping list item`);
        } else {
          // Update to point to clean ingredient
          await prisma.shoppingListItem.update({
            where: { id: item.id },
            data: { ingredientId: clean.id },
          });
          console.log(`  Updated shopping list item`);
        }
      }
    }

    // Handle recipe ingredients
    if (recipeUsages > 0) {
      const recipeItems = await prisma.recipeIngredient.findMany({
        where: { ingredientId: messy.id },
        include: { recipe: { select: { title: true } } },
      });

      for (const item of recipeItems) {
        const existing = await prisma.recipeIngredient.findFirst({
          where: { recipeId: item.recipeId, ingredientId: clean.id },
        });

        if (existing) {
          await prisma.recipeIngredient.delete({ where: { id: item.id } });
          console.log(`  Removed duplicate in: ${item.recipe.title}`);
        } else {
          await prisma.recipeIngredient.update({
            where: { id: item.id },
            data: { ingredientId: clean.id },
          });
          console.log(`  Remapped in: ${item.recipe.title}`);
        }
      }
    }

    // Now try to delete the messy ingredient
    try {
      await prisma.ingredient.delete({ where: { id: messy.id } });
      console.log(`  Deleted old ingredient`);
    } catch (e) {
      console.log(`  Could not delete (still has refs)`);
    }
  }

  // Final check
  const remaining = await prisma.ingredient.findMany({
    where: {
      OR: [
        { name: { contains: ',' } },
        { name: { contains: '(' } },
        { name: { contains: ')' } },
      ],
    },
  });

  console.log(`\n=== REMAINING ISSUES: ${remaining.length} ===`);
  for (const ing of remaining) {
    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ing.id } });
    console.log(`  "${ing.name}" (recipes: ${recipeCount}, shopping: ${shoppingCount})`);
  }

  await prisma.$disconnect();
}

fixFinal().catch(console.error);
