/**
 * Auto-tagger utility for recipe imports.
 *
 * Automatically assigns tags from 6 predefined categories when a recipe
 * is created, if the category isn't already represented in existing tags.
 *
 * Categories: Meal, Base, Duration, Country, Store, Method
 */

// --- Tag Category Definitions (mirrors frontend tagDefinitions.ts) ---

interface TagCategory {
  name: string;
  tags: string[];
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    name: 'Meal',
    tags: [
      'Appetizers / Starters', 'Baking & Pastry', 'Breakfast', 'Brunch',
      'Desserts', 'Drinks / Beverages', 'Main Dishes', 'Salads',
      'Sauces & Condiments', 'Side Dishes', 'Snacks', 'Soups', 'Dips', 'Broths',
    ],
  },
  {
    name: 'Base',
    tags: [
      'Beef', 'Bread/ Pita/ Sandwitch', 'Cheese', 'Chicken', 'Chocolate',
      'Dairy', 'Eggs', 'Fish', 'Fresh', 'Lamb / Goat', 'Legumes',
      'Mixed / Assorted', 'Mushrooms', 'Pasta', 'Pork', 'Rice & Grains',
      'Salad', 'Seafood', 'Tofu / Soy', 'Turkey', 'Vegetables', 'Potatoes',
      'Pizza', 'Bowls', 'Seasonings/ Spices', 'Pastry', 'Dry Nuts',
    ],
  },
  {
    name: 'Duration',
    tags: ['Under 15 minutes', '15–30 minutes', '30–60 minutes', 'Over 60 minutes'],
  },
  {
    name: 'Country',
    tags: [
      'Balkan', 'Greek', 'Turkish', 'Spanish', 'Italian', 'French',
      'Portuguese', 'German', 'International', 'Georgian', 'Armenian',
      'Moroccan', 'Egyptian', 'Lebanese', 'Iranian', 'Indian', 'Chinese',
      'Japanese', 'Vietnamese', 'Thai', 'Chilean', 'American', 'Brazilian',
      'Peruvian', 'Mexican',
    ],
  },
  {
    name: 'Store',
    tags: ['Freezer-friendly', 'Leftovers-friendly', 'Make-ahead', 'One-pot meals'],
  },
  {
    name: 'Method',
    tags: [
      'Air fryer', 'Baked', 'Boiled', 'Braised', 'Fried', 'Grilled',
      'Pan-fried', 'Pressure cooker', 'Raw / No-cook', 'Roasted',
      'Slow-cooked', 'Sous-vide', 'Steamed', 'Stewed',
    ],
  },
];

// Build a lookup: lowercase tag → category name
const tagToCategoryMap = new Map<string, string>();
for (const cat of TAG_CATEGORIES) {
  for (const tag of cat.tags) {
    tagToCategoryMap.set(tag.toLowerCase(), cat.name);
  }
}

// --- Input interface ---

interface AutoTagInput {
  title: string;
  description: string;
  ingredientNames: string[];
  prepTime: number;
  cookTime: number;
  existingTags: string[];
  sourceUrl?: string;
}

// --- Source site tag mapping ---

const SOURCE_SITE_TAGS: [RegExp, string][] = [
  [/bigrecipe\.com/, 'Big Recipe'],
  [/allrecipes\.com/, 'Allrecipes'],
  [/akispetretzikis\.com/, 'Akis Petretzikis'],
  [/argiro\.gr/, 'Argiro Barbarigou'],
];

// --- Main function ---

