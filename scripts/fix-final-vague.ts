import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFinal() {
  console.log('=== FIXING FINAL VAGUE INGREDIENTS ===\n');

  // Get all ingredients for lookup
  const allIngredients = await prisma.ingredient.findMany();
  const ingredientMap = new Map<string, string>();
  for (const ing of allIngredients) {
    ingredientMap.set(ing.name.toLowerCase(), ing.id);
  }

  // 1. Fix "powder" in Chicken Piccata Meatballs -> garlic powder
  console.log('1. Fixing "powder" in Chicken Piccata Meatballs...');

  const powderIng = await prisma.ingredient.findUnique({ where: { name: 'powder' } });
  if (powderIng) {
    const powderUsages = await prisma.recipeIngredient.findMany({
      where: { ingredientId: powderIng.id },
      include: { recipe: { select: { id: true, title: true } } },
    });

    for (const usage of powderUsages) {
      console.log(`  Processing: ${usage.recipe.title}`);

      // Get or create garlic powder
      let garlicPowderId = ingredientMap.get('garlic powder');
      if (!garlicPowderId) {
        const newIng = await prisma.ingredient.create({
          data: { name: 'garlic powder' },
        });
        garlicPowderId = newIng.id;
        ingredientMap.set('garlic powder', garlicPowderId);
        console.log(`  Created: "garlic powder"`);
      }

      // Check if recipe already has garlic powder
      const existingGarlicPowder = await prisma.recipeIngredient.findFirst({
        where: { recipeId: usage.recipeId, ingredientId: garlicPowderId },
      });

      if (existingGarlicPowder) {
        // Recipe already has garlic powder - just delete the "powder" entry
        await prisma.recipeIngredient.delete({ where: { id: usage.id } });
        console.log(`  Removed duplicate "powder" (recipe already has garlic powder)`);
      } else {
        // Update to garlic powder
        await prisma.recipeIngredient.update({
          where: { id: usage.id },
          data: { ingredientId: garlicPowderId },
        });
        console.log(`  Updated: "powder" -> "garlic powder"`);
      }
    }
  }

  // 2. Fix "oil" in shopping list items -> olive oil
  console.log('\n2. Fixing "oil" in shopping list items...');

  const oilIng = await prisma.ingredient.findUnique({ where: { name: 'oil' } });
  if (oilIng) {
    const oilShoppingItems = await prisma.shoppingListItem.findMany({
      where: { ingredientId: oilIng.id },
      include: { shoppingList: { select: { id: true, name: true } } },
    });

    for (const item of oilShoppingItems) {
      console.log(`  Shopping list: ${item.shoppingList.name}`);

      // Get olive oil ID
      let oliveOilId = ingredientMap.get('olive oil');
      if (!oliveOilId) {
        const newIng = await prisma.ingredient.create({
          data: { name: 'olive oil' },
        });
        oliveOilId = newIng.id;
        ingredientMap.set('olive oil', oliveOilId);
        console.log(`  Created: "olive oil"`);
      }

      // Check if shopping list already has olive oil with same unit
      const existingOliveOil = await prisma.shoppingListItem.findFirst({
        where: {
          shoppingListId: item.shoppingListId,
          ingredientId: oliveOilId,
          unit: item.unit,
        },
      });

      if (existingOliveOil) {
        // Combine quantities
        await prisma.shoppingListItem.update({
          where: { id: existingOliveOil.id },
          data: { quantity: existingOliveOil.quantity + item.quantity },
        });
        await prisma.shoppingListItem.delete({ where: { id: item.id } });
        console.log(`  Merged "oil" into existing "olive oil" entry`);
      } else {
        // Update to olive oil
        await prisma.shoppingListItem.update({
          where: { id: item.id },
          data: { ingredientId: oliveOilId },
        });
        console.log(`  Updated: "oil" -> "olive oil"`);
      }
    }
  }

  // 3. Delete unused vague ingredients
  console.log('\n3. Cleaning up unused vague ingredients...');
  const vagueNames = ['powder', 'paste', 'sauce', 'oil', 'juice', 'broth', 'stock', 'seeds', 'wine'];

  for (const name of vagueNames) {
    const ing = await prisma.ingredient.findUnique({ where: { name } });
    if (!ing) continue;

    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ing.id } });

    if (recipeCount === 0 && shoppingCount === 0) {
      await prisma.ingredient.delete({ where: { id: ing.id } });
      console.log(`  Deleted: "${name}"`);
    } else {
      console.log(`  Kept "${name}" - still has ${recipeCount} recipe(s), ${shoppingCount} shopping item(s)`);
    }
  }

  console.log('\n=== DONE ===');
  await prisma.$disconnect();
}

fixFinal().catch(console.error);
