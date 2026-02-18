import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fixes: Record<string, string> = {
  'egg': 'dairy',
  'egg white': 'dairy',
  'egg yolk': 'dairy',
  'black mustard seeds': 'spices',
  'red chili powder': 'spices',
  'mixed fresh herbs': 'herbs',
  'dried chickpea': 'pulses',
  'orzo': 'grains',
  'grated zest of one orange': 'produce',
};

// Also clean up junk entries
const junkNames = [
  'juiced', 'leaf', 'leaves leaf', 'lightly beaten', 'round', 'seed', 'of garlic', 'matchsticks',
];

async function main() {
  for (const [name, category] of Object.entries(fixes)) {
    const result = await prisma.ingredient.updateMany({
      where: { name: name.toLowerCase() },
      data: { category },
    });
    if (result.count > 0) console.log(`  ✓ ${name} → ${category}`);
    else console.log(`  ✗ ${name} not found`);
  }

  // Check for junk entries not used in any recipe
  for (const name of junkNames) {
    const ing = await prisma.ingredient.findFirst({ where: { name } });
    if (!ing) continue;

    const usageCount = await prisma.recipeIngredient.count({
      where: { ingredientId: ing.id },
    });

    if (usageCount === 0) {
      await prisma.ingredient.delete({ where: { id: ing.id } });
      console.log(`  🗑 Deleted unused junk: "${name}"`);
    } else {
      // Categorize junk that's actually used
      let cat = 'pantry';
      if (name === 'of garlic') cat = 'produce';
      if (name === 'leaf' || name === 'leaves leaf') cat = 'herbs';
      await prisma.ingredient.update({ where: { id: ing.id }, data: { category: cat } });
      console.log(`  ⚠ "${name}" used in ${usageCount} recipes — categorized as ${cat}`);
    }
  }

  // Final count
  const uncategorized = await prisma.ingredient.count({
    where: { OR: [{ category: null }, { category: '' }, { category: 'uncategorized' }] },
  });
  const total = await prisma.ingredient.count();
  console.log(`\nTotal: ${total}, still uncategorized: ${uncategorized}`);

  await prisma.$disconnect();
}

main();