export function autoTagRecipe(input: AutoTagInput): string[] {
  const { title, description, ingredientNames, prepTime, cookTime, existingTags, sourceUrl } = input;

  const newTags = [...existingTags];
  const existingTagsLower = new Set(existingTags.map(t => t.toLowerCase().trim()));

  // Add source site tag if sourceUrl is present and tag not already there
  if (sourceUrl) {
    for (const [regex, tag] of SOURCE_SITE_TAGS) {
      if (regex.test(sourceUrl) && !existingTagsLower.has(tag.toLowerCase())) {
        newTags.push(tag);
        existingTagsLower.add(tag.toLowerCase());
        break;
      }
    }
  }

  // Determine which categories are already covered
  const coveredCategories = new Set<string>();
  for (const tag of newTags) {
    const cat = tagToCategoryMap.get(tag.toLowerCase().trim());
    if (cat) coveredCategories.add(cat);
  }
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;
  const ingredientsLower = ingredientNames.map(n => n.toLowerCase());

  // --- Meal ---
  if (!coveredCategories.has('Meal')) {
    const mealTag = inferMeal(titleLower, descLower, combined, existingTags, ingredientsLower);
    if (mealTag) newTags.push(mealTag);
  }

  // --- Base ---
  if (!coveredCategories.has('Base')) {
    const baseTag = inferBase(titleLower, combined, ingredientsLower, existingTags);
    if (baseTag) newTags.push(baseTag);
  }

  // --- Duration ---
  if (!coveredCategories.has('Duration')) {
    const durationTag = inferDuration(prepTime, cookTime);
    if (durationTag) newTags.push(durationTag);
  }

  // --- Country ---
  if (!coveredCategories.has('Country')) {
    const countryTag = inferCountry(combined, existingTags);
    if (countryTag) newTags.push(countryTag);
  }

  // --- Store ---
  if (!coveredCategories.has('Store')) {
    const storeTag = inferStore(titleLower, combined, ingredientsLower);
    if (storeTag) newTags.push(storeTag);
  }

  // --- Method ---
  if (!coveredCategories.has('Method')) {
    const methodTag = inferMethod(titleLower, combined, cookTime);
    if (methodTag) newTags.push(methodTag);
  }

  return newTags;
}

// --- Inference functions ---

function inferMeal(
  titleLower: string,
  _descLower: string,
  combined: string,
  existingTags: string[],
  ingredients: string[],
): string | null {
  const tagsLower = existingTags.map(t => t.toLowerCase());

  // Map existing informal tags
  if (tagsLower.some(t => t === 'dinner' || t === 'entree')) return 'Main Dishes';
  if (tagsLower.includes('appetizer')) return 'Appetizers / Starters';
  if (tagsLower.includes('soup')) return 'Soups';
  if (tagsLower.includes('side dish')) return 'Side Dishes';
  if (tagsLower.includes('breakfast')) return 'Breakfast';
  if (tagsLower.includes('dessert')) return 'Desserts';
  if (tagsLower.includes('salad')) return 'Salads';
  if (tagsLower.includes('sandwich')) return 'Main Dishes';
  if (tagsLower.includes('snack')) return 'Snacks';
  if (tagsLower.some(t => t === 'condiment' || t === 'sauce')) return 'Sauces & Condiments';
  if (tagsLower.includes('pie')) return 'Baking & Pastry';

  // Keyword matching in title/description
  if (/\bsoup\b/.test(combined)) return 'Soups';
  if (/\bsalad\b/.test(combined)) return 'Salads';
  if (/\bdip\b/.test(combined)) return 'Dips';
  if (/\b(sauce|dressing|condiment|pesto|aioli|vinaigrette)\b/.test(combined)) return 'Sauces & Condiments';
  if (/\b(dessert|cake|cookie|brownie|pudding|ice cream|mousse|tart|custard|fudge)\b/.test(combined)) return 'Desserts';
  if (/\b(pie|pastry|phyllo|filo|baklava|croissant|muffin|scone)\b/.test(combined)) return 'Baking & Pastry';
  if (/\b(breakfast|pancake|waffle|omelette|omelet|frittata|granola)\b/.test(combined)) return 'Breakfast';
  if (/\bbrunch\b/.test(combined)) return 'Brunch';
  if (/\b(smoothie|juice|drink|beverage|cocktail|lemonade)\b/.test(combined)) return 'Drinks / Beverages';
  if (/\b(bread|pita|flatbread|focaccia|baguette)\b/.test(titleLower)) return 'Baking & Pastry';
  if (/\b(appetizer|starter|mezze|meze)\b/.test(combined)) return 'Appetizers / Starters';
  if (/\bsnack\b/.test(combined)) return 'Snacks';
  if (/\bbroth\b/.test(combined)) return 'Broths';
  if (/\b(side dish|side)\b/.test(combined) && !(/\bside by side\b/.test(combined))) return 'Side Dishes';

  // Default: if recipe has a main protein or substantial ingredients → Main Dishes
  const hasProtein = ingredients.some(i =>
    /\b(chicken|beef|pork|lamb|turkey|fish|salmon|tuna|shrimp|prawn|cod|steak|ground meat|mince)\b/.test(i)
  );
  if (hasProtein) return 'Main Dishes';

  // Pasta/rice dishes are usually main dishes
  if (/\b(pasta|spaghetti|risotto|pilaf|paella)\b/.test(combined)) return 'Main Dishes';

  return null;
}

