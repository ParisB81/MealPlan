import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Recipes that had garbage ingredients removed
const AFFECTED_RECIPES = [
  "Do-It-Yourself Salmon Poke Bowls",      // had "sliced"
  "Philly Cheesesteak",                     // had "sliced"
  "Marrakesh Vegetable Curry",              // had "sliced", "chopped"
  "Ground Beef and Rice Skillet",           // had "chopped"
  "Southern Coleslaw",                      // had "finely chopped"
  "Best Ever Ceviche",                      // had "finely diced"
  "Chicken Piccata Meatballs",              // had "finely minced"
  "Elegant Open-Faced Smoked Salmon Sandwiches", // had "thinly sliced"
  "Black Bean Breakfast Bowl",              // had "peeled and sliced"
  "Smoked Salmon Sushi Roll",               // had "peeled and sliced"
  "Spicy Salmon Roll Shaken Cucumber Salad", // had "peeled and diced", "seeded and finely chopped"
  "Mexican Ceviche",                        // had "peeled and finely chopped"
  "Moroccan Chickpea Stew",                 // had "cut into 1/2-inch cubes"
  "Traditional Gyro Meat",                  // had "cut into chunks"
];

async function checkAffectedRecipes() {
  console.log('=== CHECKING AFFECTED RECIPES ===\n');

  for (const title of AFFECTED_RECIPES) {
    const recipe = await prisma.recipe.findFirst({
      where: { title: { contains: title.substring(0, 30) } },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!recipe) {
      console.log(`NOT FOUND: "${title}"\n`);
      continue;
    }

    console.log(`Recipe: "${recipe.title}"`);
    console.log(`Ingredients (${recipe.ingredients.length}):`);
    recipe.ingredients.forEach((ri) => {
      console.log(`  - ${ri.quantity} ${ri.unit} ${ri.ingredient.name}${ri.notes ? ` (${ri.notes})` : ''}`);
    });
    console.log('');
  }

  await prisma.$disconnect();
}

checkAffectedRecipes().catch(console.error);
