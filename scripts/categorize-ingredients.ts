import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category rules — order matters: first match wins
// Each rule is [category, list of ingredient names or patterns]
const categoryMap: Record<string, string[]> = {
  // HERBS (fresh herbs — check before spices)
  herbs: [
    'basil', 'basil leaves', 'basil oil', 'chives', 'cilantro', 'coriander leaves',
    'dill', 'fresh italian parsley', 'fresh marjoram leaves', 'fresh mint leaves',
    'italian parsley', 'marjoram', 'mint', 'mint leaves', 'oregano', 'oregano leaves',
    'parsley', 'rosemary', 'sage', 'thyme', 'thyme leaves',
  ],

  // SPICES (dried spices, seasonings, spice blends)
  spices: [
    '5-spices mix', 'allspice', 'allspice berries', 'bagel seasoning', 'bay leaf', 'bay leaves',
    'black pepper', 'black peppercorns', 'cardamom', 'cayenne pepper', 'chili flakes',
    'chili paste', 'chili powder', 'cinnamon', 'clove', 'coriander', 'coriander seed',
    'cumin', 'cumin seed', 'curry', 'curry leaves', 'curry powder',
    'fenugreek', 'furikake', 'garam masala', 'garlic powder', 'gochujang',
    'granulated garlic', 'ground clove', 'harissa', 'hot paprika',
    'italian herb seasoning', 'italian seasoning', 'kosher salt',
    'masala', 'mixed herbs', 'msg', 'mustard seeds', 'nutmeg',
    'onion powder', 'paprika', 'pepper', 'peppercorns',
    'red pepper flakes', 'saffron', 'salt', 'salt and pepper',
    'smoked paprika', 'star anises', 'sumac', 'sweet paprika', 'turmeric',
    'white pepper', 'whole cumin seeds',
  ],

  // OILS
  oils: [
    'olive oil', 'seed oil', 'sesame oil', 'sunflower oil', 'truffle oil', 'vegetable oil',
  ],

  // DAIRY
  dairy: [
    'asiago cheese', 'butter', 'buttermilk', 'cheddar cheese', 'cheese', 'cream',
    'cream cheese', 'feta cheese', 'garlic light cream cheese', 'grated parmesan cheese',
    'greek yogurt', 'gruyere cheese', 'half and half', 'heavy cream',
    'ice cream', 'kasseri cheese', 'light strained yogurt',
    'margarine', 'milk', 'milk greek yogurt', 'mixed cheeses', 'mizithra cheese',
    'monterey jack cheese', 'mozzarella', 'parmesan cheese', 'pecorino cheese',
    'sour cream', 'strained yogurt', 'swiss cheese', 'yogurt',
  ],

  // MEAT
  meat: [
    'bacon', 'beef', 'beef bouillon cube', 'beef broth', 'beef chuck', 'beef rump',
    'beef shin', 'beef short ribs', 'beef steaks',
    'chicken', 'chicken bouillon cube', 'chicken breast', 'chicken breast fillet',
    'chicken broth', 'chicken burger patties', 'chicken thigh fillet', 'chicken thighs',
    'chorizo', 'country sausage', 'ground beef', 'ground beef tenderloin',
    'ground chicken', 'ground lamb', 'ground pork', 'guanciale',
    'ham', 'lamb', 'lamb shoulder', 'leg of lamb',
    'low-sodium chicken broth',
    'pork', 'pork belly', 'pork loin', 'pork schnitzel', 'pork steaks',
    'salt pork', 'sirloin', 'turkey meat',
  ],

  // SEAFOOD
  seafood: [
    'ahi tuna', 'cod', 'crab', 'halibut', 'mussel',
    'salmon', 'salmon fillet', 'salt-cured anchovies',
    'sashimi-grade tuna', 'sea bass', 'shrimp', 'tuna',
  ],

  // PRODUCE (vegetables, fruits, fresh items)
  produce: [
    'artichoke', 'avocado', 'baby potatoes', 'bamboo shoots', 'bean sprouts',
    'beets', 'bell pepper', 'bok choy', 'broccoli',
    'cabbage', 'carrot', 'celery', 'celery leaves', 'celery root', 'celery stalk',
    'champignon mushrooms', 'cherry tomatoes', 'chili pepper',
    'coleslaw', 'coleslaw salad', 'corn', 'cucumber',
    'diced tomatoes', 'eggplant',
    'florina pepper', 'frozen french fries', 'frozen spinach',
    'ginger', 'granny smith apple', 'grated ginger', 'grated tomatoes',
    'green bean', 'green bell pepper', 'green bull\'s horn pepper',
    'green cabbage', 'green chiles', 'green onion', 'green salad',
    'iceberg lettuce', 'jalapeno', 'kale',
    'leek', 'lemon', 'lemon peel', 'lemon zest', 'lettuce', 'lime', 'lime zest',
    'mashed potatoes', 'mushroom',
    'napa cabbage leaves', 'of garlic', 'garlic',
    'olive', 'onion', 'onion and tomatoes', 'oranges', 'orange zest',
    'oyster mushroom', 'oyster mushrooms', 'pear',
    'peas', 'pickled cucumbers', 'plum tomato', 'pomegranate seeds',
    'portobello mushrooms', 'potato', 'pumpkin',
    'radish', 'red apple', 'red bell pepper', 'red cabbage',
    'red onion', 'red pepper', 'rocket',
    'scallion', 'shredded coleslaw mix', 'snap peas',
    'spinach', 'spring onion', 'squash', 'sweet potato',
    'tomato', 'white onion', 'yellow bell pepper', 'zucchini',
    'canned tomatoes', 'concentrated tomato paste', 'italian plum tomatoes',
    'or puréed tomato',
  ],

  // PANTRY (shelf-stable staples, sauces, condiments, baking)
  pantry: [
    'all-purpose flour', 'apple cider vinegar',
    'baking powder', 'baking soda', 'balsamic cream', 'balsamic vinegar',
    'barberries', 'bbq sauce', 'baguette',
    'bread crumbs', 'breadcrumbs', 'brown sugar',
    'caper', 'coconut cream', 'coconut milk', 'cooking spray',
    'corn flakes', 'cornstarch', 'crackers', 'croutons',
    'dashi stock', 'dried apricot', 'dried fig', 'dry breadcrumbs',
    'dry yeast',
    'fine semolina', 'granulated sugar',
    'honey', 'hot sauce', 'hummus',
    'ketchup', 'lemon juice', 'lemonade', 'liquid aminos',
    'low sodium garbanzo beans',
    'marmalade', 'matchsticks', 'mayonnaise', 'mirin', 'molasses', 'mustard',
    'nachos', 'nori', 'nori seaweed sheets', 'crumbled dried seaweed',
    'orange juice', 'orange spoon sweet', 'organic vegetable broth', 'ouzo',
    'panko', 'papadums', 'peanut butter',
    'pepper sauce', 'pine nut',
    'prepared graham cracker crust',
    'red chile sauce', 'red chili sauce', 'reduced-sodium soy sauce',
    'rice vinegar', 'rusks', 'round barley rusk',
    'sake', 'salsa', 'semolina', 'sesame seeds', 'sherry',
    'soy sauce', 'squeezed lemon juice', 'sugar',
    'tahini', 'tomato juice', 'tomato paste', 'tomato sauce',
    'tortilla chips', 'fresh tortilla chips', 'tzatziki',
    'vanilla extract', 'vanilla pod',
    'vegetable bouillon cube', 'vegetable broth', 'vegetable stock',
    'mushroom bouillon cube',
    'vinegar', 'wasabi paste', 'water',
    'white vinegar', 'white wine vinegar', 'wine vinegar',
    'worcestershire sauce', 'yeast',
    'lime juice',
    'brandy', 'red wine', 'white wine',
    'clamato juice',
  ],

  // GRAINS (pasta, rice, bread, noodles, dough)
  grains: [
    'arborio rice', 'basmati rice', 'brown rice', 'bucatini pasta', 'bulgur wheat',
    'burger buns', 'cannelloni', 'carolina rice', 'couscous',
    'dried ramen noodles', 'edamame', 'egg noodles', 'elbow macaroni',
    'flatbread', 'flour tortillas', 'french bread', 'bread', 'bread rounds',
    'garlic bread', 'hard flour', 'hoagie rolls',
    'jasmine rice', 'lasagna', 'long grain rice', 'long grain white rice',
    'macaroni', 'orzo pasta',
    'pasta', 'phyllo dough', 'phyllo dough sheet', 'pita bread',
    'quinoa', 'rice', 'rigatoni',
    'round grain rice', 'sandwich bread',
    'short-grain white rice', 'slices french bread',
    'sour trahana pasta', 'souvlaki pita breads',
    'spaghetti', 'spinach tortillas', 'sushi rice',
    'tortillas', 'corn tortillas',
    'vermicelli', 'white rice', 'whole wheat bread',
    'cereal',
  ],

  // PULSES
  pulses: [
    'black bean', 'black eyed peas', 'brown lentils', 'cans cannellini beans',
    'chickpea', 'garbanzo beans', 'giant beans', 'lentils',
    'red beans', 'white beans', 'yellow split peas',
  ],

  // NUTS & SEEDS
  nuts: [
    'almond', 'cashews', 'macadamia nuts', 'pistachios', 'pumpkin seeds', 'raisin',
    'walnut',
  ],
};