function inferBase(
  titleLower: string,
  _combined: string,
  ingredients: string[],
  existingTags: string[],
): string | null {
  const tagsLower = existingTags.map(t => t.toLowerCase());

  // Map existing informal tags
  if (tagsLower.includes('pasta')) return 'Pasta';
  if (tagsLower.includes('salad')) return 'Salad';

  // Check ingredients for primary protein/carb (order matters — first match wins)
  const checks: [RegExp, string][] = [
    [/\b(chicken|poultry)\b/, 'Chicken'],
    [/\bbeef\b|^steak$|^ground beef$/, 'Beef'],
    [/\b(pork|bacon|ham|prosciutto|pancetta)\b/, 'Pork'],
    [/\b(lamb|goat)\b/, 'Lamb / Goat'],
    [/\bturkey\b/, 'Turkey'],
    [/\b(salmon|tuna|cod|tilapia|sea bass|trout|swordfish|halibut|snapper|anchov|sardine|mackerel|bass)\b/, 'Fish'],
    [/\b(shrimp|prawn|crab|lobster|squid|octopus|mussel|clam|calamari|scallop)\b/, 'Seafood'],
    [/\b(pasta|spaghetti|penne|linguine|macaroni|noodle|orzo|rigatoni|fettuccine|tagliatelle|fusilli|farfalle|lasagna|ravioli|gnocchi)\b/, 'Pasta'],
    [/\b(rice|risotto|pilaf|quinoa|bulgur|couscous|barley|oat|farro|polenta|cornmeal)\b/, 'Rice & Grains'],
    [/\b(lentil|chickpea|bean|fava|split pea|hummus|black bean|kidney bean|white bean|cannellini)\b/, 'Legumes'],
    [/\bpotato\b|^potatoes$/, 'Potatoes'],
    [/\b(tofu|tempeh|soy)\b/, 'Tofu / Soy'],
    [/\bmushroom\b/, 'Mushrooms'],
    [/\b(chocolate|cocoa|cacao)\b/, 'Chocolate'],
    [/\bpizza\b/, 'Pizza'],
    [/\b(bread|pita|tortilla|sandwich|burger bun|baguette|ciabatta|naan|flatbread|wrap)\b/, 'Bread/ Pita/ Sandwitch'],
    [/\b(walnut|almond|pistachio|cashew|peanut|pecan|hazelnut|macadamia)\b/, 'Dry Nuts'],
    [/\b(phyllo|filo|puff pastry|pie crust|shortcrust)\b/, 'Pastry'],
  ];

  // First check title (strongest signal)
  for (const [regex, tag] of checks) {
    if (regex.test(titleLower)) return tag;
  }

  // Then check ingredients
  for (const [regex, tag] of checks) {
    if (ingredients.some(i => regex.test(i))) return tag;
  }

  // Check if it's an egg-centric dish (by title)
  if (/\b(egg|omelette|omelet|frittata|quiche|shakshuka)\b/.test(titleLower)) return 'Eggs';

  // Check if it's cheese-centric (by title)
  if (/\b(cheese|cheesy|feta|halloumi|gruyere|mozzarella|parmesan|ricotta|brie|camembert)\b/.test(titleLower)) return 'Cheese';

  // Salad in title
  if (/\bsalad\b/.test(titleLower)) return 'Salad';

  // Bowl in title
  if (/\bbowl\b/.test(titleLower)) return 'Bowls';

  // Default: if mostly vegetables
  const vegCount = ingredients.filter(i =>
    /\b(tomato|onion|pepper|zucchini|eggplant|carrot|spinach|kale|broccoli|cauliflower|cabbage|lettuce|cucumber|celery|corn|peas|artichoke|asparagus|leek|beet|radish|squash|pumpkin|green bean)\b/.test(i)
  ).length;

  if (vegCount >= 3) return 'Vegetables';

  return null;
}

