import { PrismaClient } from '@prisma/client';
import path from 'path';

// The .env has DATABASE_URL=file:./dev.db which is relative to the prisma/ folder
// We need to set the absolute path to the actual database
const dbPath = path.resolve('C:/00 Paris/MealPlan/packages/backend/prisma/dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: { id: true, title: true, tags: true, prepTime: true, cookTime: true },
    orderBy: { title: 'asc' },
  });

  console.log(`\n=== ACTIVE RECIPES (${recipes.length}) ===\n`);

  const tagCounts = new Map<string, number>();

  for (const recipe of recipes) {
    const tags = recipe.tags
      ? recipe.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const timeParts: string[] = [];
    if (recipe.prepTime != null) timeParts.push(`prep: ${recipe.prepTime}min`);
    if (recipe.cookTime != null) timeParts.push(`cook: ${recipe.cookTime}min`);
    const timeStr = timeParts.length > 0 ? ` | ${timeParts.join(', ')}` : '';

    console.log(`  ${recipe.title}`);
    console.log(`    Tags: ${tags.length > 0 ? tags.join(', ') : '(none)'}${timeStr}`);
  }

  const sortedTags = [...tagCounts.entries()].sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  console.log(`\n=== UNIQUE TAGS (${sortedTags.length}) ===\n`);

  const maxTagLen = Math.max(...sortedTags.map(([tag]) => tag.length));
  for (const [tag, count] of sortedTags) {
    console.log(`  ${tag.padEnd(maxTagLen + 2)} ${count} recipe${count !== 1 ? 's' : ''}`);
  }

  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
