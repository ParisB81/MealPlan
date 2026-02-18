import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('=== FIXING CORRUPTED INSTRUCTIONS ===\n');

  // Get all recipes
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      instructions: true,
    },
  });

  let fixed = 0;
  for (const recipe of recipes) {
    try {
      // Try to parse as JSON - if it works, it's already correct
      if (recipe.instructions) {
        JSON.parse(recipe.instructions);
      }
    } catch (e) {
      // Instructions is not valid JSON - it's plain text
      // Convert to JSON array
      console.log(`Fixing: "${recipe.title}"`);

      const instructionsText = recipe.instructions || '';

      // Split by "Step X:" pattern or newlines
      let steps: string[] = [];

      // Try splitting by "Step N:" pattern first
      const stepMatches = instructionsText.match(/Step \d+:.*?(?=Step \d+:|$)/gs);
      if (stepMatches && stepMatches.length > 0) {
        steps = stepMatches.map(s => s.trim()).filter(s => s);
      } else {
        // Fall back to splitting by newlines
        steps = instructionsText.split('\n').map(s => s.trim()).filter(s => s);
      }

      // Store as JSON string
      const instructionsJson = JSON.stringify(steps);

      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { instructions: instructionsJson },
      });

      console.log(`  Converted ${steps.length} steps to JSON array`);
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log('No corrupted instructions to fix.');
  } else {
    console.log(`\nFixed ${fixed} recipes.`);
  }

  await prisma.$disconnect();
}

fix().catch(console.error);
