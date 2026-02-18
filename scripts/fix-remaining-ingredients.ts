import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Direct ingredient name fixes
const DIRECT_FIXES: Record<string, string> = {
  // Malformed entries (prep instructions as ingredient)
  '- peeled, pitted and diced': 'avocado',
  '- peeled, pitted and sliced': 'avocado',
  '- peeled, pitted, and sliced': 'avocado',
  '- peeled, pitted, and thinly sliced': 'avocado',
  'peeled, cut into small strips': 'ginger',
  'sliced, or to taste': 'jalapeno',
  'seeds, or to taste': 'sesame seeds',
  'sliced green onions, or more to taste': 'green onion',

  // Greek ingredients
  'ξύσμα λεμονιού (από 2 λεμόνια)': 'lemon zest',
  'σκόρδο (ψιλοκομμένες)': 'garlic',
  'χυμό λεμονιού (από 2 λεμόνια)': 'lemon juice',
  'spaghetti (νο6)': 'spaghetti',

  // Fraction/measurement prefixes
  '¼ cup olive oil, divided': 'olive oil',
  '¾ teaspoon salt, divided': 'salt',
  '⅓ cup finely shredded parmesan cheese (1 1/2 ounces)': 'parmesan cheese',
  'cups water, plus more as needed': 'water',
  'teaspoon cumin (ground)': 'ground cumin',
  'teaspoon cumin (powder)': 'ground cumin',

  // Flour
  'all-purpose flour (for breading)': 'all-purpose flour',
  'all-purpose flour (for the breading)': 'all-purpose flour',

  // Herbs with prep
  'parsley (finely chopped)': 'parsley',
  'parsley (finely chopped + extra to serve)': 'parsley',
  'parsley (fresh)': 'parsley',
  'parsley (only the leaves)': 'parsley',
  'parsley (optionally)': 'parsley',
  'parsley (some)': 'parsley',
  'parsley, chopped': 'parsley',
  'parsley, stems removed': 'parsley',
  'minced parsley, divided': 'parsley',
  'fresh parsley, divided': 'parsley',
  'cilantro, chopped': 'cilantro',
  'cilantro, or to taste': 'cilantro',
  'fresh cilantro, divided': 'cilantro',
  'dill (finely chopped)': 'dill',
  'dill (some)': 'dill',
  'basil (finely chopped)': 'basil',
  'basil (fresh)': 'basil',
  'mint (only the leaves)': 'mint',
  'mint leaves, chopped': 'mint',
  'oregano (dried)': 'oregano',
  'oregano (dry)': 'oregano',
  'oregano (finely chopped)': 'oregano',
  'oregano (fresh)': 'oregano',
  'fresh oregano, plus more for garnish': 'oregano',
  'thyme (dry)': 'thyme',
  'thyme (finely chopped)': 'thyme',
  'thyme (fresh)': 'thyme',
  'thyme (fresh, only the leaves +extra to serve)': 'thyme',
  'thyme (to serve)': 'thyme',
  'rosemary (finely chopped)': 'rosemary',
  'coriander (finely chopped)': 'coriander',
  'chives (finely chopped)': 'chives',
  'herbs (fresh)': 'mixed fresh herbs',

  // Onions
  'onion (dry)': 'onion',
  'onion (medium)': 'onion',
  'onion (roasted)': 'onion',
  'onion, chopped': 'onion',
  'onion, cut in half and thinly sliced': 'onion',
  'onion, cut into 1/2-inch dice': 'onion',
  'onion, cut into chunks': 'onion',
  'onion, diced': 'onion',
  'onion, minced': 'onion',
  'onion, sliced': 'onion',
  'onion, thinly sliced': 'onion',
  'onions (thinly sliced)': 'onion',
  'onions, chopped': 'onion',
  'onions, chopped, divided': 'onion',
  'onions, chopped, or to taste': 'onion',
  'onions, finely chopped': 'onion',
  'onions, sliced': 'onion',
  'onions, thinly sliced': 'onion',
  'green onion, or to taste': 'green onion',

  // Garlic
  'garlic, chopped': 'garlic',
  'garlic, crushed': 'garlic',
  'garlic, minced': 'garlic',
  'garlic, minced, divided': 'garlic',
  'garlic, pressed': 'garlic',
  'garlic, whole': 'garlic',
  'of garlic ((optional))': 'garlic',
  'of garlic (finely chopped)': 'garlic',

  // Tomatoes
  'tomatoes (grated)': 'tomato',
  'tomatoes (medium)': 'tomato',
  'tomatoes, chopped': 'tomato',
  'tomatoes, diced': 'tomato',
  'tomatoes, halved': 'tomato',
  'tomato, seeded and chopped': 'tomato',
  'tomato, seeded and diced': 'tomato',
  'tomato, sliced': 'tomato',
  '(plum) tomatoes, halved': 'plum tomato',
  'cherry tomatoes (roasted)': 'cherry tomatoes',

  // Bell peppers
  'bell pepper, chopped': 'bell pepper',
  'bell pepper, cut into 1/2-inch dice': 'bell pepper',
  'bell pepper, cut into bite-sized pieces': 'bell pepper',
  'bell pepper, diced': 'bell pepper',
  'bell pepper, julienned': 'bell pepper',
  'bell pepper, sliced, or more to taste': 'bell pepper',
  'florina pepper (red pepper)': 'florina pepper',
  'green, or yellow bell pepper, cut into 1" pieces': 'bell pepper',

  // Carrots
  'carrot, peeled and chopped': 'carrot',
  'carrot (eeled and cut into pieces that are 7 mm thick)': 'carrot',
  'carrots, chopped': 'carrot',
  'carrots, coarsely grated': 'carrot',
  'carrots, peeled and grated': 'carrot',
  'carrots, sliced': 'carrot',

  // Celery
  'celery (cut into pieces that are 7 mm thick)': 'celery',
  'celery with leaves, chopped': 'celery',
  'celery, chopped': 'celery',

  // Potatoes
  'potato, diced': 'potato',
  'potato, peeled and cubed': 'potato',
  'potatoes (medium)': 'potato',
  'potatoes (peeled)': 'potato',
  'potatoes (small)': 'potato',
  'potatoes, peeled and diced': 'potato',
  'baby potatoes (boiled)': 'baby potatoes',

  // Other vegetables
  'cucumber, thinly sliced': 'cucumber',
  'zucchini, diced small': 'zucchini',
  'zucchinis (medium)': 'zucchini',
  'eggplant, cubed': 'eggplant',
  'lettuce, shredded': 'lettuce',
  'cabbage (red)': 'red cabbage',
  'cabbage (white)': 'cabbage',
  'cabbage, finely shredded': 'cabbage',
  'green cabbage, cut into 1 1/2-inch pieces': 'green cabbage',
  'lentils, rinsed': 'lentils',
  'spinach, rinsed and chopped': 'spinach',

  // Proteins
  'chicken (in portions)': 'chicken',
  'chicken breasts, cut into large chunks': 'chicken breast',
  'chicken breasts, shredded': 'chicken breast',
  'chicken breast fillet (sautéed)': 'chicken breast',
  'skin-on chicken thighs (about 2 1/2 pounds)': 'chicken thighs',
  'skinless, boneless chicken breast halves': 'chicken breast',
  'skinless, boneless chicken breast halves, cut into bite size pieces': 'chicken breast',
  'boneless chicken breast halves - cut into chunks': 'chicken breast',
  'beef (leg, boneless, cut into 2 cm cubes)': 'beef',
  'beef (rump)': 'beef rump',
  'ground beef (brisket)': 'ground beef',
  'ground beef (chuck)': 'ground beef',
  'lamb shoulder, cut into 1/2 -inch pieces': 'lamb shoulder',
  'leg of lamb (boneless)': 'leg of lamb',
  'leg of lamb, cut into 3-inch pieces': 'leg of lamb',
  'bacon, cut into 1/2 inch pieces': 'bacon',

  // Seafood
  'medium shrimp, peeled and deveined': 'shrimp',
  'shrimp, peeled and deveined': 'shrimp',
  'shrimp - peeled, deveined and chopped': 'shrimp',
  'shrimps (colossal, shell-on)': 'shrimp',
  'shrimps (frozen)': 'shrimp',
  'salmon, chopped': 'salmon',
  'salmon, cut into long strips': 'salmon',
  'sashimi-grade salmon, cut into small cubes': 'salmon',

  // Eggs & dairy
  'egg (medium)': 'egg',
  'eggs (hard-boiled)': 'egg',
  'eggs (medium)': 'egg',
  'egg, lightly beaten': 'egg',
  'eggs, lightly beaten': 'egg',
  'egg yolks (from medium eggs)': 'egg yolk',
  'egg yolks (of medium eggs)': 'egg yolk',
  'butter, cut into cubes': 'butter',
  'butter, softened': 'butter',
  'cheese, crumbled': 'feta cheese',
  'cheese, diced': 'cheese',
  'cheese, softened': 'cream cheese',
  'cheese, thinly sliced': 'cheese',
  'parmesan cheese (grated)': 'parmesan cheese',
  'pecorino cheese (grated)': 'pecorino cheese',
  'gruyere cheese (grated)': 'gruyere cheese',
  'gruyère cheese, at room temperature': 'gruyere cheese',
  'mozzarella (grated)': 'mozzarella',
  'swiss cheese, divided': 'swiss cheese',
  'cheddar or monterey jack cheese': 'cheddar cheese',

  // Citrus
  'lemon (in slices)': 'lemon',
  'lemon (in wedges)': 'lemon',
  'lemon (wedges)': 'lemon',
  'lemons, juiced, or as needed': 'lemon juice',
  'lemon juice (from 1 lemon)': 'lemon juice',
  'lemon juice (from 2 lemons)': 'lemon juice',
  'lemon juice (of 1 lemon)': 'lemon juice',
  'lemon juice (of 1 1/2 lemon)': 'lemon juice',
  'lemon juice (of 1-2 lemons)': 'lemon juice',
  'lemon juice (of 2 lemons)': 'lemon juice',
  'lemon zest (from 1 lemon)': 'lemon zest',
  'lemon zest (from 2 lemons)': 'lemon zest',
  'lemon zest (of 1 lemon)': 'lemon zest',
  'lemon zest (of 1-2 lemons)': 'lemon zest',
  'lemon zest (of 2 lemons)': 'lemon zest',
  'lemon peels (of 1 lemon)': 'lemon peel',
  'lime juice (from 1 lime)': 'lime juice',
  'lime juice (from about 4 limes)': 'lime juice',
  'lime juice (of 1/2 lime)': 'lime juice',
  'lime juice (of 2 limes)': 'lime juice',
  'lime juice (of 3 limes)': 'lime juice',
  'lime zest (from 2 limes)': 'lime zest',
  'lime zest (of 1/2 lime)': 'lime zest',
  'lime zest (of 2 limes)': 'lime zest',
  'lime(s)': 'lime',
  'avocado(s)': 'avocado',

  // Oils & vinegars
  'olive oil (for sautéing)': 'olive oil',
  'olive oil (to sauté chicken fillets)': 'olive oil',
  'olive oil (to sauté vegetables)': 'olive oil',
  'extra-virgin olive oil, plus more for garnish': 'extra virgin olive oil',
  'sunflower oil (for the frying)': 'sunflower oil',
  'seed oil (for frying)': 'vegetable oil',
  'oil, divided': 'vegetable oil',
  'oil, or as needed': 'vegetable oil',
  'oil, or more as needed': 'vegetable oil',
  'oil, plus more as needed': 'vegetable oil',
  'vinegar (of white wine)': 'white wine vinegar',
  'vinegar (white)': 'white vinegar',
  'vinegar, or to taste': 'vinegar',
  'white wine (dry)': 'white wine',

  // Seasonings
  'salt (generous amount)': 'salt',
  'salt, divided, or to taste': 'salt',
  'salt, or to taste': 'salt',
  'salt, plus more to taste': 'salt',
  'black pepper, to taste': 'black pepper',
  'pepper (freshly ground)': 'black pepper',
  'pepper (generous amount)': 'pepper',
  'pepper (ground)': 'pepper',
  'pepper flakes, or to taste': 'red pepper flakes',
  'pepper, chopped, or to taste': 'jalapeno',
  'pepper, or to taste': 'pepper',
  'pepper, sliced, or to taste': 'jalapeno',
  'paprika (sweet)': 'sweet paprika',
  'turmeric (powder)': 'turmeric',
  'ginger, or to taste': 'ginger',
  'hot sauce, plus more to taste if desired': 'hot sauce',

  // Water
  'water (110 degrees f/45 degrees c)': 'water',
  'water (at room temperature)': 'water',
  'water (boiling)': 'water',
  'water (for the bouillon cube)': 'water',
  'water (hot)': 'water',
  'water (warm)': 'water',
  'water, or enough to cover': 'water',
  'water, or more to taste': 'water',
  'water, or to taste': 'water',
  '½ cup reduced sodium chicken broth': 'chicken broth',

  // Canned goods
  'ounce) can chickpeas, drained': 'chickpeas',
  'ounce) can chickpeas, drained and rinsed': 'chickpeas',
  'ounce) can crushed tomatoes': 'crushed tomatoes',
  'ounce) can diced tomatoes, undrained': 'diced tomatoes',
  'ounce) can garbanzo beans (chickpeas), drained and rinsed': 'chickpeas',
  'ounce) can garbanzo beans, drained': 'chickpeas',
  'ounce) can garbanzo beans, rinsed and drained': 'chickpeas',
  'ounce) can tomato paste': 'tomato paste',
  'ounce) cans diced tomatoes': 'diced tomatoes',
  'ounce) cans tomato sauce': 'tomato sauce',
  'ounce) jar salsa': 'salsa',
  'ounce) package cream cheese, softened': 'cream cheese',
  'ounce) package shredded coleslaw mix': 'coleslaw mix',
  'ounce) packages cream cheese, softened': 'cream cheese',

  // Misc
  'bread (slices)': 'bread',
  'bread crumbs, divided': 'bread crumbs',
  'bread, with crusts trimmed': 'bread',
  'phyllo dough, thawed if frozen': 'phyllo dough',
  'pita breads (corn)': 'pita bread',
  'rusks (whole)': 'rusks',
  'orzo pasta (medium)': 'orzo',
  'vermicelli, broken into 1/2-inch pieces': 'vermicelli',
  'chickpeas (dry)': 'dried chickpeas',
  'chickpeas (dry, soaked in water overnight and boiled)': 'chickpeas',
  'chickpeas (frozen)': 'chickpeas',
  'peas (frozen)': 'peas',
  'chili flakes (+ extra to serve)': 'chili flakes',
  'chili flakes (spicy)': 'chili flakes',
  'chili flakes (to serve)': 'chili flakes',
  'chili pepper (finely chopped)': 'chili pepper',
  'chili peppers (finely chopped)': 'chili pepper',
  'baking soda (optional)': 'baking soda',
  'granulated sugar (granulated sugar)': 'granulated sugar',
  'capers, divided': 'capers',
  'olives (rounds)': 'olives',
  'nori (dry seaweed)': 'nori',
  'apricots (dried, cut in half)': 'dried apricots',
  'stock, or more as needed': 'chicken stock',
  'crushed, roasted macadamia nuts': 'macadamia nuts',
  'thinly sliced onion and tomatoes': 'onion and tomatoes',
  'tomato and clam juice cocktail': 'clamato juice',
  'cup lower-sodium beef broth': 'beef broth',
};

