/**
 * Step 6: Find and Remove Garbage Fragments
 * - Very short names (1-2 characters)
 * - Names that are prep instructions, not ingredients
 * - Numeric fragments
 * - Empty or whitespace-only names
 * - "ounce)" prefixed product descriptions
 * - Names starting with dashes, "or", "and"
 * - Other clearly non-ingredient entries
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Known garbage patterns - these are prep instructions or meaningless fragments
const GARBAGE_EXACT: string[] = [
  'beaten', 'chopped', 'diced', 'finely chopped', 'finely diced',
  'minced', 'quartered', 'sliced', 'thinly sliced', 'shredded',
  'cut into large chunks', 'cut into thin matchsticks', 'cut into wedges',
  'peeled and cubed', 'peeled and cut lengthwise into 1/2 inch thick slices',
  'seeded and diced', 'then halved', 'halved',
  'for frying', 'or', 'or brandy', 'or lemon juice', 'or margarine',
  'or boston lettuce', 'or white pepper', 'or other curly shaped pasta',
  'confectioners\' sugar', // probably powdered sugar
  'spices', 'seeds', 'leaves',
  'onions', 'carrots', 'potatoes', 'mushrooms', 'bananas', 'peppers',
  'radishes', 'eggs', 'cloves', 'tomatoes',
  'broccoli florets',
];

// Patterns that indicate garbage (start/contain)
const GARBAGE_PATTERNS = [
  /^- /,                      // Starts with dash
  /^ounce\)/,                 // Product size descriptions
  /^inch\)/,                  // Size descriptions
  /^pound\)/,                 // Size descriptions
  /^(such as|maid|breakstone)/i,  // Brand references
  /^\d+$/,                    // Pure numbers
  /^[a-z]$/,                  // Single character
  /^[a-z]{1,2}$/,             // 1-2 character names
  /^skinless$/,               // Prep descriptor
  /^boneless$/,               // Prep descriptor
];

// Garbage names that should be mapped to real ingredients when possible
const GARBAGE_TO_INGREDIENT: Record<string, string> = {
  'confectioners\' sugar': 'powdered sugar',
  'broccoli florets': 'broccoli',
  'or brandy': 'brandy',
  'or lemon juice': 'lemon juice',
  'or margarine': 'margarine',
  'onions': 'onion',
  'carrots': 'carrot',
  'potatoes': 'potato',
  'mushrooms': 'mushroom',
  'bananas': 'banana',
  'peppers': 'pepper',
  'radishes': 'radish',
  'eggs': 'egg',
  'cloves': 'clove',
  'tomatoes': 'tomato',
  'leaves': 'bay leaf',
  'spices': 'mixed herbs',
};

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

// Additional specific mappings for "ounce)" entries based on their content
function parseOunceEntry(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('chicken thigh')) return 'chicken thighs';
  if (lower.includes('chicken breast')) return 'chicken breast';
  if (lower.includes('anchovy')) return 'anchovies';
  if (lower.includes('cherry pie')) return null; // delete
  if (lower.includes('chickpea')) return 'chickpea';
  if (lower.includes('coconut milk')) return 'coconut milk';
  if (lower.includes('crushed tomato')) return 'canned tomatoes';
  if (lower.includes('diced tomato')) return 'canned tomatoes';
  if (lower.includes('stewed tomato')) return 'canned tomatoes';
  if (lower.includes('peeled and diced tomato')) return 'canned tomatoes';
  if (lower.includes('italian plum tomato')) return 'canned tomatoes';
  if (lower.includes('tomato sauce')) return 'tomato sauce';
  if (lower.includes('garbanzo')) return 'chickpea';
  if (lower.includes('sardine')) return 'sardines';
  if (lower.includes('water chestnut')) return 'bamboo shoots';
  if (lower.includes('tuna')) return 'tuna';
  if (lower.includes('whole kernel corn')) return 'corn';
  if (lower.includes('black bean')) return 'black beans';
  if (lower.includes('chicken broth')) return 'chicken broth';
  if (lower.includes('pinto bean')) return 'pinto beans';
  if (lower.includes('cod')) return 'cod';
  if (lower.includes('whipped topping')) return null; // delete
  if (lower.includes('chocolate-hazelnut')) return null; // delete
  if (lower.includes('roasted red pepper')) return 'roasted red peppers';
  if (lower.includes('french bread')) return 'french bread';
  if (lower.includes('active dry yeast')) return 'dry yeast';
  if (lower.includes('cream cheese')) return 'cream cheese';
  if (lower.includes('taco seasoning')) return null; // delete
  if (lower.includes('kasseri')) return 'kasseri cheese';
  if (lower.includes('mushroom')) return 'mushroom';
  if (lower.includes('thai basil')) return 'basil';
  if (lower.includes('tortellini')) return null; // delete
  if (lower.includes('okra')) return 'okra';
  if (lower.includes('ladyfinger')) return null; // delete
  if (lower.includes('philadelphia')) return 'cream cheese';
  return null;
}

async function main() {
  const before = await prisma.ingredient.count();
  console.log(`\n=== Step 6: Remove Garbage Fragments ===`);
  console.log(`Ingredients before: ${before}\n`);

  const all = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });

  let deletions = 0;
  let merges = 0;
  let skipped = 0;

  for (const ing of all) {
    const stillExists = await prisma.ingredient.findUnique({ where: { id: ing.id } });
    if (!stillExists) continue;

    const name = ing.name;
    let isGarbage = false;
    let targetName: string | null = null;

    // Check exact matches first
    if (GARBAGE_EXACT.includes(name)) {
      isGarbage = true;
      targetName = GARBAGE_TO_INGREDIENT[name] || null;
    }

    // Check patterns
    if (!isGarbage) {
      for (const pattern of GARBAGE_PATTERNS) {
        if (pattern.test(name)) {
          isGarbage = true;
          break;
        }
      }
    }

    // Check "ounce)" entries
    if (!isGarbage && name.startsWith('ounce)')) {
      isGarbage = true;
      targetName = parseOunceEntry(name);
    }

    // Check other specific garbage
    if (!isGarbage) {
      const specificGarbage = [
        'bell pepper - stemmed', 'fire-roasted red bell peppers - peeled',
        'shrimp - peeled', 'smith apples - peeled',
        'pita breads', 'boneless chicken breast halves',
        'boneless chicken thighs', 'anaheim chile peppers',
        'cherry tomatoes', 'chile peppers', 'chile pepper',
        'fresh basil leaves', 'fresh ginger root', 'ginger root',
        'marjoram leaves', 'cilantro leaves',
        'diced carrots', 'diced sweet potatoes', 'seeded diced cucumber',
        'stir-fry sauce', 'pizza sauce', 'chili sauce',
        'kosher salt and freshly ground black pepper',
        'salt and freshly ground pepper', 'salt and ground black pepper',
        'salt and pepper', 'sea salt',
        'baking spray', 'cooking oats', 'coarse bulgur',
        'beer', 'rum', 'buns', 'wrappers', 'skewers',
        'hamburger buns', 'meat', 'crabmeat',
        'cracker crumbs', 'maid graham cracker crumbs',
        'prepared graham cracker crust', 'inch) prepared graham cracker crust',
        'pancake/waffle mix', 'pepperjack cheese',
        'european-style butter', 'garlic light cream cheese',
        'concentrated tomato paste', 'or puréed tomato',
        'tomato purée', 'onion and tomatoes',
        'breakstone\'s', 'brewed coffee', 'lager-style beer',
        'de cabra pepper', 'seasoning blend', 'bagel seasoning',
        'ground cardamom', 'ground walnuts', 'ground peanuts',
        'pepper flakes', 'roasted almonds', 'roasted red peppers',
        'cooked deli roast beef', 'slices cooked ham',
        'thai chilies', 'medium shrimp', 'mahi fillets',
        'skinless chicken breast halves', 'skinless chicken breasts',
        'beef bouillon', 'beef stew meat',
        'inch) wooden skewers', 'inch) flour tortillas',
        'spanish-style chorizo', 'provolone cheese',
        'zest of one orange', 'orange segments',
        'dijon-style mustard', 'matchsticks',
        'peppers cut into thin matchsticks',
        '(such as abita turbodog)', 'for frying',
        'juiced', 'lightly beaten',
        'light strained yogurt', 'milk greek yogurt',
        'olive oil', // We already have "extra virgin olive oil" as the main one
        'balsamic cream',
        'low sodium garbanzo beans',
        'chocolate chips', 'bittersweet chocolate',
        'chipotle peppers', 'jalapeno pepper',
        'curry paste',  // Already merged vague "paste" into this
      ];

      // Only mark as garbage the entries that clearly have better alternatives or are truly garbage
      // Let's be more conservative here
    }

    // More conservative approach: only handle truly garbage entries
    if (!isGarbage) {
      // Names that are just prep instructions with no ingredient
      if (['beaten', 'chopped', 'diced', 'minced', 'quartered', 'sliced',
           'shredded', 'finely chopped', 'finely diced', 'thinly sliced',
           'for frying', 'halved', 'then halved'].includes(name)) {
        isGarbage = true;
      }
      // Empty or very short
      if (name.trim().length <= 2 && !['5-spices mix'].some(n => n === name)) {
        isGarbage = true;
      }
    }

    if (!isGarbage) continue;

    const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const shopUsage = await prisma.shoppingListItem.count({ where: { ingredientId: ing.id } });

    if (targetName) {
      // Try to merge into target
      const target = await prisma.ingredient.findUnique({ where: { name: targetName } });
      if (target) {
        console.log(`  MERGE: "${name}" -> "${targetName}" (${usage} recipes, ${shopUsage} shop items)`);
        await mergeIngredient(ing.id, name, target.id, targetName);
        merges++;
        continue;
      }
    }

    if (usage === 0 && shopUsage === 0) {
      console.log(`  DELETE (unused): "${name}"`);
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    } else if (usage > 0) {
      // For ounce) entries with recipe refs but no target, try to find target
      if (name.startsWith('ounce)')) {
        const target = parseOunceEntry(name);
        if (target) {
          const targetIng = await prisma.ingredient.findUnique({ where: { name: target } });
          if (targetIng) {
            console.log(`  MERGE: "${name}" -> "${target}" (${usage} recipes)`);
            await mergeIngredient(ing.id, name, targetIng.id, target);
            merges++;
            continue;
          }
        }
      }

      // Delete RecipeIngredient rows for pure garbage (prep instructions)
      if (['beaten', 'chopped', 'diced', 'minced', 'quartered', 'sliced',
           'shredded', 'finely chopped', 'finely diced', 'thinly sliced',
           'for frying', 'halved', 'then halved', 'or'].includes(name)) {
        console.log(`  DELETE refs + ingredient: "${name}" (${usage} recipe refs removed)`);
        await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
        await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
        await prisma.ingredient.delete({ where: { id: ing.id } });
        deletions++;
      } else {
        console.log(`  SKIP (has ${usage} recipe refs): "${name}"`);
        skipped++;
      }
    } else {
      // shopUsage > 0 only
      console.log(`  DELETE shop refs + ingredient: "${name}" (${shopUsage} shop items)`);
      await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    }
  }

  // Second pass: handle the "ounce)" entries more aggressively
  console.log('\n--- Second pass: ounce) entries ---');
  const ounceEntries = await prisma.ingredient.findMany({
    where: { name: { startsWith: 'ounce)' } }
  });

  for (const ing of ounceEntries) {
    const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const target = parseOunceEntry(ing.name);

    if (target) {
      const targetIng = await prisma.ingredient.findUnique({ where: { name: target } });
      if (targetIng) {
        console.log(`  MERGE: "${ing.name}" -> "${target}" (${usage} recipes)`);
        await mergeIngredient(ing.id, ing.name, targetIng.id, target);
        merges++;
        continue;
      }
    }

    if (usage === 0) {
      console.log(`  DELETE (unused ounce): "${ing.name}"`);
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    } else {
      // Delete refs for unmappable ounce entries
      console.log(`  DELETE refs + ingredient (unmappable ounce): "${ing.name}" (${usage} refs)`);
      await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    }
  }

  // Third pass: handle "inch)" and "pound)" entries
  console.log('\n--- Third pass: inch)/pound) entries ---');
  const sizeEntries = await prisma.ingredient.findMany({
    where: {
      OR: [
        { name: { startsWith: 'inch)' } },
        { name: { startsWith: 'pound)' } },
      ]
    }
  });

  for (const ing of sizeEntries) {
    const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const lower = ing.name.toLowerCase();

    let target: string | null = null;
    if (lower.includes('beef chuck')) target = 'beef chuck';
    else if (lower.includes('flour tortilla')) target = 'flour tortillas';
    else if (lower.includes('graham cracker')) target = null; // delete
    else if (lower.includes('wooden skewer')) target = null; // delete

    if (target) {
      const targetIng = await prisma.ingredient.findUnique({ where: { name: target } });
      if (targetIng) {
        console.log(`  MERGE: "${ing.name}" -> "${target}" (${usage} recipes)`);
        await mergeIngredient(ing.id, ing.name, targetIng.id, target);
        merges++;
        continue;
      }
    }

    if (usage === 0) {
      console.log(`  DELETE (unused): "${ing.name}"`);
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    } else {
      console.log(`  DELETE refs + ingredient: "${ing.name}" (${usage} refs)`);
      await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    }
  }

  // Fourth pass: handle remaining "- " prefixed entries (dash entries that had recipe refs)
  console.log('\n--- Fourth pass: dash-prefixed entries ---');
  const dashEntries = await prisma.ingredient.findMany({
    where: { name: { startsWith: '- ' } }
  });

  for (const ing of dashEntries) {
    const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    console.log(`  DELETE refs + ingredient: "${ing.name}" (${usage} refs)`);
    await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
    await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
    deletions++;
  }

  // Fifth pass: handle "(such as..." entries
  console.log('\n--- Fifth pass: (such as...) entries ---');
  const suchAsEntries = await prisma.ingredient.findMany({
    where: { name: { startsWith: '(such as' } }
  });

  for (const ing of suchAsEntries) {
    const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    if (usage === 0) {
      console.log(`  DELETE (unused): "${ing.name}"`);
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    } else {
      console.log(`  DELETE refs + ingredient: "${ing.name}" (${usage} refs)`);
      await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.shoppingListItem.deleteMany({ where: { ingredientId: ing.id } });
      await prisma.ingredient.delete({ where: { id: ing.id } });
      deletions++;
    }
  }

  const after = await prisma.ingredient.count();
  console.log(`\nMerges: ${merges}`);
  console.log(`Deletions: ${deletions}`);
  console.log(`Skipped: ${skipped}`);
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
