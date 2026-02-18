import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('=== CHECKING FOR CORRUPTED DATA ===\n');

  // Get all recipes raw
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      instructions: true,
    },
  });

  console.log(`Total recipes: ${recipes.length}\n`);

  let corrupted = 0;
  for (const recipe of recipes) {
    try {
      // Instructions should be a JSON string
      if (recipe.instructions) {
        JSON.parse(recipe.instructions);
      }
    } catch (e: any) {
      corrupted++;
      console.log(`CORRUPTED: "${recipe.title}" (${recipe.id})`);
      console.log(`  Instructions: ${recipe.instructions?.substring(0, 100)}...`);
      console.log(`  Error: ${e.message}\n`);
    }
  }

  if (corrupted === 0) {
    console.log('No corrupted instructions found.');
  } else {
    console.log(`\nFound ${corrupted} recipes with corrupted instructions.`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
