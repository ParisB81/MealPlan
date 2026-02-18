/**
 * Step 4: Resolve Vague Ingredient Names
 * Looks for very generic names like "powder", "paste", "sauce", "oil", "juice", etc.
 * Checks recipe context to determine what they actually are.
 * If unambiguous, renames/merges. If ambiguous, reports.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VAGUE_NAMES = [
  'powder', 'paste', 'sauce', 'oil', 'juice', 'broth', 'stock',
  'seed', 'wine', 'seasoning', 'threads', 'shredded', 'leaf',
  'extract', 'syrup', 'spice', 'herbs', 'nuts', 'dressing',
  'fillets', 'sprouts', 'germ', 'drippings', 'soda', 'round',
];

async function mergeIngredient(oldId: string, oldName: string, newId: string, newName: string) {
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId: oldId }
  });

  for (const ri of recipeIngredients) {
    const existing = await prisma.recipeIngredient.findUnique({
      where: {
        recipeId_ingredientId: {
          recipeId: ri.recipeId,
          ingredientId: newId
        }
      }
    });

    if (existing) {
      if (existing.unit === ri.unit) {
        const newQty = Math.round((existing.quantity + ri.quantity) * 100) / 100;
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { quantity: newQty, notes: [existing.notes, ri.notes].filter(Boolean).join('; ') || null }
        });
      } else {
        const combinedNotes = [existing.notes, `Also: ${ri.quantity} ${ri.unit}`, ri.notes].filter(Boolean).join('; ');
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { notes: combinedNotes || null }
        });
      }
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
      await prisma.recipeIngredient.update({
        where: { id: ri.id },
        data: { ingredientId: newId }
      });
    }
  }

  const shopItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: oldId }
  });
  for (const si of shopItems) {
    await prisma.shoppingListItem.update({
      where: { id: si.id },
      data: { ingredientId: newId }
    });
  }

  await prisma.ingredient.delete({ where: { id: oldId } });
}

async function main() {
  const before = await prisma.ingredient.count();
  console.log(`\n=== Step 4: Resolve Vague Names ===`);
  console.log(`Ingredients before: ${before}\n`);

  let resolved = 0;
  let skipped = 0;

  for (const vagueName of VAGUE_NAMES) {
    const ing = await prisma.ingredient.findUnique({ where: { name: vagueName } });
    if (!ing) continue;

    // Check recipe context
    const usages = await prisma.recipeIngredient.findMany({
      where: { ingredientId: ing.id },
      include: {
        recipe: { select: { title: true, tags: true, description: true } }
      }
    });

    if (usages.length === 0) {
      console.log(`  DELETE (unused): "${vagueName}"`);
      await prisma.ingredient.delete({ where: { id: ing.id } });
      resolved++;
      continue;
    }

    // Try to determine what this vague name should be based on context
    let targetName: string | null = null;

    switch (vagueName) {
      case 'powder':
        // Check if recipes are curry-heavy, chili-heavy, etc.
        const powderRecipes = usages.map(u => (u.recipe.title + ' ' + (u.recipe.tags || '')).toLowerCase());
        if (powderRecipes.some(r => r.includes('curry') || r.includes('indian'))) {
          targetName = 'curry powder';
        } else if (powderRecipes.some(r => r.includes('chili') || r.includes('mexican'))) {
          targetName = 'chili powder';
        } else if (powderRecipes.some(r => r.includes('garlic'))) {
          targetName = 'garlic powder';
        }
        break;

      case 'paste':
        const pasteRecipes = usages.map(u => (u.recipe.title + ' ' + (u.recipe.tags || '')).toLowerCase());
        if (pasteRecipes.some(r => r.includes('curry') || r.includes('thai'))) {
          targetName = 'curry paste';
        } else if (pasteRecipes.some(r => r.includes('tomato'))) {
          targetName = 'tomato paste';
        }
        break;

      case 'sauce':
        const sauceRecipes = usages.map(u => (u.recipe.title + ' ' + (u.recipe.tags || '')).toLowerCase());
        if (sauceRecipes.some(r => r.includes('soy') || r.includes('asian') || r.includes('stir'))) {
          targetName = 'soy sauce';
        } else if (sauceRecipes.some(r => r.includes('tomato'))) {
          targetName = 'tomato sauce';
        } else if (sauceRecipes.some(r => r.includes('hot'))) {
          targetName = 'hot sauce';
        }
        break;

      case 'oil':
        targetName = 'olive oil'; // Most common default
        break;

      case 'juice':
        const juiceRecipes = usages.map(u => u.recipe.title.toLowerCase());
        if (juiceRecipes.some(r => r.includes('lemon'))) {
          targetName = 'lemon juice';
        } else if (juiceRecipes.some(r => r.includes('lime'))) {
          targetName = 'lime juice';
        } else if (juiceRecipes.some(r => r.includes('orange'))) {
          targetName = 'orange juice';
        }
        break;

      case 'broth':
        targetName = 'chicken broth'; // Most common
        break;

      case 'stock':
        targetName = 'chicken stock';
        break;

      case 'wine':
        const wineRecipes = usages.map(u => u.recipe.title.toLowerCase());
        if (wineRecipes.some(r => r.includes('red'))) {
          targetName = 'red wine';
        } else {
          targetName = 'white wine';
        }
        break;

      case 'seed':
        // "seed" alone is too vague, skip
        break;

      case 'seasoning':
        targetName = 'italian seasoning';
        break;

      case 'threads':
        targetName = 'saffron'; // saffron threads
        break;

      case 'extract':
        targetName = 'vanilla extract';
        break;

      case 'syrup':
        targetName = 'maple syrup';
        break;

      case 'leaf':
        targetName = 'bay leaf';
        break;

      case 'herbs':
        targetName = 'mixed herbs';
        break;

      case 'nuts':
        // Too vague - could be many types
        break;

      case 'drippings':
        // Cooking term, skip
        break;

      case 'soda':
        targetName = 'baking soda';
        break;

      case 'shredded':
        // This is a prep word, not an ingredient - will be caught by step 6
        break;

      case 'fillets':
        // Too vague
        break;

      case 'sprouts':
        targetName = 'bean sprouts';
        break;

      case 'germ':
        // wheat germ?
        break;

      case 'dressing':
        // Too vague
        break;

      case 'spice':
        // Too vague
        break;

      case 'round':
        // Likely "bread round" - too vague
        break;
    }

    if (targetName) {
      const target = await prisma.ingredient.findUnique({ where: { name: targetName } });
      if (target) {
        console.log(`  RESOLVE: "${vagueName}" -> "${targetName}" (${usages.length} recipes)`);
        await mergeIngredient(ing.id, vagueName, target.id, targetName);
        resolved++;
      } else {
        console.log(`  RENAME: "${vagueName}" -> "${targetName}" (${usages.length} recipes)`);
        await prisma.ingredient.update({ where: { id: ing.id }, data: { name: targetName } });
        resolved++;
      }
    } else {
      console.log(`  SKIP (ambiguous): "${vagueName}" used in ${usages.length} recipe(s): ${usages.map(u => u.recipe.title).join(', ')}`);
      skipped++;
    }
  }

  const after = await prisma.ingredient.count();
  console.log(`\nResolved: ${resolved}`);
  console.log(`Skipped (ambiguous): ${skipped}`);
  console.log(`Ingredients after: ${after}`);
  console.log(`Net reduction: ${before - after}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
