import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.ingredient.findMany();
  const existingNames = new Set(existing.map(i => i.name.toLowerCase()));

  const proposed: Record<string, string[]> = {
    produce: [
      'apple', 'banana', 'strawberry', 'blueberry', 'raspberry', 'cherry',
      'grape', 'peach', 'apricot', 'fig', 'plum',
      'watermelon', 'melon', 'mango', 'pineapple', 'kiwi',
      'pomegranate', 'quince', 'persimmon',
      'asparagus', 'brussels sprouts', 'cauliflower', 'fennel',
      'okra', 'parsnip', 'turnip', 'shallot', 'swiss chard',
      'arugula', 'endive', 'radicchio', 'watercress',
      'cherry tomato', 'sun-dried tomatoes', 'grape tomatoes',
      'chili',
      'horta', 'vlita', 'dandelion greens',
      'green beans', 'snow peas', 'sugar snap peas',
      'lemongrass', 'galangal',
    ],
    dairy: [
      'whole milk', 'evaporated milk', 'condensed milk',
      'heavy whipping cream', 'crème fraîche',
      'ricotta', 'mascarpone', 'haloumi', 'cottage cheese',
      'unsalted butter', 'ghee',
      'kefir', 'labneh',
      'gouda', 'brie', 'provolone',
      'whipped cream',
    ],
    meat: [
      'chicken wings', 'chicken drumsticks', 'chicken legs',
      'beef steak', 'beef tenderloin', 'beef brisket',
      'veal', 'duck', 'rabbit',
      'ground turkey',
      'pork chops', 'pork ribs', 'pork tenderloin',
      'prosciutto', 'pancetta', 'salami', 'pepperoni',
      'lamb chops', 'lamb shank',
      'sausage', 'italian sausage',
      'minced meat',
    ],
    seafood: [
      'squid', 'calamari', 'octopus',
      'clams', 'scallops',
      'sardines', 'anchovies', 'mackerel', 'swordfish',
      'cod fillet', 'sea bream', 'red mullet', 'grouper', 'snapper',
      'smoked salmon',
      'lobster', 'prawns',
      'fish roe', 'tarama',
      'tuna steak',
    ],
    pantry: [
      'self-raising flour', 'bread flour', 'whole wheat flour',
      'powdered sugar', 'demerara sugar',
      'maple syrup', 'corn syrup',
      'cocoa powder', 'dark chocolate', 'milk chocolate',
      'cream of tartar', 'gelatin',
      'red wine vinegar', 'sherry vinegar',
      'dijon mustard', 'whole grain mustard',
      'fish sauce', 'oyster sauce', 'hoisin sauce', 'sriracha', 'tabasco',
      'tomato passata', 'tomato purée',
      'kalamata olives', 'green olives',
      'capers', 'cornichons', 'pickles',
      'almond butter', 'almond extract',
      'rose water', 'orange blossom water',
      'panko breadcrumbs',
      'jam',
      'chicken stock', 'beef stock',
      'polenta', 'cornmeal',
    ],
    grains: [
      'penne', 'fusilli', 'linguine', 'fettuccine', 'tagliatelle', 'pappardelle',
      'barley', 'oats', 'rolled oats',
      'naan', 'ciabatta', 'focaccia', 'lavash',
      'puff pastry', 'pie crust', 'pizza dough',
      'rice noodles', 'udon noodles', 'soba noodles', 'glass noodles',
      'wild rice',
      'trahana',
    ],
    pulses: [
      'red lentils', 'green lentils', 'black lentils',
      'chickpeas', 'black beans', 'kidney beans',
      'cannellini beans', 'fava beans', 'broad beans',
      'lima beans', 'pinto beans',
      'split peas',
    ],
    nuts: [
      'almonds', 'walnuts', 'hazelnuts', 'pecans', 'peanuts', 'pine nuts',
      'coconut', 'desiccated coconut',
      'sunflower seeds', 'chia seeds', 'flax seeds', 'poppy seeds',
    ],
    spices: [
      'cloves', 'coriander seeds', 'fennel seeds', 'star anise',
      'dried oregano', 'dried basil', 'dried thyme', 'dried rosemary',
      'dried mint', 'dried dill',
      'ground cumin', 'ground coriander', 'ground ginger',
      'za\'atar', 'ras el hanout', 'baharat',
      'herbes de provence',
      'mahlep', 'mastic',
      'vanilla',
    ],
    herbs: [
      'tarragon', 'lemon thyme',
    ],
    oils: [
      'extra virgin olive oil', 'coconut oil', 'avocado oil',
      'canola oil', 'peanut oil', 'grapeseed oil', 'walnut oil',
    ],
  };

  let created = 0;
  let skipped = 0;

  for (const [category, items] of Object.entries(proposed)) {
    for (const name of items) {
      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }

      await prisma.ingredient.create({
        data: {
          name: name.toLowerCase(),
          category,
          tags: '',
        },
      });
      created++;
      console.log(`  + [${category}] ${name}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (already existed)`);

  const total = await prisma.ingredient.count();
  console.log(`Total ingredients in database: ${total}`);

  await prisma.$disconnect();
}

main();
