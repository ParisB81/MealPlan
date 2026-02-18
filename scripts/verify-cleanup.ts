import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFICATION REPORT ===\n');

  // Check that no recipe ingredients point to messy ingredient names
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: {
      ingredient: true,
      recipe: { select: { title: true } },
    },
  });

  const messyRecipeIngredients = recipeIngredients.filter(
    (ri) =>
      ri.ingredient.name.includes(',') ||
      ri.ingredient.name.includes('(') ||
      ri.ingredient.name.includes(')')
  );

  console.log(`Recipe ingredients with messy names: ${messyRecipeIngredients.length}`);

  if (messyRecipeIngredients.length > 0) {
    console.log('\nExamples:');
    messyRecipeIngredients.slice(0, 10).forEach((ri) => {
      console.log(`  - "${ri.ingredient.name}" in "${ri.recipe.title}"`);
    });
  }

  // Check shopping list items
  const shoppingItems = await prisma.shoppingListItem.findMany({
    include: { ingredient: true },
  });

  const messyShoppingItems = shoppingItems.filter(
    (si) =>
      si.ingredient.name.includes(',') ||
      si.ingredient.name.includes('(') ||
      si.ingredient.name.includes(')')
  );

  console.log(`\nShopping list items with messy names: ${messyShoppingItems.length}`);

  if (messyShoppingItems.length > 0) {
    console.log('\nExamples:');
    messyShoppingItems.slice(0, 10).forEach((si) => {
      console.log(`  - "${si.ingredient.name}"`);
    });
  }

  // Show some sample cleaned data
  console.log('\n=== SAMPLE OF CLEANED DATA ===\n');

  const sampleRecipes = await prisma.recipe.findMany({
    take: 3,
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  for (const recipe of sampleRecipes) {
    console.log(`Recipe: "${recipe.title}"`);
    console.log('Ingredients:');
    recipe.ingredients.slice(0, 5).forEach((ri) => {
      console.log(`  - ${ri.quantity} ${ri.unit} ${ri.ingredient.name}${ri.notes ? ` (${ri.notes})` : ''}`);
    });
    console.log('');
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
