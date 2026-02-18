/**
 * assign-missing-tags.ts
 *
 * Assigns tags from 6 predefined categories to all active recipes that are missing tags in each category.
 * Uses heuristic rules based on recipe title, description, ingredients, and timing.
 *
 * Run with:
 *   cd "C:\00 Paris\MealPlan"
 *   "C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" scripts/assign-missing-tags.ts
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

// Set env var so Prisma picks up the correct database
process.env.DATABASE_URL = 'file:./dev.db';

// Change working directory to where the database lives
const originalCwd = process.cwd();
process.chdir(path.resolve('C:/00 Paris/MealPlan/packages/backend'));

const prisma = new PrismaClient();

// ============================================================================
// TAG CATEGORY DEFINITIONS
// ============================================================================

const TAG_CATEGORIES: Record<string, string[]> = {
  Meal: [
    'Appetizers / Starters', 'Baking & Pastry', 'Breakfast', 'Brunch', 'Desserts',
    'Drinks / Beverages', 'Main Dishes', 'Salads', 'Sauces & Condiments', 'Side Dishes',
    'Snacks', 'Soups', 'Dips', 'Broths',
  ],
  Base: [
    'Beef', 'Bread/ Pita/ Sandwitch', 'Cheese', 'Chicken', 'Chocolate', 'Dairy', 'Eggs',
    'Fish', 'Fresh', 'Lamb / Goat', 'Legumes', 'Mixed / Assorted', 'Mushrooms', 'Pasta',
    'Pork', 'Rice & Grains', 'Salad', 'Seafood', 'Tofu / Soy', 'Turkey', 'Vegetables',
    'Potatoes', 'Pizza', 'Bowls', 'Seasonings/ Spices', 'Pastry', 'Dry Nuts',
  ],
  Duration: ['Under 15 minutes', '15\u201330 minutes', '30\u201360 minutes', 'Over 60 minutes'],
  Country: [
    'Balkan', 'Greek', 'Turkish', 'Spanish', 'Italian', 'French', 'Portuguese', 'German',
    'International', 'Georgian', 'Armenian', 'Moroccan', 'Egyptian', 'Lebanese', 'Iranian',
    'Indian', 'Chinese', 'Japanese', 'Vietnamese', 'Thai', 'Chilean', 'American', 'Brazilian',
    'Peruvian', 'Mexican',
  ],
  Store: ['Freezer-friendly', 'Leftovers-friendly', 'Make-ahead', 'One-pot meals'],
  Method: [
    'Air fryer', 'Baked', 'Boiled', 'Braised', 'Fried', 'Grilled', 'Pan-fried',
    'Pressure cooker', 'Raw / No-cook', 'Roasted', 'Slow-cooked', 'Sous-vide', 'Steamed', 'Stewed',
  ],
};

// Build a lowercase lookup: for each category, map lowercase tag -> exact tag
const categoryLookup: Record<string, Map<string, string>> = {};
for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
  categoryLookup[cat] = new Map(tags.map(t => [t.toLowerCase(), t]));
}

// ============================================================================
// TYPES
// ============================================================================

interface RecipeData {
  id: string;
  title: string;
  description: string | null;
  tags: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
  ingredients: { ingredient: { name: string; category: string | null } }[];
}

interface TagAssignment {
  category: string;
  tag: string;
  reason: string;
}

interface UnresolvedCategory {
  category: string;
  reason: string;
}

interface RecipeReport {
  id: string;
  title: string;
  assigned: TagAssignment[];
  unresolved: UnresolvedCategory[];
  existingCategoriesCovered: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExistingTags(recipe: RecipeData): string[] {
  return recipe.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

/** Check which categories a recipe already has tags for */
function getCoveredCategories(existingTags: string[]): Set<string> {
  const covered = new Set<string>();
  for (const tag of existingTags) {
    const tagLower = tag.toLowerCase();
    for (const [cat, lookup] of Object.entries(categoryLookup)) {
      if (lookup.has(tagLower)) {
        covered.add(cat);
      }
    }
  }
  return covered;
}

function lc(s: string | null | undefined): string {
  return (s || '').toLowerCase();
}

function ingredientNames(recipe: RecipeData): string[] {
  return recipe.ingredients.map(i => lc(i.ingredient.name));
}

