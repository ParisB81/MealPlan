import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find recipes with duration tags using regular hyphens instead of en-dashes
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: { id: true, title: true, tags: true },
  });

  const replacements: [string, string][] = [
    ['15-30 minutes', '15–30 minutes'],
    ['30-60 minutes', '30–60 minutes'],
  ];

  let fixedCount = 0;

  for (const recipe of recipes) {
    let tags = recipe.tags || '';
    let changed = false;

    for (const [wrong, correct] of replacements) {
      if (tags.includes(wrong)) {
        tags = tags.split(wrong).join(correct);
        changed = true;
      }
    }

    if (changed) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags },
      });
      fixedCount++;
      console.log(`Fixed: ${recipe.title}`);
    }
  }

  console.log(`\nDone. Fixed ${fixedCount} recipes.`);
  await prisma.$disconnect();
}

main().catch(console.error);
