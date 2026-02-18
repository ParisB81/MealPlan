import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFICATION ===\n');

  // Check for any remaining Greek ingredients
  const allIngredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  const greekPattern = /[\u0370-\u03FF]/;
  const greekIngredients = allIngredients.filter((i) => greekPattern.test(i.name));

  if (greekIngredients.length > 0) {
    console.log('WARNING: Still have Greek ingredients:');
    for (const ing of greekIngredients) {
      console.log(`  "${ing.name}"`);
    }
  } else {
    console.log('✓ No Greek ingredients remaining');
  }

  // Check the fixed ingredients are gone
  const shouldBeGone = [
    'pinch of cayenne pepper',
    'radishes',
    'seasoning',
    'shredded',
    'shredded kale',
    'threads',
    'to taste',
    'vegetable stock pot',
    'water to cover',
  ];

  const stillExist = [];
  for (const name of shouldBeGone) {
    const ing = await prisma.ingredient.findUnique({ where: { name } });
    if (ing) stillExist.push(name);
  }

  if (stillExist.length > 0) {
    console.log('\nWARNING: These should have been fixed but still exist:');
    for (const name of stillExist) {
      console.log(`  "${name}"`);
    }
  } else {
    console.log('✓ All problematic ingredients fixed');
  }

  // Verify recipes were updated correctly
  console.log('\n--- Recipe verification ---\n');

  const recipesToCheck = [
    { title: 'Polish Cabbage Roll Soup', shouldHave: 'cayenne pepper' },
    { title: 'Salmon tartare poke bowl', shouldHave: 'radish' },
    { title: 'Cheesy Chicken Meatballs', shouldHave: 'italian seasoning' },
    { title: 'Bolognese Sauce', shouldHave: 'carrot' },
    { title: 'Make-Ahead Vegetarian Moroccan Stew', shouldHave: 'kale' },
    { title: 'Vegetarian Moroccan Harira', shouldHave: 'saffron' },
    { title: 'Greek meatball soup – Yuvarlakia', shouldHave: 'vegetable stock' },
    { title: 'Ψητά λαχανικά', shouldHave: 'olive oil' },
    { title: 'Κρεατόσουπα αυγολέμονο', shouldHave: 'egg' },
  ];

  for (const check of recipesToCheck) {
    const recipe = await prisma.recipe.findFirst({ where: { title: check.title } });
    if (!recipe) {
      console.log(`  "${check.title}" - NOT FOUND`);
      continue;
    }

    const ingredient = await prisma.ingredient.findUnique({ where: { name: check.shouldHave } });
    if (!ingredient) {
      console.log(`  "${check.title}" - ingredient "${check.shouldHave}" NOT FOUND`);
      continue;
    }

    const usage = await prisma.recipeIngredient.findFirst({
      where: { recipeId: recipe.id, ingredientId: ingredient.id },
    });

    if (usage) {
      console.log(`  ✓ "${check.title}" has "${check.shouldHave}"`);
    } else {
      console.log(`  ✗ "${check.title}" MISSING "${check.shouldHave}"`);
    }
  }

  console.log(`\nTotal ingredients: ${allIngredients.length}`);

  await prisma.$disconnect();
}

verify().catch(console.error);
