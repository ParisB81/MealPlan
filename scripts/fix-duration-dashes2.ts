import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: { id: true, title: true, tags: true },
  });

  // First, find all duration-like tags to understand the exact format
  const durationTags = new Set<string>();
  for (const recipe of recipes) {
    const tags = (recipe.tags || '').split(',');
    for (const tag of tags) {
      if (tag.includes('minutes')) {
        durationTags.add(tag);
        // Show hex of the dash character
        const dashIdx = tag.indexOf('30') !== -1 ? tag.indexOf('-', tag.indexOf('30')) : tag.indexOf('-', tag.indexOf('15'));
        if (dashIdx !== -1) {
          const char = tag.charCodeAt(dashIdx);
          console.log(`Tag: "${tag}" | dash char at ${dashIdx}: U+${char.toString(16).padStart(4, '0')} (${char === 0x2013 ? 'en-dash' : char === 0x2D ? 'hyphen' : 'other'})`);
        }
      }
    }
  }

  console.log('\nAll unique duration tags:');
  for (const tag of durationTags) {
    const bytes = [...tag].map(c => `U+${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join(' ');
    console.log(`  "${tag}"`);
  }

  // Now fix: replace regular hyphens with en-dashes in duration tags
  let fixedCount = 0;
  for (const recipe of recipes) {
    const tags = (recipe.tags || '').split(',');
    let changed = false;
    const newTags = tags.map(tag => {
      // Match " 15-30 minutes" or " 30-60 minutes" with regular hyphen
      const trimmed = tag.trim();
      if (trimmed === '15-30 minutes') {
        changed = true;
        return tag.replace('15-30 minutes', '15\u201330 minutes');
      }
      if (trimmed === '30-60 minutes') {
        changed = true;
        return tag.replace('30-60 minutes', '30\u201360 minutes');
      }
      return tag;
    });

    if (changed) {
      const newTagsStr = newTags.join(',');
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags: newTagsStr },
      });
      fixedCount++;
      console.log(`Fixed: ${recipe.title}`);
    }
  }

  console.log(`\nDone. Fixed ${fixedCount} recipes.`);
  await prisma.$disconnect();
}

main().catch(console.error);
