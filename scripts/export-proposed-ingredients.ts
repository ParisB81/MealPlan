import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const ingredients = await prisma.ingredient.findMany();
  const names = new Set(ingredients.map(i => i.name.toLowerCase()));

  // Proposed additions — only ingredients NOT already in the database
  // Focused on Greek/Mediterranean + international cooking
  const proposed: Record<string, string[]> = {
    produce: [
      // Fruits
      'apple', 'banana', 'strawberry', 'blueberry', 'raspberry', 'cherry',
      'grape', 'peach', 'apricot', 'fig', 'plum', 'pear',
      'watermelon', 'melon', 'mango', 'pineapple', 'kiwi',
      'pomegranate', 'quince', 'persimmon',
      // Vegetables
      'asparagus', 'brussels sprouts', 'cauliflower', 'fennel',
      'okra', 'parsnip', 'turnip', 'shallot', 'swiss chard',
      'arugula', 'endive', 'radicchio', 'watercress',
      // Tomato varieties
      'cherry tomato', 'sun-dried tomatoes', 'grape tomatoes',
      // Peppers
      'chili',
      // Greek greens
      'horta', 'vlita', 'dandelion greens',
      // Beans/peas (fresh)
      'green beans', 'snow peas', 'sugar snap peas',
      // Asian aromatics
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
      // Flours
      'self-raising flour', 'bread flour', 'whole wheat flour',
      // Sugars
      'powdered sugar', 'demerara sugar',
      // Syrups
      'maple syrup', 'corn syrup',
      // Chocolate & baking
      'cocoa powder', 'dark chocolate', 'milk chocolate',
      'cream of tartar', 'gelatin',
      // Vinegars
      'red wine vinegar', 'sherry vinegar',
      // Mustards
      'dijon mustard', 'whole grain mustard',
      // Sauces
      'fish sauce', 'oyster sauce', 'hoisin sauce', 'sriracha', 'tabasco',
      // Tomato products
      'tomato passata', 'tomato purée',
      // Olives
      'kalamata olives', 'green olives',
      // Other
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

  // Filter out any that already exist
  const rows: Array<{ Category: string; 'Ingredient Name': string; Status: string }> = [];
  let totalNew = 0;

  for (const [category, items] of Object.entries(proposed)) {
    for (const item of items.sort()) {
      if (!names.has(item.toLowerCase())) {
        rows.push({ Category: category, 'Ingredient Name': item, Status: 'NEW' });
        totalNew++;
      } else {
        rows.push({ Category: category, 'Ingredient Name': item, Status: 'EXISTS' });
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 15 },  // Category
    { wch: 30 },  // Ingredient Name
    { wch: 10 },  // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Proposed Ingredients');

  // Add summary sheet
  const summary: Array<{ Category: string; 'New Ingredients': number; 'Already Exist': number }> = [];
  for (const [category, items] of Object.entries(proposed)) {
    const newCount = items.filter(i => !names.has(i.toLowerCase())).length;
    summary.push({ Category: category, 'New Ingredients': newCount, 'Already Exist': items.length - newCount });
  }
  summary.push({ Category: 'TOTAL', 'New Ingredients': totalNew, 'Already Exist': rows.length - totalNew });
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const outPath = 'C:\\00 Paris\\MealPlan\\proposed-ingredients.xlsx';
  XLSX.writeFile(wb, outPath);
  console.log(`Written to: ${outPath}`);
  console.log(`Total new: ${totalNew}, already exist: ${rows.length - totalNew}`);

  // Also flag: all 428 existing ingredients are uncategorized
  console.log(`\nNOTE: All ${ingredients.length} existing ingredients are uncategorized!`);

  await prisma.$disconnect();
}

main();