function textContains(text: string, ...keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function anyIngredientMatches(names: string[], ...keywords: string[]): boolean {
  return names.some(name => keywords.some(kw => name.includes(kw)));
}

// ============================================================================
// HEURISTIC: MEAL CATEGORY
// ============================================================================

function assignMealTag(recipe: RecipeData, existingTags: string[], ingNames: string[]): TagAssignment | null {
  const title = lc(recipe.title);
  const desc = lc(recipe.description);
  const tagsLower = existingTags.map(t => t.toLowerCase());
  const allText = `${title} ${desc} ${tagsLower.join(' ')}`;

  // Map existing tags to Meal tags
  const tagMappings: [string[], string][] = [
    [['dinner', 'entree', 'main course', 'main dish'], 'Main Dishes'],
    [['appetizer', 'starter', 'meze', 'mezze'], 'Appetizers / Starters'],
    [['soup'], 'Soups'],
    [['side dish', 'side'], 'Side Dishes'],
    [['breakfast'], 'Breakfast'],
    [['dessert', 'sweet'], 'Desserts'],
    [['salad'], 'Salads'],
    [['sandwich'], 'Main Dishes'],
    [['snack'], 'Snacks'],
    [['condiment', 'sauce', 'dressing'], 'Sauces & Condiments'],
    [['pie', 'tart', 'pastry'], 'Baking & Pastry'],
    [['brunch'], 'Brunch'],
    [['dip'], 'Dips'],
    [['broth', 'stock'], 'Broths'],
  ];

  // First check existing tags for mappable values
  for (const [keywords, mealTag] of tagMappings) {
    if (tagsLower.some(t => keywords.some(kw => t.includes(kw)))) {
      return { category: 'Meal', tag: mealTag, reason: `existing tag matches "${keywords.find(kw => tagsLower.some(t => t.includes(kw)))}"` };
    }
  }

  // Check title and description keywords
  if (textContains(allText, 'soup', 'avgolemono', 'minestrone', 'chowder', 'bisque', 'brodo', 'fasolada', 'psarosoupa', 'trahana')) {
    return { category: 'Meal', tag: 'Soups', reason: 'title/desc contains soup keyword' };
  }
  if (textContains(title, 'salad', 'salata', 'slaw', 'coleslaw')) {
    return { category: 'Meal', tag: 'Salads', reason: 'title contains salad keyword' };
  }
  if (textContains(allText, 'dip', 'hummus', 'tzatziki', 'guacamole', 'skordalia', 'taramosalata', 'melitzanosalata', 'tirokafteri', 'htipiti', 'fava dip')) {
    return { category: 'Meal', tag: 'Dips', reason: 'title/desc contains dip keyword' };
  }
  if (textContains(allText, 'sauce', 'pesto', 'vinaigrette', 'marinade', 'glaze', 'salsa', 'chutney', 'relish')) {
    return { category: 'Meal', tag: 'Sauces & Condiments', reason: 'title/desc contains sauce keyword' };
  }
  if (textContains(allText, 'dessert', 'cake', 'cookie', 'brownie', 'ice cream', 'mousse', 'pudding', 'custard', 'galaktoboureko', 'baklava', 'halva', 'loukoumades', 'portokalopita', 'ravani', 'syrup cake', 'sweet')) {
    return { category: 'Meal', tag: 'Desserts', reason: 'title/desc contains dessert keyword' };
  }
  if (textContains(allText, 'pie', 'tart', 'spanakopita', 'tiropita', 'bougatsa', 'phyllo', 'filo', 'puff pastry', 'croissant', 'bread', 'muffin', 'scone', 'biscuit', 'roll')) {
    return { category: 'Meal', tag: 'Baking & Pastry', reason: 'title/desc contains baking keyword' };
  }
  if (textContains(allText, 'breakfast', 'omelette', 'omelet', 'pancake', 'waffle', 'french toast', 'eggs benedict', 'granola', 'cereal', 'overnight oats', 'açai')) {
    return { category: 'Meal', tag: 'Breakfast', reason: 'title/desc contains breakfast keyword' };
  }
  if (textContains(allText, 'brunch')) {
    return { category: 'Meal', tag: 'Brunch', reason: 'title/desc contains brunch' };
  }
  if (textContains(allText, 'appetizer', 'starter', 'meze', 'mezze', 'crostini', 'bruschetta', 'tapas')) {
    return { category: 'Meal', tag: 'Appetizers / Starters', reason: 'title/desc contains appetizer keyword' };
  }
  if (textContains(allText, 'snack', 'energy ball', 'trail mix', 'popcorn', 'chips')) {
    return { category: 'Meal', tag: 'Snacks', reason: 'title/desc contains snack keyword' };
  }
  if (textContains(allText, 'drink', 'smoothie', 'juice', 'lemonade', 'cocktail', 'milkshake', 'frappe', 'tea', 'coffee')) {
    return { category: 'Meal', tag: 'Drinks / Beverages', reason: 'title/desc contains drink keyword' };
  }
  if (textContains(allText, 'broth', 'stock')) {
    return { category: 'Meal', tag: 'Broths', reason: 'title/desc contains broth/stock keyword' };
  }

  // If recipe has a main protein and reasonable servings, it's probably a main dish
  const hasProtein = anyIngredientMatches(ingNames, 'chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'shrimp', 'turkey', 'steak', 'ground');
  if (hasProtein && recipe.servings >= 2) {
    return { category: 'Meal', tag: 'Main Dishes', reason: 'has main protein + servings >= 2' };
  }

  // If it has pasta, rice, legumes as main → Main Dishes
  if (anyIngredientMatches(ingNames, 'pasta', 'spaghetti', 'penne', 'linguine', 'rice', 'lentil', 'chickpea', 'bean')) {
    return { category: 'Meal', tag: 'Main Dishes', reason: 'has starchy base ingredient' };
  }

  // Side dish as fallback for veggie-heavy recipes
  if (anyIngredientMatches(ingNames, 'potato', 'broccoli', 'cauliflower', 'zucchini', 'eggplant', 'spinach', 'green bean')) {
    return { category: 'Meal', tag: 'Side Dishes', reason: 'veggie-heavy, defaulting to side dish' };
  }

  return null;
}

// ============================================================================
// HEURISTIC: BASE CATEGORY
// ============================================================================

function assignBaseTag(recipe: RecipeData, existingTags: string[], ingNames: string[]): TagAssignment | null {
  const title = lc(recipe.title);
  const tagsLower = existingTags.map(t => t.toLowerCase());

  // Check existing tags for direct mappings
  if (tagsLower.some(t => t === 'pasta')) return { category: 'Base', tag: 'Pasta', reason: 'existing tag "Pasta"' };
  if (tagsLower.some(t => t === 'salad')) return { category: 'Base', tag: 'Salad', reason: 'existing tag "Salad"' };
  if (tagsLower.some(t => t === 'pizza')) return { category: 'Base', tag: 'Pizza', reason: 'existing tag "Pizza"' };
  if (tagsLower.some(t => t === 'rice' || t === 'grains')) return { category: 'Base', tag: 'Rice & Grains', reason: 'existing tag rice/grains' };

  // Check title first for strong signals
  if (textContains(title, 'pizza')) return { category: 'Base', tag: 'Pizza', reason: 'title contains pizza' };
  if (textContains(title, 'salad', 'salata', 'slaw')) return { category: 'Base', tag: 'Salad', reason: 'title contains salad' };
  if (textContains(title, 'pasta', 'spaghetti', 'penne', 'linguine', 'macaroni', 'noodle', 'orzo', 'carbonara', 'bolognese', 'cacio e pepe', 'aglio', 'lasagna', 'pastitsio', 'giouvetsi')) {
    return { category: 'Base', tag: 'Pasta', reason: 'title contains pasta keyword' };
  }
  if (textContains(title, 'egg', 'omelette', 'omelet', 'frittata', 'strapatsada', 'shakshuka', 'kayanas')) {
    return { category: 'Base', tag: 'Eggs', reason: 'title contains egg-centric keyword' };
  }
  if (textContains(title, 'cheese', 'tiropita', 'saganaki', 'feta', 'halloumi', 'gruyere', 'mac and cheese')) {
    return { category: 'Base', tag: 'Cheese', reason: 'title contains cheese-centric keyword' };
  }
  if (textContains(title, 'chocolate', 'cocoa', 'brownie')) return { category: 'Base', tag: 'Chocolate', reason: 'title contains chocolate' };
  if (textContains(title, 'bread', 'pita', 'sandwich', 'burger', 'tortilla', 'wrap', 'focaccia', 'bagel', 'toast')) {
    return { category: 'Base', tag: 'Bread/ Pita/ Sandwitch', reason: 'title contains bread keyword' };
  }
  if (textContains(title, 'bowl', 'poke')) return { category: 'Base', tag: 'Bowls', reason: 'title contains bowl' };

  // Check ingredients for primary protein/base (order matters - check most specific first)
  const proteinChecks: [string[], string][] = [
    [['chicken', 'poultry'], 'Chicken'],
    [['beef', 'ground beef', 'steak', 'veal', 'brisket'], 'Beef'],
    [['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'sausage', 'chorizo'], 'Pork'],
    [['lamb', 'goat'], 'Lamb / Goat'],
    [['turkey'], 'Turkey'],
    [['salmon', 'tuna', 'cod', 'tilapia', 'sea bass', 'trout', 'swordfish', 'sardine', 'anchovy', 'mackerel', 'halibut', 'snapper', 'fish'], 'Fish'],
    [['shrimp', 'prawn', 'crab', 'lobster', 'squid', 'octopus', 'mussel', 'clam', 'calamari', 'scallop'], 'Seafood'],
    [['tofu', 'tempeh', 'soy', 'edamame'], 'Tofu / Soy'],
  ];

  for (const [keywords, baseTag] of proteinChecks) {
    if (anyIngredientMatches(ingNames, ...keywords) || textContains(title, ...keywords)) {
      return { category: 'Base', tag: baseTag, reason: `ingredient/title matches ${baseTag}` };
    }
  }

  // Starchy base checks
  if (anyIngredientMatches(ingNames, 'pasta', 'spaghetti', 'penne', 'linguine', 'macaroni', 'noodle', 'orzo', 'fusilli', 'rigatoni', 'tagliatelle')) {
    return { category: 'Base', tag: 'Pasta', reason: 'ingredient contains pasta' };
  }
  if (anyIngredientMatches(ingNames, 'rice', 'risotto', 'pilaf', 'quinoa', 'bulgur', 'couscous', 'barley', 'oat', 'farro', 'polenta', 'cornmeal')) {
    return { category: 'Base', tag: 'Rice & Grains', reason: 'ingredient contains rice/grains' };
  }
  if (anyIngredientMatches(ingNames, 'lentil', 'chickpea', 'bean', 'fava', 'split pea', 'black-eyed pea', 'cannellini', 'kidney bean', 'navy bean')) {
    return { category: 'Base', tag: 'Legumes', reason: 'ingredient contains legumes' };
  }
  if (anyIngredientMatches(ingNames, 'potato', 'sweet potato')) {
    return { category: 'Base', tag: 'Potatoes', reason: 'ingredient contains potato' };
  }
  if (anyIngredientMatches(ingNames, 'mushroom', 'shiitake', 'portobello', 'cremini', 'porcini', 'oyster mushroom')) {
    // Only if mushroom is prominent (check title too)
    if (textContains(title, 'mushroom')) {
      return { category: 'Base', tag: 'Mushrooms', reason: 'title + ingredient contain mushroom' };
    }
  }

  // Pastry/dough based
  if (textContains(title, 'pie', 'tart', 'quiche', 'phyllo', 'filo', 'spanakopita', 'tiropita', 'bougatsa', 'strudel', 'galette', 'puff', 'croissant', 'pastry')) {
    return { category: 'Base', tag: 'Pastry', reason: 'title contains pastry keyword' };
  }

  // Nuts as main
  if (textContains(title, 'walnut', 'almond', 'pistachio', 'cashew', 'pecan', 'hazelnut', 'nut')) {
    return { category: 'Base', tag: 'Dry Nuts', reason: 'title contains nut keyword' };
  }

  // Check for chocolate in ingredients
  if (anyIngredientMatches(ingNames, 'chocolate', 'cocoa', 'cacao')) {
    return { category: 'Base', tag: 'Chocolate', reason: 'ingredient contains chocolate' };
  }

  // Check for primarily vegetables
  const veggieIngredients = ingNames.filter(name =>
    ['zucchini', 'eggplant', 'tomato', 'pepper', 'onion', 'garlic', 'carrot', 'broccoli',
     'cauliflower', 'spinach', 'kale', 'cabbage', 'celery', 'artichoke', 'asparagus',
     'green bean', 'pea', 'corn', 'squash', 'leek', 'beet', 'turnip', 'radish',
     'cucumber', 'lettuce', 'arugula', 'fennel', 'okra'].some(v => name.includes(v))
  );
  const totalIng = ingNames.length;
  if (totalIng > 0 && veggieIngredients.length / totalIng > 0.4) {
    return { category: 'Base', tag: 'Vegetables', reason: 'primarily vegetable ingredients' };
  }

  // Mixed/Assorted as last resort if multiple proteins detected
  const proteinTypes = new Set<string>();
  for (const [keywords, baseTag] of proteinChecks) {
    if (anyIngredientMatches(ingNames, ...keywords)) proteinTypes.add(baseTag);
  }
  if (proteinTypes.size > 1) {
    return { category: 'Base', tag: 'Mixed / Assorted', reason: 'multiple protein types detected' };
  }

  return null;
}

// ============================================================================
// HEURISTIC: DURATION CATEGORY
// ============================================================================

function assignDurationTag(recipe: RecipeData): TagAssignment | null {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime <= 0) return null;

  if (totalTime <= 15) return { category: 'Duration', tag: 'Under 15 minutes', reason: `totalTime=${totalTime}min` };
  if (totalTime <= 30) return { category: 'Duration', tag: '15\u201330 minutes', reason: `totalTime=${totalTime}min` };
  if (totalTime <= 60) return { category: 'Duration', tag: '30\u201360 minutes', reason: `totalTime=${totalTime}min` };
  return { category: 'Duration', tag: 'Over 60 minutes', reason: `totalTime=${totalTime}min` };
}

// ============================================================================
// HEURISTIC: COUNTRY CATEGORY
// ============================================================================

function assignCountryTag(recipe: RecipeData, existingTags: string[]): TagAssignment | null {
  const tagsLower = existingTags.map(t => t.toLowerCase());
  const title = lc(recipe.title);
  const desc = lc(recipe.description);
  const allText = `${title} ${desc} ${tagsLower.join(' ')}`;

  // Map existing tags
  const countryMappings: [string[], string][] = [
    [['hawaiian'], 'American'],
    [['south american'], 'International'],
    [['eastern european'], 'Balkan'],
    [['asian', 'asian inspired'], 'International'],
    [['korean'], 'International'],
    [['u.s.', 'southern'], 'American'],
    [['latin american'], 'International'],
    [['middle eastern'], 'Lebanese'],
    [['european'], 'International'],
    [['mexican inspired'], 'Mexican'],
    [['greek inspired'], 'Greek'],
  ];

  // Ignore these tags (not country-related)
  const ignoreTags = ['\u03b5\u03cd\u03ba\u03bf\u03bb\u03b7', 'comfort food', 'easy', 'quick', 'healthy', 'vegetarian', 'vegan',
    'gluten-free', 'low-carb', 'keto', 'dairy-free', 'budget'];

  // First check if any existing tag directly matches a valid country tag
  const validCountries = TAG_CATEGORIES.Country;
  for (const tag of existingTags) {
    if (validCountries.some(c => c.toLowerCase() === tag.toLowerCase())) {
      return null; // Already has a valid country tag (shouldn't reach here but just in case)
    }
  }

  // Check existing tags for mappable values
  for (const [keywords, countryTag] of countryMappings) {
    if (tagsLower.some(t => keywords.some(kw => t.includes(kw)))) {
      return { category: 'Country', tag: countryTag, reason: `mapped from existing tag` };
    }
  }

  // Check title/description for country-specific keywords
  const countryKeywords: [string[], string][] = [
    [['greek', 'greece', 'souvlaki', 'moussaka', 'pastitsio', 'tzatziki', 'spanakopita', 'tiropita', 'dolmades', 'fasolada', 'stifado', 'gemista', 'giouvetsi', 'kleftiko', 'kokoretsi', 'baklava', 'galaktoboureko', 'bougatsa', 'revani', 'loukoumades', 'feta', 'horiatiki', 'horta', 'saganaki', 'gyro', 'kalamata', 'avgolemon', 'briam', 'youvarlakia', 'kolokithokeftedes', 'melitzanosalata', 'skordalia', 'taramosalata', 'htipiti', 'strapatsada', 'papoutsakia', 'imam baildi', 'gigantes', 'spetsofai', 'soutzoukakia', 'revithada', 'portokalopita', 'kourabiedes', 'melomakarona', 'kayanas'], 'Greek'],
    [['italian', 'italy', 'carbonara', 'bolognese', 'risotto', 'bruschetta', 'tiramisu', 'lasagna', 'pizza', 'pesto', 'gnocchi', 'osso buco', 'polenta', 'prosciutto', 'focaccia', 'arancini', 'panna cotta', 'cacio e pepe', 'aglio e olio', 'minestrone', 'carpaccio', 'vitello', 'saltimbocca', 'piccata'], 'Italian'],
    [['french', 'france', 'ratatouille', 'croissant', 'quiche', 'bouillabaisse', 'cr\u00e8me', 'bechamel', 'b\u00e9chamel', 'gratin', 'coq au vin', 'confit', 'souffl\u00e9', 'cassoulet', 'tarte', 'madeleine', 'crepe', 'nicoise', 'bourguignon', 'proven\u00e7al'], 'French'],
    [['turkish', 'turkey', 'doner', 'kebab', 'borek', 'baklava', 'lahmacun', 'pide', 'manti', 'kofte', 'iskender', 'adana', 'menemen', 'simit'], 'Turkish'],
    [['spanish', 'spain', 'paella', 'tapas', 'gazpacho', 'churro', 'croqueta', 'patatas bravas', 'tortilla espa\u00f1ola', 'sangria', 'pinchos'], 'Spanish'],
    [['moroccan', 'morocco', 'tagine', 'couscous', 'harissa', 'chermoula', 'ras el hanout', 'b\'stilla', 'pastilla'], 'Moroccan'],
    [['indian', 'india', 'curry', 'tandoori', 'tikka', 'masala', 'biryani', 'naan', 'samosa', 'dal', 'dhal', 'paneer', 'korma', 'vindaloo', 'chutney', 'raita', 'pakora', 'roti', 'chapati', 'ghee'], 'Indian'],
    [['chinese', 'china', 'stir-fry', 'wok', 'dim sum', 'dumpling', 'kung pao', 'sweet and sour', 'fried rice', 'chow mein', 'lo mein', 'mapo tofu', 'szechuan', 'sichuan', 'hoisin', 'five spice'], 'Chinese'],
    [['japanese', 'japan', 'sushi', 'ramen', 'udon', 'tempura', 'teriyaki', 'miso', 'edamame', 'tonkatsu', 'gyoza', 'sashimi', 'matcha', 'sake', 'dashi', 'okonomiyaki', 'yakitori', 'katsu', 'onigiri'], 'Japanese'],
    [['thai', 'thailand', 'pad thai', 'green curry', 'red curry', 'tom yum', 'tom kha', 'satay', 'basil chicken', 'thai basil', 'fish sauce', 'coconut curry', 'larb', 'som tam', 'massaman'], 'Thai'],
    [['vietnamese', 'vietnam', 'pho', 'banh mi', 'spring roll', 'bun', 'nuoc mam', 'lemongrass'], 'Vietnamese'],
    [['mexican', 'mexico', 'taco', 'burrito', 'enchilada', 'quesadilla', 'guacamole', 'nachos', 'fajita', 'salsa', 'mole', 'pozole', 'tamale', 'churro', 'elote', 'jalape\u00f1o', 'chipotle'], 'Mexican'],
    [['american', 'usa', 'bbq', 'barbecue', 'mac and cheese', 'hamburger', 'hot dog', 'buffalo', 'ranch', 'cornbread', 'cajun', 'creole', 'jambalaya', 'gumbo', 'chili con carne', 'sloppy joe', 'clam chowder', 'po\' boy', 'pulled pork', 'coleslaw'], 'American'],
    [['lebanese', 'lebanon', 'kibbeh', 'tabbouleh', 'fattoush', 'hummus', 'falafel', 'shawarma', 'manakish', 'labneh', 'baba ganoush', 'mujaddara', 'kafta'], 'Lebanese'],
    [['georgian', 'georgia', 'khachapuri', 'khinkali', 'lobio', 'pkhali', 'badrijani', 'churchkhela'], 'Georgian'],
    [['armenian', 'armenia', 'lahmajoun'], 'Armenian'],
    [['iranian', 'persian', 'iran', 'tahdig', 'ghormeh sabzi', 'fesenjan', 'joojeh', 'zereshk', 'ash reshteh', 'saffron rice'], 'Iranian'],
    [['brazilian', 'brazil', 'feijoada', 'churrasco', 'pao de queijo', 'acai', 'brigadeiro', 'moqueca', 'farofa', 'coxinha'], 'Brazilian'],
    [['peruvian', 'peru', 'ceviche', 'lomo saltado', 'causa', 'aji', 'anticucho'], 'Peruvian'],
    [['balkan', 'serbian', 'croatian', 'bosnian', 'bulgarian', 'cevapi', 'burek', 'sarma', 'ajvar', 'shopska', 'pljeskavica', 'musaka'], 'Balkan'],
    [['portuguese', 'portugal', 'bacalhau', 'pastel de nata', 'caldo verde', 'francesinha', 'cataplana'], 'Portuguese'],
    [['german', 'germany', 'schnitzel', 'pretzel', 'bratwurst', 'sauerkraut', 'strudel', 'sp\u00e4tzle', 'kartoffelpuffer'], 'German'],
    [['egyptian', 'egypt', 'koshari', 'ful medames', 'molokhia'], 'Egyptian'],
    [['chilean', 'chile', 'empanada', 'pastel de choclo', 'curanto', 'completo'], 'Chilean'],
  ];

  for (const [keywords, countryTag] of countryKeywords) {
    if (keywords.some(kw => allText.includes(kw))) {
      return { category: 'Country', tag: countryTag, reason: `text matches ${countryTag} keyword` };
    }
  }

  // Check for tags from Akis Petretzikis or Argiro Barbarigou → Greek
  if (tagsLower.some(t => t.includes('akis') || t.includes('argiro'))) {
    return { category: 'Country', tag: 'Greek', reason: 'tagged with Greek chef name' };
  }

  // Default to International
  return { category: 'Country', tag: 'International', reason: 'no country indicators found, defaulting to International' };
}

// ============================================================================
// HEURISTIC: STORE CATEGORY
// ============================================================================

function assignStoreTag(recipe: RecipeData, existingTags: string[], ingNames: string[]): TagAssignment | null {
  const title = lc(recipe.title);
  const desc = lc(recipe.description);
  const allText = `${title} ${desc}`;

  // Fresh dishes that don't store well → unresolved
  if (textContains(allText, 'salad', 'poke', 'ceviche', 'carpaccio', 'sashimi', 'tartare')) {
    return null; // Mark as unresolved
  }

  // Soups, stews, casseroles → Leftovers-friendly
  if (textContains(allText, 'soup', 'stew', 'casserole', 'moussaka', 'pastitsio', 'lasagna', 'chili', 'goulash',
    'ragu', 'ragout', 'pot roast', 'braise', 'fasolada', 'bean soup', 'lentil soup', 'youvarlakia',
    'stifado', 'giouvetsi', 'kapama', 'kokkinisto')) {
    return { category: 'Store', tag: 'Leftovers-friendly', reason: 'soup/stew/casserole recipe' };
  }

  // One-pot meals
  if (textContains(allText, 'one-pot', 'one pot', 'sheet pan', 'sheet-pan', 'risotto', 'pilaf', 'jambalaya', 'paella')) {
    return { category: 'Store', tag: 'One-pot meals', reason: 'one-pot/sheet pan recipe' };
  }

  // Freezer-friendly
  if (textContains(allText, 'meatball', 'keftedes', 'burger', 'patty', 'patties', 'sausage roll', 'empanada',
    'dumpling', 'gyoza', 'pierogi', 'spanakopita', 'tiropita', 'borek', 'pie', 'bread', 'rolls', 'bun')) {
    return { category: 'Store', tag: 'Freezer-friendly', reason: 'freezable items (meatballs/patties/pies/bread)' };
  }

  // Make-ahead
  if (textContains(allText, 'marinade', 'marinated', 'overnight', 'make-ahead', 'make ahead', 'dip', 'sauce',
    'hummus', 'tzatziki', 'pesto', 'vinaigrette', 'dressing', 'guacamole', 'tapenade', 'jam', 'pickle',
    'preserve', 'compote')) {
    return { category: 'Store', tag: 'Make-ahead', reason: 'make-ahead/marinated/dip/sauce' };
  }

  // Stews/soups that are also one-pot
  if (textContains(allText, 'lentil', 'bean', 'chickpea', 'split pea') && textContains(allText, 'soup', 'stew')) {
    return { category: 'Store', tag: 'One-pot meals', reason: 'legume soup/stew (one-pot)' };
  }

  // Baked goods → Freezer-friendly
  if (textContains(allText, 'cake', 'cookie', 'brownie', 'muffin', 'scone', 'biscuit')) {
    return { category: 'Store', tag: 'Freezer-friendly', reason: 'baked goods are freezer-friendly' };
  }

  return null; // Can't determine
}

// ============================================================================
// HEURISTIC: METHOD CATEGORY
// ============================================================================

function assignMethodTag(recipe: RecipeData, existingTags: string[]): TagAssignment | null {
  const title = lc(recipe.title);
  const desc = lc(recipe.description);
  const tagsLower = existingTags.map(t => t.toLowerCase());
  const allText = `${title} ${desc} ${tagsLower.join(' ')}`;

  // Check in order of specificity
  if (textContains(allText, 'air fryer', 'air-fryer', 'airfryer')) {
    return { category: 'Method', tag: 'Air fryer', reason: 'text contains air fryer' };
  }
  if (textContains(allText, 'sous-vide', 'sous vide')) {
    return { category: 'Method', tag: 'Sous-vide', reason: 'text contains sous-vide' };
  }
  if (textContains(allText, 'pressure cook', 'instant pot', 'pressure-cook')) {
    return { category: 'Method', tag: 'Pressure cooker', reason: 'text contains pressure cooker/instant pot' };
  }
  if (textContains(allText, 'slow cook', 'slow-cook', 'crock pot', 'crockpot', 'slow cooker')) {
    return { category: 'Method', tag: 'Slow-cooked', reason: 'text contains slow cook' };
  }
  if (textContains(allText, 'grill', 'grilled', 'bbq', 'barbecue', 'charcoal', 'char-grill')) {
    return { category: 'Method', tag: 'Grilled', reason: 'text contains grill/bbq' };
  }
  if (textContains(allText, 'pan-fry', 'pan-fried', 'pan fry', 'pan fried', 'saut\u00e9', 'sauteed', 'saut\u00e9ed', 'skillet', 'pan sear', 'pan-sear', 'stir-fry', 'stir fry', 'stir-fried')) {
    return { category: 'Method', tag: 'Pan-fried', reason: 'text contains pan-fry/saute/skillet' };
  }
  if (textContains(allText, 'braise', 'braised')) {
    return { category: 'Method', tag: 'Braised', reason: 'text contains braise' };
  }
  if (textContains(allText, 'steam', 'steamed')) {
    return { category: 'Method', tag: 'Steamed', reason: 'text contains steam' };
  }
  if (textContains(allText, 'stew', 'stewed')) {
    return { category: 'Method', tag: 'Stewed', reason: 'text contains stew' };
  }
  if (textContains(allText, 'roast', 'roasted')) {
    return { category: 'Method', tag: 'Roasted', reason: 'text contains roast' };
  }
  if (textContains(allText, 'bake', 'baked', 'oven')) {
    return { category: 'Method', tag: 'Baked', reason: 'text contains bake/oven' };
  }
  if (textContains(allText, 'boil', 'boiled', 'blanch')) {
    return { category: 'Method', tag: 'Boiled', reason: 'text contains boil' };
  }
  // Generic fry (after checking for air fryer and pan-fry)
  if (textContains(allText, 'fry', 'fried', 'frying', 'deep-fry', 'deep fry', 'deep fried')) {
    return { category: 'Method', tag: 'Fried', reason: 'text contains fry/fried' };
  }

  // Check if no-cook: salad, dip, sauce with cookTime = 0
  if ((recipe.cookTime === 0 || recipe.cookTime === null) &&
      textContains(allText, 'salad', 'dip', 'sauce', 'raw', 'no-cook', 'no cook', 'uncooked', 'fresh',
        'smoothie', 'juice', 'hummus', 'tzatziki', 'guacamole', 'pesto', 'vinaigrette', 'tartare',
        'ceviche', 'carpaccio', 'poke', 'gazpacho')) {
    return { category: 'Method', tag: 'Raw / No-cook', reason: 'no cook time + raw/fresh/salad/dip' };
  }

  return null;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('=== Assign Missing Tags Script ===\n');

  // Fetch all active recipes with ingredients
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      prepTime: true,
      cookTime: true,
      servings: true,
      ingredients: {
        select: {
          ingredient: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${recipes.length} active recipes.\n`);

  const allCategories = Object.keys(TAG_CATEGORIES);
  const reports: RecipeReport[] = [];
  let totalTagsAdded = 0;
  const categoryStats: Record<string, number> = {};
  for (const cat of allCategories) categoryStats[cat] = 0;

  for (const recipe of recipes) {
    const existingTags = getExistingTags(recipe);
    const coveredCategories = getCoveredCategories(existingTags);
    const missingCategories = allCategories.filter(cat => !coveredCategories.has(cat));

    if (missingCategories.length === 0) continue; // All categories covered

    const ingNames = ingredientNames(recipe);
    const assigned: TagAssignment[] = [];
    const unresolved: UnresolvedCategory[] = [];

    for (const category of missingCategories) {
      let result: TagAssignment | null = null;

      switch (category) {
        case 'Meal':
          result = assignMealTag(recipe, existingTags, ingNames);
          break;
        case 'Base':
          result = assignBaseTag(recipe, existingTags, ingNames);
          break;
        case 'Duration':
          result = assignDurationTag(recipe);
          break;
        case 'Country':
          result = assignCountryTag(recipe, existingTags);
          break;
        case 'Store':
          result = assignStoreTag(recipe, existingTags, ingNames);
          break;
        case 'Method':
          result = assignMethodTag(recipe, existingTags);
          break;
      }

      if (result) {
        assigned.push(result);
        categoryStats[category]++;
      } else {
        unresolved.push({
          category,
          reason: category === 'Duration' ? 'no prep/cook time data' :
                  category === 'Store' ? 'cannot determine storage suitability' :
                  category === 'Method' ? 'no cooking method keywords found' :
                  `no ${category.toLowerCase()} indicators found`,
        });
      }
    }

    // Apply the assigned tags via Prisma
    if (assigned.length > 0) {
      const newTags = [...existingTags, ...assigned.map(a => a.tag)];
      const newTagsString = newTags.join(', ');

      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags: newTagsString },
      });

      totalTagsAdded += assigned.length;
    }

    reports.push({
      id: recipe.id,
      title: recipe.title,
      assigned,
      unresolved,
      existingCategoriesCovered: [...coveredCategories],
    });
  }

  // ============================================================================
  // CONSOLE REPORT
  // ============================================================================

  console.log('=== RESULTS ===\n');
  console.log(`Total recipes processed: ${reports.length}`);
  console.log(`Total tags added: ${totalTagsAdded}\n`);

  console.log('Tags assigned per category:');
  for (const [cat, count] of Object.entries(categoryStats)) {
    console.log(`  ${cat}: ${count}`);
  }

  // Count unresolved per category
  const unresolvedStats: Record<string, number> = {};
  for (const cat of allCategories) unresolvedStats[cat] = 0;
  for (const report of reports) {
    for (const u of report.unresolved) {
      unresolvedStats[u.category]++;
    }
  }
  console.log('\nUnresolved per category:');
  for (const [cat, count] of Object.entries(unresolvedStats)) {
    if (count > 0) console.log(`  ${cat}: ${count}`);
  }

  // List recipes with unresolved categories
  const unresolvedRecipes = reports.filter(r => r.unresolved.length > 0);
  if (unresolvedRecipes.length > 0) {
    console.log(`\n=== UNRESOLVED RECIPES (${unresolvedRecipes.length}) ===\n`);
    for (const r of unresolvedRecipes) {
      const cats = r.unresolved.map(u => u.category).join(', ');
      console.log(`  "${r.title}" — missing: ${cats}`);
    }
  }

  // ============================================================================
  // EXCEL REPORT
  // ============================================================================

  const assignedRows: any[] = [];
  const unresolvedRows: any[] = [];

  for (const report of reports) {
    for (const a of report.assigned) {
      assignedRows.push({
        'Recipe ID': report.id,
        'Recipe Title': report.title,
        'Category': a.category,
        'Tag Assigned': a.tag,
        'Reason': a.reason,
      });
    }
    for (const u of report.unresolved) {
      unresolvedRows.push({
        'Recipe ID': report.id,
        'Recipe Title': report.title,
        'Category': u.category,
        'Reason': u.reason,
      });
    }
  }

  const summaryRows = allCategories.map(cat => ({
    'Category': cat,
    'Tags Assigned': categoryStats[cat],
    'Unresolved': unresolvedStats[cat],
  }));

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Assigned tags sheet
  if (assignedRows.length > 0) {
    const assignedSheet = XLSX.utils.json_to_sheet(assignedRows);
    assignedSheet['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 12 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, assignedSheet, 'Assigned Tags');
  }

  // Unresolved sheet
  if (unresolvedRows.length > 0) {
    const unresolvedSheet = XLSX.utils.json_to_sheet(unresolvedRows);
    unresolvedSheet['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 12 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, unresolvedSheet, 'Unresolved');
  }

  const outputPath = 'C:/00 Paris/MealPlan/tag-assignment-report.xlsx';
  XLSX.writeFile(wb, outputPath);
  console.log(`\nExcel report saved to: ${outputPath}`);

  console.log('\n=== DONE ===');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