function inferDuration(prepTime: number, cookTime: number): string | null {
  const totalTime = prepTime + cookTime;
  if (totalTime <= 0) return null;
  if (totalTime <= 15) return 'Under 15 minutes';
  if (totalTime <= 30) return '15–30 minutes';
  if (totalTime <= 60) return '30–60 minutes';
  return 'Over 60 minutes';
}

function inferCountry(combined: string, existingTags: string[]): string | null {
  const tagsLower = existingTags.map(t => t.toLowerCase());

  // Map informal country tags
  if (tagsLower.includes('hawaiian')) return 'American';
  if (tagsLower.some(t => t === 'south american' || t === 'latin american')) return 'International';
  if (tagsLower.includes('eastern european')) return 'Balkan';
  if (tagsLower.some(t => t === 'asian' || t === 'asian inspired')) return 'International';
  if (tagsLower.includes('korean')) return 'International';
  if (tagsLower.some(t => t === 'u.s.' || t === 'southern')) return 'American';
  if (tagsLower.includes('middle eastern')) return 'Lebanese';
  if (tagsLower.includes('european')) return 'International';
  if (tagsLower.includes('mexican inspired')) return 'Mexican';
  if (tagsLower.includes('greek inspired')) return 'Greek';
  if (tagsLower.includes('comfort food')) return null; // Not a country indicator

  // Check if any existing tag already matches a Country tag
  const countryTags = TAG_CATEGORIES.find(c => c.name === 'Country')!.tags;
  for (const tag of existingTags) {
    if (countryTags.some(ct => ct.toLowerCase() === tag.toLowerCase().trim())) {
      return null; // Already has a valid country tag
    }
  }

  // Keyword matching in title/description
  const countryKeywords: [RegExp, string][] = [
    [/\b(greek|greece|hellenic|gyro|souvlaki|moussaka|tzatziki|spanakopita|pastitsio)\b/, 'Greek'],
    [/\b(italian|italy|bolognese|carbonara|napoli|sicilian|tuscan|milanese)\b/, 'Italian'],
    [/\b(french|france|provençal|provencal|parisian|bourguignon|béarnaise)\b/, 'French'],
    [/\b(mexican|mexico|taco|burrito|enchilada|guacamole|salsa|quesadilla|chipotle)\b/, 'Mexican'],
    [/\b(indian|india|curry|tikka|masala|tandoori|naan|biryani|dal|dhal)\b/, 'Indian'],
    [/\b(thai|thailand|pad thai|tom yum|green curry|red curry|satay)\b/, 'Thai'],
    [/\b(japanese|japan|sushi|ramen|teriyaki|miso|tempura|udon|soba)\b/, 'Japanese'],
    [/\b(chinese|china|wok|stir.?fry|dim sum|kung pao|szechuan|cantonese)\b/, 'Chinese'],
    [/\b(turkish|turkey|kebab|köfte|kofte|pide|lahmacun|börek|borek)\b/, 'Turkish'],
    [/\b(moroccan|morocco|tagine|harissa|ras el hanout|couscous)\b/, 'Moroccan'],
    [/\b(lebanese|lebanon|fattoush|tabouleh|tabbouleh|kibbeh|manakish)\b/, 'Lebanese'],
    [/\b(spanish|spain|paella|tapas|gazpacho|churro|patatas bravas)\b/, 'Spanish'],
    [/\b(vietnamese|vietnam|pho|banh mi|bun|vietnamese)\b/, 'Vietnamese'],
    [/\b(american|usa|burger|bbq|mac and cheese|cornbread)\b/, 'American'],
    [/\b(brazilian|brazil|açaí|acai|feijoada|brigadeiro)\b/, 'Brazilian'],
    [/\b(peruvian|peru|ceviche|lomo saltado)\b/, 'Peruvian'],
    [/\b(georgian|georgia|khachapuri|khinkali)\b/, 'Georgian'],
    [/\b(armenian|armenia|lahmajoun)\b/, 'Armenian'],
    [/\b(iranian|persian|iran|tahdig|ghormeh)\b/, 'Iranian'],
    [/\b(balkan|serbian|croatian|bosnian|burek|ćevapi)\b/, 'Balkan'],
    [/\b(german|germany|schnitzel|strudel|pretzel|bratwurst|sauerkraut)\b/, 'German'],
    [/\b(portuguese|portugal|pastéis|bacalhau|francesinha)\b/, 'Portuguese'],
  ];

  for (const [regex, country] of countryKeywords) {
    if (regex.test(combined)) return country;
  }

  // Default to International
  return 'International';
}

