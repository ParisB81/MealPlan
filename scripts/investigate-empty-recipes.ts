import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigate() {
  console.log('=== INVESTIGATING EMPTY RECIPES ===\n');

  const emptyRecipes = await prisma.recipe.findMany({
    where: {
      status: 'active',
      ingredients: {
        none: {},
      },
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      createdAt: true,
    },
  });

  for (const recipe of emptyRecipes) {
    console.log(`Recipe: "${recipe.title}"`);
    console.log(`  ID: ${recipe.id}`);
    console.log(`  Source URL: ${recipe.sourceUrl || 'None'}`);
    console.log(`  Created: ${recipe.createdAt}`);
    console.log('');
  }

  console.log(`Total empty recipes: ${emptyRecipes.length}`);

  await prisma.$disconnect();
}

investigate().catch(console.error);
