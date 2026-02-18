import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean ingredient name: extract core ingredient, move prep details to notes
function cleanIngredientName(name: string): { cleanName: string; notes: string | null } {
  let cleanName = name.trim().toLowerCase();
  let notes: string | null = null;

  // Handle Greek ingredients - translate to English
  const greekToEnglish: Record<string, string> = {
    'κόλιανδρο (σε σκόνη)': 'ground coriander',
    'μοσχάρι (ποντίκι)': 'beef shin',
    'μπρόκολο (σε μπουκετάκια)': 'broccoli florets',
    'ξύσμα λεμονιού (από 2 λεμόνια)': 'lemon zest',
    'σκόρδο (ψιλοκομμένες)': 'garlic',
    'χυμό λεμονιού (από 2 λεμόνια)': 'lemon juice',
    '1 μπαγκέτα (120 g)': 'baguette',
    'σπαγγέτι (νο6)': 'spaghetti',
    'spaghetti (νο6)': 'spaghetti',
  };

  if (greekToEnglish[cleanName]) {
    return { cleanName: greekToEnglish[cleanName], notes: null };
  }

  // Handle ingredients starting with special characters
  if (cleanName.startsWith('-') || cleanName.startsWith('¼') || cleanName.startsWith('½') || cleanName.startsWith('¾') || cleanName.startsWith('⅓')) {
    // These are malformed - try to extract the actual ingredient
    // "- peeled, pitted and diced" -> probably avocado prep notes
    // "¼ cup olive oil, divided" -> olive oil
    if (cleanName.includes('olive oil')) {
      return { cleanName: 'olive oil', notes: 'divided' };
    }
    if (cleanName.includes('salt')) {
      return { cleanName: 'salt', notes: 'divided' };
    }
    if (cleanName.includes('parmesan')) {
      return { cleanName: 'parmesan cheese', notes: 'finely shredded' };
    }
    if (cleanName.includes('pepper')) {
      return { cleanName: 'crushed red pepper', notes: null };
    }
    if (cleanName.includes('chicken broth')) {
      return { cleanName: 'chicken broth', notes: 'reduced sodium' };
    }
    if (cleanName.includes('white wine')) {
      return { cleanName: 'white wine', notes: 'dry' };
    }
    // Skip malformed entries that start with prep instructions
    if (cleanName.startsWith('- peeled')) {
      return { cleanName: '', notes: cleanName }; // Mark for deletion
    }
  }

  // Handle "(ounce) can ..." pattern - these are canned goods
  const canMatch = cleanName.match(/^(?:\(?\d+\.?\d*\s*)?ounce\)?\s*(?:can|cans|package|packages|container|jar|boxes?)\s+(.+)/i);
  if (canMatch) {
    cleanName = canMatch[1].trim();
    // Remove "rinsed and drained", ", drained", etc.
    cleanName = cleanName.replace(/,?\s*(rinsed and drained|drained and rinsed|drained|undrained|softened|thawed and drained)/gi, '');
  }

  // Handle "fluid ounce) can ..." pattern
  const fluidCanMatch = cleanName.match(/^fluid ounce\)\s*can\s+(.+)/i);
  if (fluidCanMatch) {
    cleanName = fluidCanMatch[1].trim();
  }

  // Handle "inch) ..." pattern (tortillas, crusts)
  const inchMatch = cleanName.match(/^inch\)\s+(.+)/i);
  if (inchMatch) {
    cleanName = inchMatch[1].trim();
  }

  // Handle "cups water, plus more as needed" -> water
  if (cleanName.startsWith('cups ')) {
    cleanName = cleanName.replace(/^cups\s+/, '');
  }

  // Handle "pounds green cabbage, ..." -> green cabbage
  if (cleanName.startsWith('pounds ')) {
    cleanName = cleanName.replace(/^pounds\s+/, '');
  }

  // Handle "pieces lavash or pita bread, warmed" -> lavash bread
  if (cleanName.startsWith('pieces ')) {
    cleanName = cleanName.replace(/^pieces\s+/, '');
  }

  // Handle "teaspoon cumin" -> cumin
  if (cleanName.startsWith('teaspoon ') || cleanName.startsWith('tablespoon ')) {
    cleanName = cleanName.replace(/^(?:teaspoon|tablespoon)\s+/, '');
  }

  // Extract notes from parentheses
  const parenMatch = cleanName.match(/^([^(]+)\s*\(([^)]+)\)\s*(.*)$/);
  if (parenMatch) {
    const beforeParen = parenMatch[1].trim();
    const inParen = parenMatch[2].trim();
    const afterParen = parenMatch[3].trim();

    // Check if parentheses contain prep instructions vs essential info
    const prepWords = ['finely chopped', 'chopped', 'diced', 'sliced', 'minced', 'crushed', 'grated', 'fresh', 'dry', 'dried', 'ground', 'powder', 'frozen', 'boiled', 'roasted', 'peeled', 'cut', 'from', 'of', 'sautéed', 'optional', 'some', 'optionally', 'to serve', 'extra', 'for', 'only'];
    const isPrep = prepWords.some(w => inParen.toLowerCase().includes(w));

    if (isPrep) {
      cleanName = beforeParen;
      notes = inParen;
    } else {
      // Might be essential (e.g., "cabbage (red)" -> "red cabbage")
      // Check common patterns
      if (['red', 'white', 'green', 'yellow', 'black', 'sweet', 'hot', 'spicy', 'smoked', 'country', 'medium', 'large', 'small', 'dry', 'whole'].includes(inParen.toLowerCase())) {
        cleanName = `${inParen} ${beforeParen}`;
      } else if (inParen.toLowerCase().includes('japanese')) {
        // e.g., "(japanese rice wine)" -> keep as is or map
        if (beforeParen === '' && afterParen === '') {
          cleanName = inParen.replace(/japanese\s*/i, '').trim();
          notes = 'Japanese';
        }
      } else {
        cleanName = beforeParen;
        notes = inParen;
      }
    }
  }

  // Handle trailing ", prep instructions" pattern
  const commaMatch = cleanName.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch && !notes) {
    const beforeComma = commaMatch[1].trim();
    const afterComma = commaMatch[2].trim();

    // Check if after comma is prep/serving instruction
    const prepPhrases = ['chopped', 'diced', 'sliced', 'minced', 'divided', 'softened', 'melted', 'or to taste', 'or more', 'or as needed', 'plus more', 'shredded', 'crumbled', 'at room temperature', 'lightly beaten', 'thinly sliced', 'coarsely grated', 'peeled', 'seeded', 'juiced', 'quartered', 'halved', 'rinsed', 'flaked', 'cubed', 'warmed', 'finely', 'stems removed'];

    const isAfterPrep = prepPhrases.some(p => afterComma.toLowerCase().includes(p));

    if (isAfterPrep) {
      cleanName = beforeComma;
      notes = afterComma;
    }
  }

  // Handle "X, or to taste" / "X, or more to taste"
  cleanName = cleanName.replace(/,?\s*or (?:more )?to taste.*$/i, '');
  cleanName = cleanName.replace(/,?\s*or as needed.*$/i, '');
  cleanName = cleanName.replace(/,?\s*plus more.*$/i, '');
  cleanName = cleanName.replace(/,?\s*for serving.*$/i, '');
  cleanName = cleanName.replace(/,?\s*for garnish.*$/i, '');

  // Handle specific problematic patterns
  const specificFixes: Record<string, { name: string; notes?: string }> = {
    'avocado(s)': { name: 'avocado' },
    'lime(s)': { name: 'lime' },
    'grade tuna': { name: 'sashimi-grade tuna' },
    'glutamate': { name: 'msg' },
    'granulated sugar (granulated sugar)': { name: 'granulated sugar' },
    'of garlic ((optional))': { name: 'garlic', notes: 'optional' },
    'of garlic (finely chopped)': { name: 'garlic', notes: 'finely chopped' },
    'nori (dry seaweed)': { name: 'nori seaweed', notes: 'dried' },
    'salt and freshly ground black pepper to taste': { name: 'salt and pepper' },
    'salt and ground black pepper to taste': { name: 'salt and pepper' },
    'salt and ground pepper to taste': { name: 'salt and pepper' },
    'salt and pepper to taste': { name: 'salt and pepper' },
    'freshly ground black pepper to taste': { name: 'black pepper' },
    'ground white pepper to taste': { name: 'white pepper' },
    'crushed, roasted macadamia nuts': { name: 'macadamia nuts', notes: 'crushed, roasted' },
    'fresh tortilla chips for serving': { name: 'tortilla chips' },
    'red chile sauce for serving': { name: 'red chile sauce' },
    'thinly sliced onion and tomatoes for serving': { name: 'onion and tomatoes', notes: 'thinly sliced, for serving' },
    'grated or pureed and drained': { name: 'tomato', notes: 'grated or pureed and drained' },
    'cut in half and sliced': { name: 'cucumber', notes: 'cut in half and sliced' },
    'halved lengthwise and cut into 3/4 inch pieces': { name: 'zucchini', notes: 'halved lengthwise and cut into pieces' },
    'grated zest of one orange': { name: 'orange zest' },
    'peeled, cut into small strips': { name: 'ginger', notes: 'peeled, cut into strips' },
    'cheddar or monterey jack cheese': { name: 'cheddar cheese', notes: 'or monterey jack' },
    'leaves, cut into 1-inch squares': { name: 'napa cabbage leaves', notes: 'cut into squares' },
    'sliced, or to taste': { name: 'jalapeno', notes: 'sliced' },
    'rolls, split lengthwise': { name: 'hoagie rolls', notes: 'split lengthwise' },
    'seeds, or to taste': { name: 'sesame seeds' },
    'stock, made with dashi powder': { name: 'dashi stock' },
    'stock, or more as needed': { name: 'chicken stock' },
    'oil, divided': { name: 'vegetable oil', notes: 'divided' },
    'oil, or as needed': { name: 'vegetable oil' },
    'oil, or more as needed': { name: 'vegetable oil' },
    'oil, plus more as needed': { name: 'vegetable oil' },
    'milk greek yogurt, divided': { name: 'greek yogurt', notes: 'divided' },
    'squeezed lemon juice, divided': { name: 'lemon juice', notes: 'divided' },
    'sliced green onions, or more to taste': { name: 'green onion', notes: 'sliced' },
    'boneless chicken breast halves - cut into chunks': { name: 'chicken breast', notes: 'boneless, cut into chunks' },
  };

  if (specificFixes[cleanName]) {
    const fix = specificFixes[cleanName];
    cleanName = fix.name;
    if (fix.notes) notes = fix.notes;
  }

  // Final cleanup
  cleanName = cleanName.trim();
  cleanName = cleanName.replace(/\s+/g, ' '); // Normalize spaces

  return { cleanName, notes };
}