function inferStore(
  titleLower: string,
  combined: string,
  _ingredients: string[],
): string | null {
  // Soups and stews → Leftovers-friendly
  if (/\b(soup|stew|chili|chilli|casserole|moussaka|pastitsio|lasagna|ragout|ragu|goulash)\b/.test(combined)) {
    return 'Leftovers-friendly';
  }

  // Meatballs, burgers, patties → Freezer-friendly
  if (/\b(meatball|burger|patty|patties|croquette|dumpling|empanada)\b/.test(combined)) {
    return 'Freezer-friendly';
  }

  // Dips, sauces, marinades → Make-ahead
  if (/\b(dip|sauce|pesto|hummus|marinade|dressing|vinaigrette|aioli|tzatziki|guacamole)\b/.test(combined)) {
    return 'Make-ahead';
  }

  // One-pot dishes
  if (/\b(one.?pot|one.?pan|sheet.?pan|skillet meal)\b/.test(combined)) {
    return 'One-pot meals';
  }

  // Baked goods → Freezer-friendly
  if (/\b(bread|muffin|cookie|brownie|scone|roll|biscuit)\b/.test(titleLower)) {
    return 'Freezer-friendly';
  }

  // Conservative: don't guess for salads, fresh dishes, etc.
  return null;
}

function inferMethod(
  _titleLower: string,
  combined: string,
  cookTime: number,
): string | null {
  // Check title first (strongest signal), then combined
  // Order matters — more specific patterns first

  if (/\bair.?fr(y|ier|ied)\b/.test(combined)) return 'Air fryer';
  if (/\bsous.?vide\b/.test(combined)) return 'Sous-vide';
  if (/\b(slow.?cook|crock.?pot|crockpot)\b/.test(combined)) return 'Slow-cooked';
  if (/\bpressure.?cook|instant.?pot\b/.test(combined)) return 'Pressure cooker';

  // Pan-fried before fried (more specific first)
  if (/\b(pan.?fr(y|ied)|sauté|sautée?d|skillet|pan.?sear)\b/.test(combined)) return 'Pan-fried';

  if (/\b(grill|grilled|bbq|barbecue|charcoal)\b/.test(combined)) return 'Grilled';
  if (/\b(roast|roasted)\b/.test(combined)) return 'Roasted';
  if (/\b(bake|baked|oven)\b/.test(combined) && !/\bbaker\b/.test(combined)) return 'Baked';
  if (/\b(braise|braised)\b/.test(combined)) return 'Braised';
  if (/\b(stew|stewed)\b/.test(combined)) return 'Stewed';
  if (/\b(steam|steamed)\b/.test(combined)) return 'Steamed';
  if (/\b(boil|boiled|blanch)\b/.test(combined)) return 'Boiled';
  if (/\b(fr(y|ied)|frying|deep.?fr)\b/.test(combined) && !/\bstir.?fr/.test(combined)) return 'Fried';

  // Raw / No-cook: no cook time and keywords suggest it
  if (cookTime === 0 && /\b(salad|poke|tartare|ceviche|carpaccio|no.?cook|raw|fresh|uncooked)\b/.test(combined)) {
    return 'Raw / No-cook';
  }

  // Stir-fry → Pan-fried (closest match)
  if (/\bstir.?fr(y|ied)\b/.test(combined)) return 'Pan-fried';

  return null;
}
