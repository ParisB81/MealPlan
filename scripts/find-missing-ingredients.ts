import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ingredients = await prisma.ingredient.findMany();
  const names = new Set(ingredients.map(i => i.name.toLowerCase()));

  // Common cooking ingredients that a Greek/Mediterranean + international kitchen would need
  // Organized by category
  const expected: Record<string, string[]> = {
    'produce': [
      'apple', 'banana', 'blueberry', 'strawberry', 'raspberry', 'cherry', 'grape',
      'peach', 'plum', 'apricot', 'fig', 'watermelon', 'melon', 'mango', 'pineapple',
      'kiwi', 'pomegranate', 'persimmon', 'quince',
      'asparagus', 'brussels sprouts', 'cauliflower', 'corn on the cob',
      'fennel', 'kohlrabi', 'okra', 'parsnip', 'turnip', 'rutabaga',
      'sweet corn', 'watercress', 'arugula', 'endive', 'radicchio',
      'shallot', 'chili', 'jalapeño', 'serrano pepper', 'habanero',
      'garlic cloves', 'ginger root', 'lemongrass', 'galangal',
      'swiss chard', 'collard greens', 'mustard greens',
      'cherry tomato', 'sun-dried tomatoes', 'grape tomatoes',
      'red potato', 'sweet onion', 'vidalia onion', 'pearl onion',
      'green beans', 'snow peas', 'sugar snap peas',
      'horta', 'vlita', 'dandelion greens',
    ],
    'dairy': [
      'whole milk', 'skim milk', 'evaporated milk', 'condensed milk',
      'heavy whipping cream', 'sour cream', 'crème fraîche',
      'ricotta', 'mascarpone', 'brie', 'camembert', 'gouda',
      'provolone', 'haloumi', 'cottage cheese', 'cream cheese',
      'whipped cream', 'clotted cream',
      'unsalted butter', 'salted butter', 'ghee', 'clarified butter',
      'kefir', 'labneh',
    ],
    'meat': [
      'chicken wings', 'chicken drumsticks', 'chicken legs',
      'beef steak', 'beef tenderloin', 'beef brisket', 'ground turkey',
      'veal', 'rabbit', 'duck', 'goat',
      'pork chops', 'pork ribs', 'pork tenderloin', 'prosciutto',
      'salami', 'pepperoni', 'mortadella', 'pancetta',
      'lamb chops', 'lamb shank', 'lamb rack',
      'sausage', 'italian sausage', 'merguez',
      'meatballs', 'minced meat',
    ],
    'seafood': [
      'shrimp', 'prawns', 'lobster', 'crab', 'squid', 'calamari', 'octopus',
      'clams', 'mussels', 'scallops', 'oysters',
      'sardines', 'anchovies', 'mackerel', 'swordfish', 'tuna steak',
      'cod fillet', 'sea bream', 'red mullet', 'grouper', 'snapper',
      'smoked salmon', 'cured salmon', 'caviar', 'fish roe', 'tarama',
    ],
    'pantry': [
      'flour', 'self-raising flour', 'bread flour', 'whole wheat flour',
      'cornmeal', 'polenta', 'semolina',
      'white sugar', 'powdered sugar', 'brown sugar', 'demerara sugar',
      'maple syrup', 'agave syrup', 'corn syrup', 'molasses',
      'baking powder', 'baking soda', 'cream of tartar',
      'vanilla extract', 'almond extract', 'rose water', 'orange blossom water',
      'cocoa powder', 'dark chocolate', 'milk chocolate', 'white chocolate',
      'gelatin', 'agar agar',
      'breadcrumbs', 'panko breadcrumbs',
      'vinegar', 'red wine vinegar', 'white wine vinegar', 'balsamic vinegar',
      'apple cider vinegar', 'rice vinegar', 'sherry vinegar',
      'dijon mustard', 'whole grain mustard', 'yellow mustard',
      'ketchup', 'mayonnaise', 'hot sauce', 'tabasco',
      'soy sauce', 'fish sauce', 'oyster sauce', 'hoisin sauce',
      'worcestershire sauce', 'sriracha',
      'tomato passata', 'tomato purée', 'sun-dried tomato paste',
      'coconut milk', 'coconut cream',
      'chicken stock', 'beef stock', 'vegetable stock',
      'bouillon cubes',
      'capers', 'cornichons', 'pickles',
      'olives', 'kalamata olives', 'green olives',
      'peanut butter', 'tahini', 'almond butter',
      'jam', 'marmalade', 'preserve',
    ],
    'grains': [
      'white rice', 'brown rice', 'jasmine rice', 'basmati rice',
      'arborio rice', 'wild rice', 'sushi rice',
      'spaghetti', 'penne', 'rigatoni', 'fusilli', 'linguine', 'fettuccine',
      'tagliatelle', 'pappardelle', 'orzo', 'couscous', 'bulgur',
      'quinoa', 'barley', 'oats', 'rolled oats', 'steel-cut oats',
      'polenta', 'grits',
      'tortillas', 'naan', 'pita', 'lavash', 'ciabatta', 'focaccia',
      'phyllo dough', 'puff pastry', 'pie crust', 'pizza dough',
      'egg noodles', 'rice noodles', 'soba noodles', 'udon noodles',
      'ramen noodles', 'glass noodles',
      'trahana',
    ],
    'pulses': [
      'lentils', 'red lentils', 'green lentils', 'brown lentils', 'black lentils',
      'chickpeas', 'black beans', 'kidney beans', 'white beans', 'cannellini beans',
      'lima beans', 'navy beans', 'pinto beans', 'fava beans', 'broad beans',
      'black eyed peas', 'split peas', 'yellow split peas', 'green split peas',
      'giant beans',
    ],
    'nuts': [
      'almonds', 'walnuts', 'pistachios', 'cashews', 'pine nuts',
      'hazelnuts', 'pecans', 'macadamia nuts', 'brazil nuts', 'peanuts',
      'coconut', 'desiccated coconut', 'coconut flakes',
      'sunflower seeds', 'pumpkin seeds', 'sesame seeds', 'chia seeds',
      'flax seeds', 'poppy seeds', 'hemp seeds',
    ],
    'spices': [
      'salt', 'black pepper', 'white pepper', 'cayenne pepper',
      'paprika', 'smoked paprika', 'sweet paprika', 'hot paprika',
      'cumin', 'coriander seeds', 'turmeric', 'cinnamon', 'nutmeg',
      'cloves', 'allspice', 'cardamom', 'star anise', 'fennel seeds',
      'mustard seeds', 'fenugreek', 'sumac', 'za\'atar',
      'curry powder', 'garam masala', 'chili powder', 'chili flakes',
      'saffron', 'vanilla', 'bay leaves',
      'garlic powder', 'onion powder',
      'dried oregano', 'dried basil', 'dried thyme', 'dried rosemary',
      'dried mint', 'dried dill', 'herbes de provence', 'italian seasoning',
      'five spice', 'ras el hanout', 'baharat',
      'ground ginger', 'ground cumin', 'ground coriander',
      'mahlep', 'mastic',
    ],
    'herbs': [
      'basil', 'parsley', 'cilantro', 'dill', 'mint', 'oregano',
      'thyme', 'rosemary', 'sage', 'tarragon', 'chives',
      'bay leaf', 'marjoram', 'lemon thyme', 'lemon balm',
      'flat-leaf parsley', 'curly parsley',
    ],
    'oils': [
      'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil',
      'sunflower oil', 'coconut oil', 'sesame oil', 'avocado oil',
      'peanut oil', 'grapeseed oil', 'truffle oil', 'walnut oil',
    ],
    'condiments': [
      'salt', 'pepper', 'soy sauce', 'fish sauce',
      'honey', 'maple syrup', 'mustard', 'dijon mustard',
      'ketchup', 'mayonnaise', 'hot sauce', 'sriracha',
      'worcestershire sauce', 'tabasco',
      'balsamic vinegar', 'red wine vinegar', 'lemon juice',
      'tahini', 'harissa', 'gochujang', 'miso paste',
      'capers', 'olives', 'pickles',
    ],
  };

  // Check which expected ingredients are missing
  console.log('=== MISSING INGREDIENTS BY CATEGORY ===\n');

  let totalMissing = 0;
  for (const [category, expectedNames] of Object.entries(expected)) {
    const missing = expectedNames.filter(n => !names.has(n.toLowerCase()));
    if (missing.length > 0) {
      console.log(`${category} (${missing.length} missing):`);
      for (const m of missing.sort()) {
        console.log(`  + ${m}`);
      }
      console.log('');
      totalMissing += missing.length;
    }
  }
  console.log(`Total missing: ${totalMissing}`);

  // Also find ingredients in the DB that might be duplicates or need merging
  console.log('\n=== POTENTIAL DUPLICATES IN DB ===');
  const namesList = [...names].sort();
  for (let i = 0; i < namesList.length; i++) {
    for (let j = i + 1; j < namesList.length; j++) {
      const a = namesList[i];
      const b = namesList[j];
      // Check if one is a substring of the other (potential duplicate)
      if (a.length > 3 && b.startsWith(a + ' ') || b.length > 3 && a.startsWith(b + ' ')) {
        // Skip obvious non-duplicates
        if (a.includes('bell pepper') && b.includes('bell pepper')) continue;
        console.log(`  "${a}" / "${b}"`);
      }
    }
  }

  await prisma.$disconnect();
}

main();
