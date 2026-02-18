import { PrismaClient } from '@prisma/client';
import path from 'path';

const dbPath = path.resolve(__dirname, '..', 'packages', 'backend', 'prisma', 'dev.db');

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${dbPath}` },
  },
});

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      title: true,
      tags: true,
      description: true,
      prepTime: true,
      cookTime: true,
      servings: true,
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          notes: true,
          ingredient: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  const formatted = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags ? r.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    ingredients: r.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes,
    })),
  }));

  console.log('=== ALL ACTIVE RECIPES ===');
  console.log(JSON.stringify(formatted, null, 2));

  // Tag counts
  const tagCounts: Record<string, number> = {};
  for (const r of recipes) {
    if (r.tags) {
      const tags = r.tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  console.log('\n=== TAG COUNTS ===');
  console.log(`Total unique tags: ${sortedTags.length}`);
  console.log(JSON.stringify(sortedTags, null, 2));
  console.log(`\nTotal recipes: ${recipes.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
