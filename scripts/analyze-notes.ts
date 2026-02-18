import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.recipeIngredient.findMany({
    where: { notes: { not: null } },
    include: { ingredient: { select: { name: true } }, recipe: { select: { title: true } } },
  });
  const filtered = items.filter(i => i.notes && i.notes.trim() !== '');

  const noteGroups: Record<string, string[]> = {};
  for (const i of filtered) {
    const note = i.notes!.trim();
    if (!noteGroups[note]) noteGroups[note] = [];
    noteGroups[note].push(`${i.ingredient.name} (${i.quantity} ${i.unit}) — ${i.recipe.title}`);
  }

  const sorted = Object.entries(noteGroups).sort((a, b) => b[1].length - a[1].length);
  for (const [note, ingredients] of sorted) {
    console.log(`\n[${ingredients.length}x] "${note}"`);
    for (const ing of ingredients) console.log(`     ${ing}`);
  }

  // Specifically find "oz" patterns in notes
  console.log('\n\n=== NOTES CONTAINING "oz" ===');
  for (const i of filtered) {
    if (i.notes!.toLowerCase().includes('oz')) {
      console.log(`  "${i.notes}" — ${i.ingredient.name} (${i.quantity} ${i.unit}) — ${i.recipe.title}`);
    }
  }

  // Find "can" patterns
  console.log('\n=== NOTES CONTAINING "can" ===');
  for (const i of filtered) {
    if (i.notes!.toLowerCase().includes('can')) {
      console.log(`  "${i.notes}" — ${i.ingredient.name} (${i.quantity} ${i.unit}) — ${i.recipe.title}`);
    }
  }

  // Find quantity-like patterns (numbers in notes)
  console.log('\n=== NOTES WITH NUMBERS (potential quantity info) ===');
  for (const i of filtered) {
    if (/\d/.test(i.notes!)) {
      console.log(`  "${i.notes}" — ${i.ingredient.name} (${i.quantity} ${i.unit}) — ${i.recipe.title}`);
    }
  }

  await prisma.$disconnect();
}

main();
