import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecipes() {
  console.log('=== CHECKING RECIPE INGREDIENT COUNTS ===\n');

  // Get all recipes with their ingredient counts
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    include: {
      ingredients: true,
    },
    orderBy: { title: 'asc' },
  });

  // Find recipes with very few ingredients (potential data loss)
  const suspiciousRecipes = recipes.filter((r) => r.ingredients.length <= 2);

  if (suspiciousRecipes.length > 0) {
    console.log('Recipes with 2 or fewer ingredients (may need review):');
    for (const r of suspiciousRecipes) {
      console.log(`  "${r.title}" - ${r.ingredients.length} ingredient(s)`);
    }
  } else {
    console.log('No recipes with suspiciously low ingredient counts.');
  }

  // Show distribution
  console.log('\n=== INGREDIENT COUNT DISTRIBUTION ===\n');
  const distribution: Record<string, number> = {};
  for (const r of recipes) {
    const count = r.ingredients.length;
    const bucket =
      count <= 5
        ? '1-5'
        : count <= 10
          ? '6-10'
          : count <= 15
            ? '11-15'
            : count <= 20
              ? '16-20'
              : '21+';
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  }

  for (const [bucket, count] of Object.entries(distribution)) {
    console.log(`${bucket} ingredients: ${count} recipes`);
  }

  console.log(`\nTotal recipes: ${recipes.length}`);

  await prisma.$disconnect();
}

checkRecipes().catch(console.error);
