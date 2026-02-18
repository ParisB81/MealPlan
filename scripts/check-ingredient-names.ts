import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Find ingredients with trailing commas or other noise
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' }
  });

  console.log('=== INGREDIENTS WITH POTENTIAL ISSUES ===\n');

  // Check for trailing commas, parentheses, or other noise
  const issues = ingredients.filter(i =>
    i.name.includes(',') ||
    i.name.includes('(') ||
    i.name.includes(')') ||
    /^\d/.test(i.name) ||  // starts with number
    i.name.endsWith(' ') ||
    i.name.startsWith(' ')
  );

  console.log('Ingredients with commas, parens, numbers, or extra spaces:');
  issues.forEach(i => console.log(`  "${i.name}"`));
  console.log(`Total: ${issues.length}\n`);

  // Also check recipe ingredients where the ingredient name looks like it has extra words
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: { ingredient: true, recipe: { select: { title: true } } }
  });

  // Look for very long ingredient names or ones with descriptors
  const longNames = recipeIngredients.filter(ri =>
    ri.ingredient.name.split(' ').length > 4
  );

  console.log('=== VERY LONG INGREDIENT NAMES (5+ words) ===');
  const uniqueLong = [...new Set(longNames.map(ri => ri.ingredient.name))].sort();
  uniqueLong.forEach(name => console.log(`  "${name}"`));
  console.log(`Total: ${uniqueLong.length}\n`);

  // Check for ingredient names that might have the old unit embedded
  const suspiciousPatterns = [
    /avocado/i,
    /cucumber/i,
    /zucchini/i,
    /jalapeno/i,
    /onion/i,
    /pepper.*diced/i,
    /pepper.*chopped/i,
    /tomato.*diced/i,
  ];

  console.log('=== SAMPLE OF INGREDIENTS TO REVIEW ===');
  const sample = ingredients
    .filter(i => i.name.length > 25)
    .slice(0, 30);
  sample.forEach(i => console.log(`  "${i.name}"`));

  await prisma.$disconnect();
}

check().catch(console.error);
