import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Find ingredients that may need cleanup
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  console.log('=== POTENTIAL ISSUES IN INGREDIENTS ===\n');

  const issues: Array<{ name: string; problem: string }> = [];

  for (const ing of ingredients) {
    const name = ing.name;

    // Check for parentheses in name (likely notes that should be separate)
    if (name.includes('(')) {
      issues.push({ name, problem: 'Contains parentheses' });
    }

    // Check for plural forms
    if (name.endsWith('s)') || (name.endsWith('s') && !name.endsWith('ss'))) {
      // Check if singular exists
      const singular = name.replace(/s$/, '');
      const singularExists = ingredients.find((i) => i.name === singular);
      if (singularExists) {
        issues.push({ name, problem: `Plural - singular "${singular}" exists` });
      }
    }

    // Check for "heavy cream 35%" style names
    if (/\d+%/.test(name)) {
      issues.push({ name, problem: 'Contains percentage' });
    }

    // Check for specific problematic patterns
    if (name.includes('homemade')) {
      issues.push({ name, problem: 'Contains "homemade"' });
    }

    if (name.includes(' or ')) {
      issues.push({ name, problem: 'Contains "or"' });
    }

    // Check for vague ingredient names
    if (['stock', 'eggs'].includes(name)) {
      const usageCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      if (usageCount > 0) {
        issues.push({ name, problem: `Vague name (${usageCount} usages)` });
      }
    }
  }

  if (issues.length === 0) {
    console.log('No obvious issues found!');
  } else {
    console.log(`Found ${issues.length} potential issues:\n`);
    for (const issue of issues) {
      console.log(`  "${issue.name}" - ${issue.problem}`);
    }
  }

  // Also show newly created ingredients (the ones I just added)
  console.log('\n=== RECENTLY CREATED INGREDIENTS ===\n');
  const newIngredients = [
    'leeks',
    'tomatoes',
    'croutons',
    '5-spices mix',
    'sage',
    'pumpkin seeds',
    'macaroni',
    'carrots',
    'canned tomatoes',
    'stock',
    'mushroom bouillon cube',
    'iceberg lettuce',
    'light strained yogurt',
    'cod ((fresh or frozen), boneless)',
    'whole wheat bread',
    'eggs',
    'potatoes',
    'lime(s)',
  ];

  for (const name of newIngredients) {
    const ing = await prisma.ingredient.findUnique({ where: { name } });
    if (ing) {
      const usageCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      console.log(`  "${name}" - ${usageCount} usages`);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
