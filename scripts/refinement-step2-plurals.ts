/**
 * Step 2: Merge Plural Duplicates
 * Finds ingredients where both singular and plural forms exist,
 * merges the plural into the singular.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Plural -> Singular mappings to check
function getSingular(name: string): string | null {
  // Common patterns: -es endings for -o words
  const esOwords = ['tomatoes', 'potatoes', 'avocados'];
  if (esOwords.includes(name)) return name.replace(/es$/, '');

  // -ies -> -y (e.g., berries -> berry, cherries -> cherry)
  if (name.endsWith('ies')) {
    return name.replace(/ies$/, 'y');
  }

  // -ves -> -f (e.g., halves -> half, leaves -> leaf)
  if (name.endsWith('ves')) {
    return name.replace(/ves$/, 'f');
  }

  // -es endings (general)
  if (name.endsWith('es') && !name.endsWith('ies')) {
    const withoutEs = name.slice(0, -2);
    const withoutS = name.slice(0, -1);
    // Try -es first, then -s
    return withoutEs;
  }

  // -s endings (general)
  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1);
  }

  return null;
}

async function mergeIngredient(pluralId: string, pluralName: string, singularId: string, singularName: string) {
  console.log(`  Merging "${pluralName}" -> "${singularName}"`);

  // 1. Get all RecipeIngredient rows referencing the plural ingredient
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId: pluralId }
  });

  for (const ri of recipeIngredients) {
    // Check if the singular ingredient already exists in this recipe
    const existing = await prisma.recipeIngredient.findUnique({
      where: {
        recipeId_ingredientId: {
          recipeId: ri.recipeId,
          ingredientId: singularId
        }
      }
    });

    if (existing) {
      // Same recipe has both plural and singular - combine quantities if same unit
      if (existing.unit === ri.unit) {
        const newQty = Math.round((existing.quantity + ri.quantity) * 100) / 100;
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { quantity: newQty, notes: [existing.notes, ri.notes].filter(Boolean).join('; ') || null }
        });
      } else {
        // Different units - keep the existing, move notes
        const combinedNotes = [existing.notes, `Also: ${ri.quantity} ${ri.unit}`, ri.notes].filter(Boolean).join('; ');
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { notes: combinedNotes || null }
        });
      }
      // Delete the duplicate row
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
      // No conflict - just update the ingredientId
      await prisma.recipeIngredient.update({
        where: { id: ri.id },
        data: { ingredientId: singularId }
      });
    }
  }

  // 2. Update ShoppingListItem references
  const shopItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: pluralId }
  });

  for (const si of shopItems) {
    await prisma.shoppingListItem.update({
      where: { id: si.id },
      data: { ingredientId: singularId }
    });
  }

  // 3. Delete the plural ingredient
  await prisma.ingredient.delete({ where: { id: pluralId } });
}

async function main() {
  const before = await prisma.ingredient.count();
  console.log(`\n=== Step 2: Merge Plural Duplicates ===`);
  console.log(`Ingredients before: ${before}\n`);

  // Get all ingredients
  const all = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  const nameMap = new Map<string, typeof all[0]>();
  for (const ing of all) {
    nameMap.set(ing.name, ing);
  }

  let mergeCount = 0;

  // Check each ingredient to see if its singular form exists
  for (const ing of all) {
    const singular = getSingular(ing.name);
    if (singular && singular !== ing.name && nameMap.has(singular)) {
      const singularIng = nameMap.get(singular)!;
      // Only merge if we haven't already deleted the plural
      const stillExists = await prisma.ingredient.findUnique({ where: { id: ing.id } });
      if (stillExists) {
        await mergeIngredient(ing.id, ing.name, singularIng.id, singularIng.name);
        nameMap.delete(ing.name);
        mergeCount++;
      }
    }
  }

  // Also check known plural patterns that the simple function might miss
  const knownPairs: [string, string][] = [
    ['almonds', 'almond'],
    ['anchovies', 'anchovy'],
    ['avocados', 'avocado'],
    ['carrots', 'carrot'],
    ['chickpeas', 'chickpea'],
    ['cloves', 'clove'],
    ['eggs', 'egg'],
    ['mussels', 'mussel'],
    ['olives', 'olive'],
    ['onions', 'onion'],
    ['oranges', 'orange'],
    ['potatoes', 'potato'],
    ['shallots', 'shallot'],
    ['tomatoes', 'tomato'],
    ['walnuts', 'walnut'],
    ['bay leaves', 'bay leaf'],
    ['basil leaves', 'basil'],
    ['coriander seeds', 'coriander seed'],
    ['cherry tomatoes', 'cherry tomato'],
    ['beef steaks', 'beef steak'],
    ['capers', 'caper'],
    ['star anises', 'star anise'],
    ['oyster mushrooms', 'oyster mushroom'],
    ['bread crumbs', 'breadcrumbs'],
    ['pine nuts', 'pine nut'],
    ['red peppers', 'red pepper'],
    ['poppy seeds', 'pumpkin seeds'],  // skip this one, they're different
    ['leaves', 'leaf'],
    ['leaves leaf', 'leaf'],
    ['halves', 'half'],
    ['yolks', 'yolk'],
    ['whites', 'egg white'],
  ];

  for (const [plural, singular] of knownPairs) {
    if (plural === 'poppy seeds') continue; // skip the wrong pair above
    const pluralIng = nameMap.get(plural);
    const singularIng = nameMap.get(singular);
    if (pluralIng && singularIng) {
      const stillExists = await prisma.ingredient.findUnique({ where: { id: pluralIng.id } });
      if (stillExists) {
        await mergeIngredient(pluralIng.id, plural, singularIng.id, singular);
        nameMap.delete(plural);
        mergeCount++;
      }
    }
  }

  const after = await prisma.ingredient.count();
  console.log(`\nMerges performed: ${mergeCount}`);
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