// Map of messy names to clean existing ingredients
const INGREDIENT_MAPPING: Record<string, string> = {
  // Herbs with prep notes
  'parsley (finely chopped)': 'parsley',
  'parsley (finely chopped + extra to serve)': 'parsley',
  'parsley (fresh)': 'parsley',
  'parsley (only the leaves)': 'parsley',
  'parsley (optionally)': 'parsley',
  'parsley (some)': 'parsley',
  'parsley, chopped': 'parsley',
  'parsley, stems removed': 'parsley',
  'italian parsley, divided': 'italian parsley',
  'minced parsley, divided': 'parsley',
  'fresh parsley, divided': 'parsley',
  'cilantro, chopped': 'cilantro',
  'cilantro, or to taste': 'cilantro',
  'fresh cilantro, divided': 'cilantro',
  'fresh cilantro, or to taste': 'cilantro',
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
  'coriander (seeds, crushed)': 'coriander seeds',
  'chives (finely chopped)': 'chives',

  // Vegetables
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
  'onions (white)': 'white onion',
  'onions, chopped': 'onion',
  'onions, chopped, divided': 'onion',
  'onions, chopped, or to taste': 'onion',
  'onions, finely chopped': 'onion',
  'onions, sliced': 'onion',
  'onions, thinly sliced': 'onion',
  'green onion, or to taste': 'green onion',

  'garlic, chopped': 'garlic',
  'garlic, crushed': 'garlic',
  'garlic, minced': 'garlic',
  'garlic, minced, divided': 'garlic',
  'garlic, pressed': 'garlic',
  'garlic, whole': 'garlic',
  'of garlic ((optional))': 'garlic',
  'of garlic (finely chopped)': 'garlic',

  'tomatoes (grated)': 'tomato',
  'tomatoes (medium)': 'tomato',
  'tomatoes, chopped': 'tomato',
  'tomatoes, diced': 'tomato',
  'tomatoes, halved': 'tomato',
  'tomato, seeded and chopped': 'tomato',
  'tomato, seeded and diced': 'tomato',
  'tomato, sliced': 'tomato',
  '(plum) tomatoes, diced': 'plum tomato',
  '(plum) tomatoes, halved': 'plum tomato',
  'cherry tomatoes (roasted)': 'cherry tomatoes',

  'bell pepper, chopped': 'bell pepper',
  'bell pepper, cut into 1/2-inch dice': 'bell pepper',
  'bell pepper, cut into bite-sized pieces': 'bell pepper',
  'bell pepper, diced': 'bell pepper',
  'bell pepper, julienned': 'bell pepper',
  'bell pepper, sliced': 'bell pepper',
  'bell pepper, sliced, or more to taste': 'bell pepper',
  'florina pepper (red pepper)': 'florina pepper',
  'florina peppers (red peppers)': 'florina pepper',
  'green, or yellow bell pepper, cut into 1" pieces': 'bell pepper',

  'carrot, peeled and chopped': 'carrot',
  'carrot (eeled and cut into pieces that are 7 mm thick)': 'carrot',
  'carrots, chopped': 'carrot',
  'carrots, coarsely grated': 'carrot',
  'carrots, peeled and grated': 'carrot',
  'carrots, sliced': 'carrot',

  'celery (cut into pieces that are 7 mm thick)': 'celery',
  'celery with leaves, chopped': 'celery',
  'celery, chopped': 'celery',

  'potato, diced': 'potato',
  'potato, peeled and cubed': 'potato',
  'potatoes (medium)': 'potato',
  'potatoes (medium-sized, peeled)': 'potato',
  'potatoes (peeled)': 'potato',
  'potatoes (small)': 'potato',
  'potatoes, peeled and diced': 'potato',
  'baby potatoes (boiled)': 'baby potatoes',

  'cucumber, thinly sliced': 'cucumber',
  'zucchini, diced small': 'zucchini',
  'zucchinis (medium)': 'zucchini',
  'eggplant, cubed': 'eggplant',
  'squash, peeled and chopped': 'squash',
  'mushrooms, sliced': 'mushrooms',
  'bok choy, quartered lengthwise': 'bok choy',
  'kale, ribs removed, chopped': 'kale',
  'spinach, rinsed and chopped': 'spinach',
  'lettuce, shredded': 'lettuce',
  'cabbage (red)': 'red cabbage',
  'cabbage (white)': 'cabbage',
  'cabbage, finely shredded': 'cabbage',
  'radishes, finely diced': 'radish',
  'lentils, rinsed': 'lentils',

  // Proteins
  'chicken (in portions)': 'chicken',
  'chicken breasts, cut into large chunks': 'chicken breast',
  'chicken breasts, shredded': 'chicken breast',
  'chicken breast fillet (sautéed)': 'chicken breast',
  'boneless chicken thighs, cut into small pieces': 'chicken thighs',
  'skin-on chicken thighs (about 2 1/2 pounds)': 'chicken thighs',
  'skinless, boneless chicken breast halves': 'chicken breast',
  'skinless, boneless chicken breast halves, cut into bite size pieces': 'chicken breast',

  'beef (leg, boneless, cut into 2 cm cubes)': 'beef',
  'beef (rump)': 'beef rump',
  'beef (short ribs, bones left in, fat removed)': 'beef short ribs',
  'ground beef (brisket)': 'ground beef',
  'ground beef (chuck)': 'ground beef',
  'sirloin, cut into thin 2 inch strips': 'sirloin',

  'lamb (leg)': 'leg of lamb',
  'lamb shoulder, cut into 1/2 -inch pieces': 'lamb shoulder',
  'leg of lamb (boneless)': 'leg of lamb',
  'leg of lamb, cut into 3-inch pieces': 'leg of lamb',

  'pork (loin)': 'pork loin',
  'pork belly (cut into pieces that are 7mm thick)': 'pork belly',
  'pork schnitzels (300 g)': 'pork schnitzel',

  'bacon (whole piece)': 'bacon',
  'bacon, cut into 1/2 inch pieces': 'bacon',
  'sausage (country)': 'country sausage',
  'or salt pork, diced': 'salt pork',

  'medium shrimp, peeled and deveined': 'shrimp',
  'shrimp, peeled and deveined': 'shrimp',
  'shrimp - peeled, deveined and chopped': 'shrimp',
  'shrimps (colossal, shell-on)': 'shrimp',
  'shrimps (frozen)': 'shrimp',
  'salmon, chopped': 'salmon',
  'salmon, cut into long strips': 'salmon',
  'sashimi-grade salmon, cut into small cubes': 'salmon',
  'halibut, cut into bite-size pieces': 'halibut',
  'sea bass, cut in 1/2 - inch dice': 'sea bass',
  'tuna steaks, cubed': 'tuna',
  'sushi-grade ahi (yellowfin) tuna, cut into 3/4-inch cubes': 'ahi tuna',
  'crabmeat, flaked': 'crab',
  'mussels (in shell, cleaned and debearded)': 'mussels',

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
  'margarine, melted': 'margarine',
  'cheese, crumbled': 'feta cheese',
  'cheese, diced': 'cheese',
  'cheese, softened': 'cream cheese',
  'cheese, thinly sliced': 'cheese',
  'parmesan cheese (grated)': 'parmesan cheese',
  'pecorino cheese (grated)': 'pecorino cheese',
  'gruyere cheese (grated)': 'gruyere cheese',
  'gruyère cheese, at room temperature': 'gruyere cheese',
  'asiago cheese, at room temperature': 'asiago cheese',
  'mizithra cheese (grated)': 'mizithra cheese',
  'mozzarella (grated)': 'mozzarella',
  'swiss cheese, divided': 'swiss cheese',
  'strained yogurt (full-fat)': 'greek yogurt',

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
  'orange zest (of 3 oranges)': 'orange zest',

  // Oils, vinegars, seasonings
  'olive oil (for sautéing)': 'olive oil',
  'olive oil (to sauté chicken fillets)': 'olive oil',
  'olive oil (to sauté vegetables)': 'olive oil',
  'extra-virgin olive oil, plus more for garnish': 'extra virgin olive oil',
  'sunflower oil (for the frying)': 'sunflower oil',
  'seed oil (for frying)': 'vegetable oil',
  'vinegar (of white wine)': 'white wine vinegar',
  'vinegar (white wine)': 'white wine vinegar',
  'vinegar (white)': 'white vinegar',
  'vinegar, or to taste': 'vinegar',
  'white wine (dry)': 'white wine',

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
  'pepper sauce (e.g. tabasco™), or to taste': 'hot sauce',
  'hot sauce, plus more to taste if desired': 'hot sauce',
  'red chili sauce, or to taste': 'red chili sauce',
  'ginger, or to taste': 'ginger',

  'paprika (hot)': 'hot paprika',
  'paprika (smoked)': 'smoked paprika',
  'paprika (sweet)': 'sweet paprika',
  'turmeric (powder)': 'turmeric',
  'semolina (fine)': 'fine semolina',
  'baking soda (optional)': 'baking soda',

  // Misc
  'water (110 degrees f/45 degrees c)': 'water',
  'water (at room temperature)': 'water',
  'water (boiling)': 'water',
  'water (for the bouillon cube)': 'water',
  'water (hot)': 'water',
  'water (warm)': 'water',
  'water, or enough to cover': 'water',
  'water, or more to taste': 'water',
  'water, or to taste': 'water',

  'all-purpose flour (for breading)': 'all-purpose flour',
  'all-purpose flour (for the breading)': 'all-purpose flour',
  'bread crumbs, divided': 'bread crumbs',
  'bread (slices)': 'bread',
  'bread, with crusts trimmed': 'bread',
  'breads, or fluffy tortillas': 'flatbread',
  'pita breads (corn)': 'pita bread',
  'souvlaki pita breads (toasted)': 'pita bread',
  'phyllo dough, thawed if frozen': 'phyllo dough',
  'rusks (whole)': 'rusks',
  'orzo pasta (medium)': 'orzo pasta',
  'vermicelli, broken into 1/2-inch pieces': 'vermicelli',
  'cereal (corn)': 'corn flakes',

  'beans (white, medium sized)': 'white beans',
  'chickpeas (dry)': 'chickpeas',
  'chickpeas (dry, soaked in water overnight and boiled)': 'chickpeas',
  'chickpeas (frozen)': 'chickpeas',
  'green beans (fresh or forzen)': 'green beans',
  'peas (frozen)': 'peas',
  'artichokes (frozen)': 'artichokes',
  'beetroots (boiled)': 'beets',
  'bamboo shoots, drained': 'bamboo shoots',
  'olives (rounds)': 'olives',
  'capers, divided': 'capers',
  'pomegranate (seeds)': 'pomegranate seeds',
  'figs (dried, quartered)': 'dried figs',
  'apricots (dried, cut in half)': 'dried apricots',
  'pears (large)': 'pear',
  'herbs (fresh)': 'mixed herbs',
  'vanilla pod (cut in half lengthwise)': 'vanilla pod',
  'chili flakes (+ extra to serve)': 'chili flakes',
  'chili flakes (spicy)': 'chili flakes',
  'chili flakes (to serve)': 'chili flakes',
  'chili pepper (finely chopped)': 'chili pepper',
  'chili peppers (finely chopped)': 'chili pepper',
  'jalapeno peppers, seeded and minced': 'jalapeno',

  // Canned goods patterns
  'black beans, drained and rinsed': 'black beans',
  'chickpeas, drained': 'chickpeas',
  'chickpeas, drained and rinsed': 'chickpeas',
  'garbanzo beans (chickpeas), drained and rinsed': 'chickpeas',
  'garbanzo beans, drained': 'chickpeas',
  'garbanzo beans, rinsed and drained': 'chickpeas',
  'low sodium garbanzo beans, rinsed and drained': 'chickpeas',
  'cannellini beans, rinsed and drained': 'cannellini beans',
  'crushed tomatoes': 'crushed tomatoes',
  'diced tomatoes': 'diced tomatoes',
  'diced tomatoes, undrained': 'diced tomatoes',
  'fire-roasted diced tomatoes, undrained': 'fire-roasted tomatoes',
  'italian plum tomatoes': 'plum tomato',
  'peeled and diced tomatoes': 'diced tomatoes',
  'tomato paste': 'tomato paste',
  'tomato sauce': 'tomato sauce',
  'diced green chiles': 'green chiles',
  'sliced mushrooms, drained': 'mushrooms',
  'bean sprouts, drained': 'bean sprouts',
  'vegetable broth': 'vegetable broth',
  'organic vegetable broth': 'vegetable broth',
  'chicken broth': 'chicken broth',
  'beef broth': 'beef broth',
  'coconut milk': 'coconut milk',
  'salsa': 'salsa',
  'sour cream': 'sour cream',
  'coleslaw mix': 'coleslaw mix',
  'shredded coleslaw mix': 'coleslaw mix',
  'corn tortillas': 'corn tortillas',
  'flour tortillas': 'flour tortillas',
  'cream cheese, softened': 'cream cheese',
  'egg noodles': 'egg noodles',
  'frozen chopped spinach, thawed and drained': 'spinach',
  'shredded sharp cheddar cheese': 'cheddar cheese',
  'dried ramen noodles': 'ramen noodles',
  'prepared graham cracker crust': 'graham cracker crust',
  'rigatoni': 'rigatoni',

  // Japanese
  '(japanese nori seasoning), or to taste': 'furikake',
  '(japanese rice wine)': 'sake',
  '(japanese-style breadcrumbs)': 'panko',
  'nori (dry seaweed)': 'nori',
  'dried seaweed, cut into strips, or to taste': 'nori',
  'amino acid (such as bragg®), divided': 'liquid aminos',
  'glutamate, such as accent': 'msg',
  'edamame, or more to taste': 'edamame',
};

