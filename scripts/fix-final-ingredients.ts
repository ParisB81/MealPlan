import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFinal() {
  const fixes: Record<string, string> = {
    'chicken breasts, cut into large chunks': 'chicken breast',
    'egg yolks (from medium eggs)': 'egg yolk',
    'eggs (medium)': 'egg',
    'gruyere cheese (grated)': 'gruyere cheese',
    'onion, thinly sliced': 'onion',
    'parsley (finely chopped)': 'parsley',
    'thyme (fresh)': 'thyme',
  };

  for (const [oldName, newName] of Object.entries(fixes)) {
    console.log(`\nProcessing: "${oldName}" -> "${newName}"`);

    // Find the messy ingredient
    const messy = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!messy) {
      console.log('  Source not found, skipping');
      continue;
    }

    // Find the clean target
    const clean = await prisma.ingredient.findUnique({ where: { name: newName } });
    if (!clean) {
      // Target doesn't exist - just rename
      await prisma.ingredient.update({
        where: { id: messy.id },
        data: { name: newName },
      });
      console.log(`  Renamed directly (target didn't exist)`);
      continue;
    }

    // Get all recipe ingredients using the messy one
    const usages = await prisma.recipeIngredient.findMany({
      where: { ingredientId: messy.id },
      include: { recipe: { select: { title: true } } },
    });

    console.log(`  Found ${usages.length} usages`);

    for (const usage of usages) {
      // Check if target already exists in this recipe
      const existing = await prisma.recipeIngredient.findFirst({
        where: { recipeId: usage.recipeId, ingredientId: clean.id },
      });

      if (existing) {
        // Delete the duplicate
        await prisma.recipeIngredient.delete({ where: { id: usage.id } });
        console.log(`  Removed duplicate in: ${usage.recipe.title}`);
      } else {
        // Update to point to clean ingredient
        await prisma.recipeIngredient.update({
          where: { id: usage.id },
          data: { ingredientId: clean.id },
        });
        console.log(`  Remapped in: ${usage.recipe.title}`);
      }
    }

    // Delete the messy ingredient
    try {
      await prisma.ingredient.delete({ where: { id: messy.id } });
      console.log(`  Deleted old ingredient`);
    } catch (e) {
      console.log(`  Could not delete (still has refs)`);
    }
  }

  // Check remaining issues
  const remaining = await prisma.ingredient.findMany({
    where: {
      OR: [
        { name: { contains: ',' } },
        { name: { contains: '(' } },
        { name: { contains: ')' } },
      ],
    },
  });

  console.log(`\n=== REMAINING ISSUES: ${remaining.length} ===`);
  for (const ing of remaining) {
    const count = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    console.log(`  "${ing.name}" (${count} usages)`);
  }

  await prisma.$disconnect();
}

fixFinal().catch(console.error);
