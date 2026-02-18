import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive scan and fix
const FIXES: Record<string, string> = {
  // Plurals -> singular
  'tomatoes': 'tomato',
  'potatoes': 'potato',
  'green onions': 'green onion',
  'onions': 'onion',
  'peppers': 'bell pepper',
  'mushrooms': 'mushroom',
  'lemons': 'lemon',
  'limes': 'lime',
  'eggs': 'egg',
  'shallots': 'shallot',
  'scallions': 'scallion',
  'cloves': 'clove',
  'shrimps': 'shrimp',
  'mussels': 'mussel',
  'olives': 'olive',
  'capers': 'caper',
  'walnuts': 'walnut',
  'almonds': 'almond',
  'pine nuts': 'pine nut',
  'hazelnuts': 'hazelnut',
  'peanuts': 'peanut',
  'raisins': 'raisin',
  'dates': 'date',
  'prunes': 'prune',
  'apricots': 'apricot',
  'cherries': 'cherry',
  'strawberries': 'strawberry',
  'blueberries': 'blueberry',
  'raspberries': 'raspberry',
  'cranberries': 'cranberry',
  'anchovies': 'anchovy',
  'sardines': 'sardine',
  'artichokes': 'artichoke',
  'asparagus spears': 'asparagus',
  'green beans': 'green bean',
  'black beans': 'black bean',
  'kidney beans': 'kidney bean',
  'cannellini beans': 'cannellini bean',
  'chickpeas': 'chickpea',

  // Grated/shredded -> base
  'grated parmesan': 'parmesan cheese',
  'shredded mozzarella': 'mozzarella',
  'shredded cheddar': 'cheddar cheese',
  'shredded parmesan': 'parmesan cheese',
  'grated parmigiano-reggiano cheese': 'parmesan cheese',
  'grated or pureed and drained': 'DELETE',
  'pre-grated parmesan cheese': 'parmesan cheese',
  'shredded sharp cheddar cheese': 'cheddar cheese',
  'shredded colby jack cheese': 'colby jack cheese',
  'freshly grated parmesan cheese': 'parmesan cheese',

  // Fresh variants
  'fresh parsley': 'parsley',
  'fresh cilantro': 'cilantro',
  'fresh basil': 'basil',
  'fresh mint': 'mint',
  'fresh dill': 'dill',
  'fresh thyme': 'thyme',
  'fresh rosemary': 'rosemary',
  'fresh oregano': 'oregano',
  'fresh ginger': 'ginger',
  'fresh ginger root': 'ginger',
  'fresh lemon juice': 'lemon juice',
  'fresh lime juice': 'lime juice',
  'fresh spinach': 'spinach',
  'freshly ground pepper': 'black pepper',
  'fresh bread crumbs': 'bread crumbs',
  'fresh chives': 'chives',
  'fresh tarragon': 'tarragon',
  'fresh sage': 'sage',

  // Dried variants
  'dried oregano': 'oregano',
  'dried thyme': 'thyme',
  'dried basil': 'basil',
  'dried parsley': 'parsley',
  'dried rosemary': 'rosemary',
  'dried dill': 'dill',
  'dried apricots': 'dried apricot',
  'dried figs': 'dried fig',
  'dried cranberries': 'dried cranberry',
  'dried chickpeas': 'dried chickpea',

  // Ground variants
  'ground cumin': 'cumin',
  'ground coriander': 'coriander',
  'ground cinnamon': 'cinnamon',
  'ground ginger': 'ginger powder',
  'ground nutmeg': 'nutmeg',
  'ground cloves': 'ground clove',
  'ground turmeric': 'turmeric',
  'ground cardamom': 'cardamom',
  'ground allspice': 'allspice',
  'ground black pepper': 'black pepper',
  'ground white pepper': 'white pepper',

  // Misc duplicates
  'vegetable stock': 'vegetable broth',
  'beef stock': 'beef broth',
  'lamb stock': 'lamb broth',
  'fish stock': 'fish broth',
  'soy sauce': 'soy sauce',
  'low sodium soy sauce': 'soy sauce',
  'light soy sauce': 'soy sauce',
  'dark soy sauce': 'dark soy sauce',
  'sesame oil': 'sesame oil',
  'toasted sesame oil': 'sesame oil',
  'vegetable oil': 'vegetable oil',
  'canola oil': 'canola oil',
  'peanut oil': 'peanut oil',
  'corn oil': 'corn oil',
  'sunflower oil': 'sunflower oil',

  // Cheese consolidation
  'feta': 'feta cheese',
  'parmesan': 'parmesan cheese',
  'mozzarella cheese': 'mozzarella',
  'cream cheese': 'cream cheese',
  'ricotta': 'ricotta cheese',
  'goat cheese': 'goat cheese',
  'blue cheese': 'blue cheese',

  // Garlic forms
  'garlic cloves': 'garlic',
  'garlic powder': 'garlic powder',
  'garlic paste': 'garlic paste',
  'minced garlic': 'garlic',
  'roasted garlic': 'roasted garlic',

  // Sugar
  'white sugar': 'sugar',
  'brown sugar': 'brown sugar',
  'powdered sugar': 'powdered sugar',
  'confectioners sugar': 'powdered sugar',

  // Butter/margarine
  'unsalted butter': 'butter',
  'salted butter': 'butter',
  'melted butter': 'butter',

  // Cream
  'heavy cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  'heavy whipping cream': 'heavy cream',
  'light cream': 'light cream',
  'sour cream': 'sour cream',

  // Milk
  'whole milk': 'milk',
  'skim milk': 'skim milk',
  '2% milk': 'milk',
  'buttermilk': 'buttermilk',
  'coconut milk': 'coconut milk',
  'evaporated milk': 'evaporated milk',
  'condensed milk': 'condensed milk',

  // Misc cleanup
  'panko bread crumbs': 'panko',
  'italian bread crumbs': 'italian bread crumbs',
  'large eggs': 'egg',
  'large egg': 'egg',
  'egg yolks': 'egg yolk',
  'egg whites': 'egg white',
  'corn starch': 'cornstarch',
};