// Ingredients to skip (junk/noise entries that shouldn't be categorized)
const skip = new Set([
  'juiced', 'leaf', 'leaves leaf', 'lightly beaten', 'matchsticks',
  'round', 'seed', 'of garlic',
]);

async function main() {
  const uncategorized = await prisma.ingredient.findMany({
    where: { OR: [{ category: null }, { category: '' }, { category: 'uncategorized' }] },
  });

  console.log(`Found ${uncategorized.length} uncategorized ingredients\n`);

  // Build reverse lookup: ingredient name → category
  const nameToCategory: Record<string, string> = {};
  for (const [category, names] of Object.entries(categoryMap)) {
    for (const name of names) {
      nameToCategory[name.toLowerCase()] = category;
    }
  }

  let updated = 0;
  let notFound: string[] = [];

  for (const ing of uncategorized) {
    if (skip.has(ing.name)) continue;

    const category = nameToCategory[ing.name.toLowerCase()];
    if (category) {
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: { category },
      });
      updated++;
    } else {
      notFound.push(ing.name);
    }
  }

  console.log(`Updated: ${updated}`);

  if (notFound.length > 0) {
    console.log(`\nStill uncategorized (${notFound.length}):`);
    for (const n of notFound.sort()) {
      console.log(`  - ${n}`);
    }
  }

  // Summary
  const all = await prisma.ingredient.findMany();
  const byCat: Record<string, number> = {};
  for (const i of all) {
    const c = i.category || 'uncategorized';
    byCat[c] = (byCat[c] || 0) + 1;
  }
  console.log('\n=== FINAL CATEGORY COUNTS ===');
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  await prisma.$disconnect();
}

main();