async function fixRemainingIngredients() {
  console.log('Loading ingredients...\n');

  const ingredients = await prisma.ingredient.findMany();
  console.log(`Found ${ingredients.length} ingredients\n`);

  // Build map of existing clean names
  const existingNames = new Map<string, string>();
  for (const ing of ingredients) {
    existingNames.set(ing.name.toLowerCase(), ing.id);
  }

  let fixedCount = 0;
  let mergedCount = 0;
  let skippedCount = 0;

  for (const ingredient of ingredients) {
    const originalName = ingredient.name;
    const targetName = DIRECT_FIXES[originalName];

    if (!targetName) {
      continue; // No fix defined
    }

    const targetNameLower = targetName.toLowerCase();
    const existingTargetId = existingNames.get(targetNameLower);

    if (existingTargetId && existingTargetId !== ingredient.id) {
      // Target exists - need to merge: update all recipe ingredients to use target, then delete this one
      const usages = await prisma.recipeIngredient.findMany({
        where: { ingredientId: ingredient.id },
        include: { recipe: { select: { title: true } } },
      });

      if (usages.length === 0) {
        // No usages - try to delete, but skip if FK constraint
        try {
          await prisma.ingredient.delete({ where: { id: ingredient.id } });
          console.log(`  DELETED (unused): "${originalName}"`);
          fixedCount++;
        } catch (e) {
          // Still has some reference - just rename instead
          try {
            await prisma.ingredient.update({
              where: { id: ingredient.id },
              data: { name: targetNameLower },
            });
            existingNames.set(targetNameLower, ingredient.id);
            console.log(`  RENAMED (had refs): "${originalName}" -> "${targetName}"`);
            fixedCount++;
          } catch (e2) {
            console.log(`  SKIP: "${originalName}"`);
            skippedCount++;
          }
        }
        continue;
      }

      // Check for duplicates before merging
      let allMerged = true;
      for (const usage of usages) {
        const existingUsage = await prisma.recipeIngredient.findFirst({
          where: {
            recipeId: usage.recipeId,
            ingredientId: existingTargetId,
          },
        });

        if (existingUsage) {
          // Would create duplicate - delete this recipe ingredient instead
          await prisma.recipeIngredient.delete({ where: { id: usage.id } });
          console.log(`  REMOVED duplicate in "${usage.recipe.title}": "${originalName}"`);
        } else {
          // Safe to update
          await prisma.recipeIngredient.update({
            where: { id: usage.id },
            data: { ingredientId: existingTargetId },
          });
        }
      }

      // Now try to delete the old ingredient
      try {
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        console.log(`  MERGED: "${originalName}" -> "${targetName}"`);
        mergedCount++;
      } catch (e) {
        console.log(`  SKIP (still has refs): "${originalName}"`);
        skippedCount++;
      }
    } else if (!existingTargetId) {
      // Target doesn't exist - rename this ingredient
      try {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { name: targetNameLower },
        });
        existingNames.set(targetNameLower, ingredient.id);
        console.log(`  RENAMED: "${originalName}" -> "${targetName}"`);
        fixedCount++;
      } catch (e) {
        console.log(`  SKIP (rename failed): "${originalName}"`);
        skippedCount++;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Fixed/Renamed: ${fixedCount}`);
  console.log(`Merged: ${mergedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  await prisma.$disconnect();
}

fixRemainingIngredients().catch(console.error);
