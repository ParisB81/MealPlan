import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// First, let's see what recipes use these vague ingredients and try to determine what they should be
async function analyzeVagueIngredients() {
  console.log('=== ANALYZING VAGUE INGREDIENTS ===\n');

  const vagueNames = ['powder', 'paste', 'sauce', 'oil', 'juice', 'seeds', 'wine', 'broth', 'stock'];

  for (const name of vagueNames) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name } });
    if (!ingredient) continue;

    const usages = await prisma.recipeIngredient.findMany({
      where: { ingredientId: ingredient.id },
      include: {
        recipe: {
          select: { title: true, sourceUrl: true },
        },
      },
    });

    if (usages.length === 0) continue;

    console.log(`\n=== "${name}" (${usages.length} usages) ===`);
    for (const usage of usages) {
      console.log(`  Recipe: "${usage.recipe.title}"`);
      console.log(`    Qty: ${usage.quantity} ${usage.unit}`);
      console.log(`    Notes: ${usage.notes || 'none'}`);
      console.log(`    Source: ${usage.recipe.sourceUrl || 'none'}`);
    }
  }

  await prisma.$disconnect();
}

analyzeVagueIngredients().catch(console.error);
