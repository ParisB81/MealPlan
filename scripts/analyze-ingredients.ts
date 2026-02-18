import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all master ingredients
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  // Get all recipe ingredients (what recipes actually reference)
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: { ingredient: { select: { name: true, category: true } } },
  });

  // Count by category in master list
  const categoryCounts: Record<string, number> = {};
  for (const i of ingredients) {
    const cat = i.category || 'uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  console.log('=== MASTER INGREDIENT DATABASE ===');
  console.log(`Total: ${ingredients.length}\n`);
  const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  // Find ingredients used in recipes but NOT in master list (orphans or mismatches)
  const masterNames = new Set(ingredients.map(i => i.name.toLowerCase()));
  const usedNames = new Set(recipeIngredients.map(ri => ri.ingredient.name.toLowerCase()));

  // Ingredients used in recipes — list them by category
  console.log('\n=== INGREDIENTS USED IN RECIPES (by category) ===');
  const usedByCategory: Record<string, Set<string>> = {};
  for (const ri of recipeIngredients) {
    const cat = ri.ingredient.category || 'uncategorized';
    if (!usedByCategory[cat]) usedByCategory[cat] = new Set();
    usedByCategory[cat].add(ri.ingredient.name);
  }
  for (const [cat, names] of Object.entries(usedByCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n  ${cat} (${names.size}):`);
    const sorted = [...names].sort();
    for (const n of sorted) {
      console.log(`    ${n}`);
    }
  }

  // Count how many times each ingredient is used
  console.log('\n=== MOST USED INGREDIENTS ===');
  const usageCounts: Record<string, number> = {};
  for (const ri of recipeIngredients) {
    usageCounts[ri.ingredient.name] = (usageCounts[ri.ingredient.name] || 0) + 1;
  }
  const topUsed = Object.entries(usageCounts).sort((a, b) => b[1] - a[1]).slice(0, 50);
  for (const [name, count] of topUsed) {
    const ing = ingredients.find(i => i.name === name);
    console.log(`  ${String(count).padStart(4)}x  ${name} (${ing?.category || '?'})`);
  }

  // List all master ingredients by category (for gap analysis)
  console.log('\n=== FULL MASTER LIST BY CATEGORY ===');
  const masterByCategory: Record<string, string[]> = {};
  for (const i of ingredients) {
    const cat = i.category || 'uncategorized';
    if (!masterByCategory[cat]) masterByCategory[cat] = [];
    masterByCategory[cat].push(i.name);
  }
  for (const [cat, names] of Object.entries(masterByCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n  ${cat} (${names.length}):`);
    names.sort();
    // Just show first 30 and last 10 if too many
    if (names.length > 50) {
      for (const n of names.slice(0, 30)) console.log(`    ${n}`);
      console.log(`    ... (${names.length - 40} more)`);
      for (const n of names.slice(-10)) console.log(`    ${n}`);
    } else {
      for (const n of names) console.log(`    ${n}`);
    }
  }

  await prisma.$disconnect();
}

main();
