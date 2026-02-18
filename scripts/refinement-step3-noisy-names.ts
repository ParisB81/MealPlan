/**
 * Step 3: Clean Noisy Ingredient Names
 * - Strip parenthetical content (move to notes where used)
 * - Remove "homemade" prefix
 * - Remove percentages
 * - Strip "or" alternatives
 * - Remove prep words
 * - Strip leading "of "
 * - Remove trailing ", or as needed", ", divided", ", or to taste", etc.
 * - Remove leading "- " or dashes
 * - Remove leading size descriptions like "(4 inch)"
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanResult {
  cleaned: string;
  noteFragment?: string; // parenthetical or stripped info to add to notes
}

function cleanName(name: string): CleanResult {
  let cleaned = name.trim();
  let noteFragment: string | undefined;

  // Strip leading "- " or "- peeled..." style entries
  if (cleaned.startsWith('- ')) {
    noteFragment = cleaned.substring(2).trim();
    // These are pure prep instructions, not ingredient names
    return { cleaned: '', noteFragment };
  }

  // Strip leading "(N inch)" or "(about X)" patterns
  cleaned = cleaned.replace(/^\([\d\s\w]+\)\s*/i, '');

  // Strip leading "of "
  if (cleaned.startsWith('of ')) {
    cleaned = cleaned.substring(3);
  }

  // Remove "homemade " prefix
  cleaned = cleaned.replace(/^homemade\s+/i, '');

  // Remove percentages like "35% "
  cleaned = cleaned.replace(/\d+%\s*/g, '');

  // Extract parenthetical content and move to notes
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
  if (parenMatch) {
    noteFragment = parenMatch[2];
    cleaned = (parenMatch[1] + ' ' + parenMatch[3]).trim();
  }

  // Strip trailing modifiers: ", or as needed", ", divided", ", or to taste", etc.
  cleaned = cleaned.replace(/,\s*(or as needed|divided|or more to taste|or to taste|plus more.*|softened|melted|room temperature.*|at room temperature.*|chopped|diced|finely chopped|finely diced|thinly sliced|sliced|minced|coarsely chopped|peeled and.*|cut into.*|halved.*|seeded.*|crushed|beaten|slightly beaten|mashed|torn into.*|broken into.*|washed with.*|separated into.*|cooked and.*|or more as needed)$/i, '');

  // Strip trailing " for dredging", " for garnish", " for frying", " for serving", " to taste", " to cover"
  cleaned = cleaned.replace(/\s+(for dredging|for garnish|for frying|for serving|to taste|to cover|or as needed|or to taste|or more to taste|or more as needed)$/i, '');

  // Strip "or alternative" patterns: "parsley or cilantro" -> "parsley"
  // But only if there's clearly an "or" with another ingredient
  const orMatch = cleaned.match(/^(.+?)\s+or\s+(.+)$/i);
  if (orMatch && orMatch[1].length > 2) {
    cleaned = orMatch[1].trim();
  }

  // Remove leading prep words that got scraped as ingredient names
  // "chopped celery" -> "celery", "fresh basil" -> "basil", etc.
  const prepPrefixes = [
    'chopped fresh ', 'chopped italian ', 'chopped ', 'diced ',
    'fresh flat-leaf ', 'fresh italian ', 'fresh ',
    'finely chopped ', 'finely diced ',
    'thinly sliced ', 'sliced ',
    'halved ', 'quartered ',
    'grated ', 'minced ',
    'packed ', 'lightly ',
    'cup fresh ', 'cup ',
  ];
  for (const prefix of prepPrefixes) {
    if (cleaned.toLowerCase().startsWith(prefix)) {
      const rest = cleaned.substring(prefix.length).trim();
      if (rest.length > 2) {
        noteFragment = noteFragment ? noteFragment + '; ' + prefix.trim() : prefix.trim();
        cleaned = rest;
      }
    }
  }

  // Strip trailing modifiers that remain after comma
  cleaned = cleaned.replace(/,\s*.*$/, '').trim();

  // Remove leading "and "
  if (cleaned.startsWith('and ')) {
    cleaned = cleaned.substring(4);
  }

  // Strip trailing " leaves" if we have the base herb already (e.g., "thyme leaves" when "thyme" exists)
  // This will be handled by merge logic below

  // Final cleanup
  cleaned = cleaned.trim().toLowerCase();

  return { cleaned, noteFragment };
}

async function mergeIngredient(oldId: string, oldName: string, newId: string, newName: string) {
  // Get all RecipeIngredient rows referencing the old ingredient
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

  // Update ShoppingListItem references
  const shopItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: oldId }
  });
  for (const si of shopItems) {
    await prisma.shoppingListItem.update({
      where: { id: si.id },
      data: { ingredientId: newId }
    });
  }

  // Delete the old ingredient
  await prisma.ingredient.delete({ where: { id: oldId } });
}