async function fixIngredientNames() {
  console.log('Loading all ingredients and recipe ingredients...\n');

  const ingredients = await prisma.ingredient.findMany();
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: {
      ingredient: true,
      recipe: { select: { title: true } },
    },
  });

  console.log(`Found ${ingredients.length} ingredients`);
  console.log(`Found ${recipeIngredients.length} recipe ingredients\n`);

  // Build a map of clean names to existing ingredient IDs
  const existingIngredients = new Map<string, string>();
  for (const ing of ingredients) {
    existingIngredients.set(ing.name.toLowerCase(), ing.id);
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each recipe ingredient that has a messy ingredient name
  for (const ri of recipeIngredients) {
    const originalName = ri.ingredient.name;

    // Check if this name needs fixing
    let targetName: string | null = null;
    let notes: string | null = null;

    // First check explicit mapping
    if (INGREDIENT_MAPPING[originalName]) {
      targetName = INGREDIENT_MAPPING[originalName];
    } else {
      // Try auto-cleaning
      const cleaned = cleanIngredientName(originalName);
      if (cleaned.cleanName && cleaned.cleanName !== originalName.toLowerCase() && cleaned.cleanName.length > 0) {
        targetName = cleaned.cleanName;
        notes = cleaned.notes;
      }
    }

    if (!targetName) {
      continue; // No fix needed
    }

    // Check if target ingredient exists
    const targetId = existingIngredients.get(targetName.toLowerCase());

    try {
      if (targetId) {
        // Target ingredient exists - update recipe ingredient to point to it
        if (targetId !== ri.ingredientId) {
          // Check if this would create a duplicate (same recipe + same ingredient)
          const existingRI = await prisma.recipeIngredient.findFirst({
            where: {
              recipeId: ri.recipeId,
              ingredientId: targetId,
              id: { not: ri.id },
            },
          });

          if (existingRI) {
            // Duplicate would be created - skip or merge
            console.log(`  SKIP (would duplicate): "${originalName}" -> "${targetName}" in "${ri.recipe.title}"`);
            skippedCount++;
            continue;
          }

          // Update to point to existing ingredient
          const updateData: any = { ingredientId: targetId };
          if (notes && !ri.notes) {
            updateData.notes = notes;
          }
          await prisma.recipeIngredient.update({
            where: { id: ri.id },
            data: updateData,
          });
          console.log(`  REMAPPED: "${originalName}" -> "${targetName}"`);
          updatedCount++;
        }
      } else {
        // Target ingredient doesn't exist - check if we can rename or need to create
        const usageCount = await prisma.recipeIngredient.count({
          where: { ingredientId: ri.ingredientId },
        });

        if (usageCount === 1) {
          // Only used once - rename the ingredient
          await prisma.ingredient.update({
            where: { id: ri.ingredientId },
            data: { name: targetName.toLowerCase() },
          });
          existingIngredients.set(targetName.toLowerCase(), ri.ingredientId);
          if (notes && !ri.notes) {
            await prisma.recipeIngredient.update({
              where: { id: ri.id },
              data: { notes },
            });
          }
          console.log(`  RENAMED: "${originalName}" -> "${targetName}"`);
          updatedCount++;
        } else {
          // Used multiple times - create new ingredient
          const newIngredient = await prisma.ingredient.create({
            data: { name: targetName.toLowerCase() },
          });
          existingIngredients.set(targetName.toLowerCase(), newIngredient.id);
          const updateData: any = { ingredientId: newIngredient.id };
          if (notes && !ri.notes) {
            updateData.notes = notes;
          }
          await prisma.recipeIngredient.update({
            where: { id: ri.id },
            data: updateData,
          });
          console.log(`  CREATED + REMAPPED: "${originalName}" -> "${targetName}"`);
          updatedCount++;
        }
      }
    } catch (error) {
      console.error(`  ERROR: "${originalName}" in "${ri.recipe.title}":`, error);
      errorCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (duplicates): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  // Clean up orphan ingredients (no longer used)
  const orphans = await prisma.ingredient.findMany({
    where: {
      recipeIngredients: { none: {} },
    },
  });

  if (orphans.length > 0) {
    console.log(`\nFound ${orphans.length} orphan ingredients (no longer used). Deleting...`);
    await prisma.ingredient.deleteMany({
      where: {
        id: { in: orphans.map(o => o.id) },
      },
    });
    console.log(`Deleted ${orphans.length} orphan ingredients.`);
  }

  await prisma.$disconnect();
}

fixIngredientNames().catch(console.error);
