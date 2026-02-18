import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping from problematic names to correct names
const INGREDIENT_FIXES: Record<string, string> = {
  // Plurals -> singular
  carrots: 'carrot',
  'chili peppers': 'chili pepper',
  corns: 'corn',
  'cumin seeds': 'cumin seed',
  eggs: 'egg',
  'green bell peppers': 'green bell pepper',
  leeks: 'leek',
  'pita breads': 'pita bread',
  'red apples': 'red apple',
  'red bell peppers': 'red bell pepper',
  'spring onions': 'spring onion',
  'vanilla pods': 'vanilla pod',
  'yellow bell peppers': 'yellow bell pepper',
  zucchinis: 'zucchini',
  tomatoes: 'tomato',
  potatoes: 'potato',

  // Parentheses cleanup
  'cod ((fresh or frozen), boneless)': 'cod',
  'lime(s)': 'lime',

  // Percentage cleanup
  'heavy cream 35%': 'heavy cream',

  // "homemade" cleanup
  'homemade ketchup': 'ketchup',
  'homemade mayonnaise': 'mayonnaise',

  // "or" cleanup - pick the first option
  'green onion or cilantro': 'green onion',
  'lavash or pita bread': 'pita bread',

  // Vague names
  stock: 'vegetable stock',
};

async function fixIngredients() {
  console.log('=== FIXING INGREDIENT NAMES ===\n');

  for (const [oldName, newName] of Object.entries(INGREDIENT_FIXES)) {
    const oldIng = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!oldIng) {
      console.log(`  Skipping "${oldName}" - not found`);
      continue;
    }

    // Check if the new name already exists
    let newIng = await prisma.ingredient.findUnique({ where: { name: newName } });

    if (newIng) {
      // Merge: update all recipe ingredients to use the existing ingredient, then delete old
      console.log(`  Merging "${oldName}" -> "${newName}" (existing)`);

      // Get all usages of the old ingredient
      const usages = await prisma.recipeIngredient.findMany({
        where: { ingredientId: oldIng.id },
      });

      for (const usage of usages) {
        // Check if recipe already has the new ingredient
        const existingUsage = await prisma.recipeIngredient.findFirst({
          where: { recipeId: usage.recipeId, ingredientId: newIng.id },
        });

        if (existingUsage) {
          // Combine quantities if same unit, otherwise just delete the duplicate
          if (existingUsage.unit === usage.unit) {
            await prisma.recipeIngredient.update({
              where: { id: existingUsage.id },
              data: { quantity: existingUsage.quantity + usage.quantity },
            });
          }
          await prisma.recipeIngredient.delete({ where: { id: usage.id } });
        } else {
          // Just update to point to the new ingredient
          await prisma.recipeIngredient.update({
            where: { id: usage.id },
            data: { ingredientId: newIng.id },
          });
        }
      }

      // Also update shopping list items
      const shoppingUsages = await prisma.shoppingListItem.findMany({
        where: { ingredientId: oldIng.id },
      });

      for (const item of shoppingUsages) {
        const existingItem = await prisma.shoppingListItem.findFirst({
          where: { shoppingListId: item.shoppingListId, ingredientId: newIng.id, unit: item.unit },
        });

        if (existingItem) {
          await prisma.shoppingListItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + item.quantity },
          });
          await prisma.shoppingListItem.delete({ where: { id: item.id } });
        } else {
          await prisma.shoppingListItem.update({
            where: { id: item.id },
            data: { ingredientId: newIng.id },
          });
        }
      }

      // Delete the old ingredient
      await prisma.ingredient.delete({ where: { id: oldIng.id } });
    } else {
      // Simple rename
      console.log(`  Renaming "${oldName}" -> "${newName}"`);
      await prisma.ingredient.update({
        where: { id: oldIng.id },
        data: { name: newName },
      });
    }
  }

  console.log('\n=== DONE ===');
  await prisma.$disconnect();
}

fixIngredients().catch(console.error);