async function refinePhase3() {
  console.log('=== INGREDIENT REFINEMENT PHASE 3 ===\n');

  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  console.log(`Total ingredients: ${ingredients.length}\n`);

  // Build map
  const existingNames = new Map<string, string>();
  for (const ing of ingredients) {
    existingNames.set(ing.name.toLowerCase(), ing.id);
  }

  let fixed = 0, deleted = 0, merged = 0, skipped = 0;

  for (const [oldName, action] of Object.entries(FIXES)) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name: oldName.toLowerCase() } });
    if (!ingredient) continue;

    if (action === 'DELETE') {
      const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ingredient.id } });
      const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ingredient.id } });

      if (recipeCount === 0 && shoppingCount === 0) {
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        console.log(`DELETED: "${oldName}"`);
        deleted++;
      } else {
        console.log(`KEPT (in use): "${oldName}" - ${recipeCount} recipes, ${shoppingCount} shopping`);
        skipped++;
      }
      continue;
    }

    const targetId = existingNames.get(action.toLowerCase());

    if (targetId && targetId !== ingredient.id) {
      await mergeIngredient(ingredient.id, targetId, oldName, action);
      merged++;
    } else if (!targetId) {
      try {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { name: action.toLowerCase() },
        });
        existingNames.set(action.toLowerCase(), ingredient.id);
        console.log(`RENAMED: "${oldName}" -> "${action}"`);
        fixed++;
      } catch (e) {
        console.log(`ERROR: could not rename "${oldName}"`);
        skipped++;
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Renamed: ${fixed}`);
  console.log(`Merged: ${merged}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Skipped: ${skipped}`);

  // Final count
  const finalCount = await prisma.ingredient.count();
  console.log(`\nFinal ingredient count: ${finalCount}`);

  // List any remaining problematic ingredients
  console.log('\n=== REMAINING ISSUES TO REVIEW ===');
  const remaining = await prisma.ingredient.findMany({
    where: {
      OR: [
        { name: { contains: ' to taste' } },
        { name: { contains: 'tablespoon' } },
        { name: { contains: 'teaspoon' } },
        { name: { contains: 'cup ' } },
        { name: { contains: 'cups ' } },
        { name: { startsWith: 'and ' } },
        { name: { contains: '/' } },
        { name: { contains: '(' } },
        { name: { contains: ')' } },
        { name: { startsWith: '½' } },
        { name: { startsWith: '¼' } },
        { name: { startsWith: '⅓' } },
        { name: { contains: 'chopped' } },
        { name: { contains: 'diced' } },
        { name: { contains: 'sliced' } },
        { name: { contains: 'minced' } },
      ],
    },
    orderBy: { name: 'asc' },
  });

  if (remaining.length > 0) {
    for (const ing of remaining) {
      const count = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      console.log(`  "${ing.name}" (${count} usages)`);
    }
  } else {
    console.log('  None found!');
  }

  await prisma.$disconnect();
}

async function mergeIngredient(sourceId: string, targetId: string, sourceName: string, targetName: string) {
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId: sourceId },
  });

  for (const ri of recipeIngredients) {
    const existing = await prisma.recipeIngredient.findFirst({
      where: { recipeId: ri.recipeId, ingredientId: targetId },
    });

    if (existing) {
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
      await prisma.recipeIngredient.update({
        where: { id: ri.id },
        data: { ingredientId: targetId },
      });
    }
  }

  const shoppingItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: sourceId },
  });

  for (const item of shoppingItems) {
    const existing = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId: item.shoppingListId, ingredientId: targetId },
    });

    if (existing) {
      await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
      await prisma.shoppingListItem.delete({ where: { id: item.id } });
    } else {
      await prisma.shoppingListItem.update({
        where: { id: item.id },
        data: { ingredientId: targetId },
      });
    }
  }

  try {
    await prisma.ingredient.delete({ where: { id: sourceId } });
    console.log(`MERGED: "${sourceName}" -> "${targetName}"`);
  } catch (e) {
    console.log(`MERGED (kept source): "${sourceName}" -> "${targetName}"`);
  }
}

refinePhase3().catch(console.error);