async function main() {
  const before = await prisma.ingredient.count();
  console.log(`\n=== Step 3: Clean Noisy Names ===`);
  console.log(`Ingredients before: ${before}\n`);

  const all = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  const nameMap = new Map<string, typeof all[0]>();
  for (const ing of all) {
    nameMap.set(ing.name, ing);
  }

  let renames = 0;
  let merges = 0;
  let deletions = 0;

  for (const ing of all) {
    // Check if ingredient still exists (might have been merged already)
    const stillExists = await prisma.ingredient.findUnique({ where: { id: ing.id } });
    if (!stillExists) continue;

    const { cleaned, noteFragment } = cleanName(ing.name);

    // If cleaned name is empty, this was a pure prep instruction
    if (!cleaned || cleaned.length <= 1) {
      // Check usage
      const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      if (usage === 0) {
        console.log(`  DELETE (empty after clean): "${ing.name}"`);
        await prisma.ingredient.delete({ where: { id: ing.id } });
        deletions++;
      } else {
        console.log(`  SKIP (has ${usage} recipe refs, cleaned to empty): "${ing.name}"`);
      }
      continue;
    }

    // If cleaned name is same as original, nothing to do
    if (cleaned === ing.name) continue;

    // Check if cleaned name already exists as another ingredient
    const existing = await prisma.ingredient.findUnique({ where: { name: cleaned } });

    if (existing && existing.id !== ing.id) {
      // Merge into existing
      console.log(`  MERGE: "${ing.name}" -> "${cleaned}" (existing)`);

      // If there's a note fragment, update RecipeIngredient notes before merging
      if (noteFragment) {
        const refs = await prisma.recipeIngredient.findMany({ where: { ingredientId: ing.id } });
        for (const ri of refs) {
          const newNotes = [ri.notes, noteFragment].filter(Boolean).join('; ');
          await prisma.recipeIngredient.update({
            where: { id: ri.id },
            data: { notes: newNotes || null }
          });
        }
      }

      await mergeIngredient(ing.id, ing.name, existing.id, cleaned);
      nameMap.delete(ing.name);
      merges++;
    } else {
      // Rename in place
      console.log(`  RENAME: "${ing.name}" -> "${cleaned}"`);

      // If there's a note fragment, update RecipeIngredient notes
      if (noteFragment) {
        const refs = await prisma.recipeIngredient.findMany({ where: { ingredientId: ing.id } });
        for (const ri of refs) {
          const newNotes = [ri.notes, noteFragment].filter(Boolean).join('; ');
          await prisma.recipeIngredient.update({
            where: { id: ri.id },
            data: { notes: newNotes || null }
          });
        }
      }

      try {
        await prisma.ingredient.update({
          where: { id: ing.id },
          data: { name: cleaned }
        });
        nameMap.delete(ing.name);
        nameMap.set(cleaned, { ...ing, name: cleaned });
        renames++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Unique constraint violation - the cleaned name was created by a previous rename
          const target = await prisma.ingredient.findUnique({ where: { name: cleaned } });
          if (target) {
            console.log(`    -> Conflict, merging instead`);
            await mergeIngredient(ing.id, ing.name, target.id, cleaned);
            nameMap.delete(ing.name);
            merges++;
          }
        } else {
          throw e;
        }
      }
    }
  }

  // Second pass: merge "X leaves" -> "X" where X is a known herb
  const herbLeafMerges: [string, string][] = [
    ['thyme leaves', 'thyme'],
    ['oregano leaves', 'oregano'],
    ['mint leaves', 'mint'],
    ['coriander leaves', 'cilantro'],
    ['sage leaves', 'sage'],
  ];

  for (const [leafName, baseName] of herbLeafMerges) {
    const leafIng = await prisma.ingredient.findUnique({ where: { name: leafName } });
    const baseIng = await prisma.ingredient.findUnique({ where: { name: baseName } });
    if (leafIng && baseIng) {
      console.log(`  MERGE (herb leaves): "${leafName}" -> "${baseName}"`);
      await mergeIngredient(leafIng.id, leafName, baseIng.id, baseName);
      merges++;
    }
  }

  // Third pass: merge obvious duplicates that differ by descriptor
  const descriptorMerges: [string, string][] = [
    ['all-purpose flour for dredging', 'all-purpose flour'],
    ['all-purpose flour, divided', 'all-purpose flour'],
    ['all-purpose flour, or as needed', 'all-purpose flour'],
    ['extra-virgin olive oil', 'extra virgin olive oil'],
    ['extra-virgin olive oil, or to taste', 'extra virgin olive oil'],
    ['virgin olive oil', 'olive oil'],
    ['self-rising flour', 'self-raising flour'],
    ['half-and-half', 'half and half'],
    ['mozzarella cheese', 'mozzarella'],
    ['parmigiano-reggiano cheese', 'parmesan cheese'],
    ['pecorino romano cheese', 'pecorino cheese'],
    ['panko breadcrumbs', 'panko'],
    ['dry breadcrumbs', 'breadcrumbs'],
    ['dill weed', 'dill'],
    ['ground black pepper', 'black pepper'],
    ['white sugar', 'granulated sugar'],
    ['flour', 'all-purpose flour'],
    ['whipping cream', 'heavy whipping cream'],
    ['wheat flour', 'all-purpose flour'],
    ['cooked chicken', 'chicken'],
    ['cooked rice', 'rice'],
    ['red curry paste', 'curry paste'],
  ];

  for (const [oldName, newName] of descriptorMerges) {
    const oldIng = await prisma.ingredient.findUnique({ where: { name: oldName } });
    const newIng = await prisma.ingredient.findUnique({ where: { name: newName } });
    if (oldIng && newIng) {
      console.log(`  MERGE (descriptor): "${oldName}" -> "${newName}"`);
      await mergeIngredient(oldIng.id, oldName, newIng.id, newName);
      merges++;
    }
  }

  const after = await prisma.ingredient.count();
  console.log(`\nRenames: ${renames}`);
  console.log(`Merges: ${merges}`);
  console.log(`Deletions: ${deletions}`);
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
