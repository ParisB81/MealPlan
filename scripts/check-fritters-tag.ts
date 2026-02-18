import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recipe = await prisma.recipe.findFirst({
    where: { title: { contains: 'Santorini' } },
    select: { id: true, title: true, tags: true },
  });

  if (!recipe) {
    console.log('Not found');
    return;
  }

  console.log('Title:', recipe.title);
  console.log('Tags raw:', JSON.stringify(recipe.tags));

  const tags = recipe.tags!.split(',');
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.includes('minutes')) {
      console.log(`\nDuration tag: "${trimmed}"`);
      for (let i = 0; i < trimmed.length; i++) {
        const code = trimmed.charCodeAt(i);
        if (code === 0x2D || code === 0x2013 || code === 0x2014) {
          console.log(`  Char at ${i}: '${trimmed[i]}' = U+${code.toString(16).padStart(4, '0')} (${code === 0x2D ? 'HYPHEN-MINUS' : code === 0x2013 ? 'EN DASH' : 'EM DASH'})`);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
