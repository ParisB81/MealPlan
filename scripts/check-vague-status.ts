import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const vagueNames = ['powder', 'paste', 'sauce', 'oil', 'juice', 'broth', 'stock', 'seeds', 'wine'];

  console.log('=== REMAINING VAGUE INGREDIENTS ===\n');

  let foundAny = false;

  for (const name of vagueNames) {
    const ing = await prisma.ingredient.findUnique({ where: { name } });
    if (!ing) continue;

    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ing.id } });

    if (recipeCount > 0 || shoppingCount > 0) {
      foundAny = true;
      console.log(`"${name}" - ${recipeCount} recipes, ${shoppingCount} shopping items`);

      const usages = await prisma.recipeIngredient.findMany({
        where: { ingredientId: ing.id },
        include: { recipe: { select: { id: true, title: true } } },
      });

      for (const u of usages) {
        console.log(`  Recipe: "${u.recipe.title}" (ID: ${u.recipe.id})`);
      }
    } else {
      // Can delete - no usages
      console.log(`"${name}" - NO USAGES, can be deleted`);
    }
  }

  if (!foundAny) {
    console.log('All vague ingredients have been resolved!');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
