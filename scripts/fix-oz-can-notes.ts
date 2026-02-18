import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all recipe ingredients with "XX oz can" notes
  const items = await prisma.recipeIngredient.findMany({
    where: { notes: { not: null } },
    include: {
      recipe: { select: { id: true, title: true } },
      ingredient: { select: { name: true } },
    },
  });

  const ozCanPattern = /^([\d.]+)\s*oz\s+can$/i;
  const toFix = items.filter(i => i.notes && ozCanPattern.test(i.notes.trim()));

  console.log(`Found ${toFix.length} records with "XX oz can" notes\n`);

  let fixed = 0;
  for (const item of toFix) {
    const match = item.notes!.trim().match(ozCanPattern)!;
    const ozPerCan = parseFloat(match[1]);
    const totalOz = Math.round(item.quantity * ozPerCan * 100) / 100;

    console.log(
      `  ${item.recipe.title} | ${item.ingredient.name}: ` +
      `${item.quantity} ${item.unit} (${item.notes}) → ${totalOz} oz`
    );

    await prisma.recipeIngredient.update({
      where: { id: item.id },
      data: {
        quantity: totalOz,
        unit: 'oz',
        notes: null,
      },
    });
    fixed++;
  }

  console.log(`\nFixed ${fixed} records.`);
  await prisma.$disconnect();
}

main();
