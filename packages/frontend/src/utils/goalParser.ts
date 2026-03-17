import { TAG_CATEGORIES } from '../data/tagDefinitions';

export type GoalType = 'meal_plan' | 'recipes' | 'collection' | 'shopping';
export type DietGoal = 'lose_weight' | 'maintain' | 'build_muscle';

export interface ParsedGoal {
  goalType: GoalType;
  durationDays: number | null;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  dietGoal: DietGoal | null;
  caloriesMin: number | null;
  caloriesMax: number | null;
  preferredMethods: string[];
  mealTypes: string[];
  descriptors: string[];
  concept: string;
  rawInput: string;
}

// --- Keyword maps ---

const GOAL_TYPE_PATTERNS: { type: GoalType; patterns: RegExp[] }[] = [
  {
    type: 'meal_plan',
    patterns: [
      /meal\s*plan/i, /week\s*plan/i, /plan\s+my\s+(week|meals)/i,
      /weekly\s+(menu|plan|meals)/i, /plan\s+for\s+\d+\s*(day|week)/i,
      /\d+\s*(day|week)\s*(meal)?\s*plan/i, /healthy\s+plan/i,
    ],
  },
  {
    type: 'shopping',
    patterns: [
      /shopping\s*list/i, /grocer(y|ies)/i, /buy\s+ingredients/i, /shop\s+for/i,
    ],
  },
  {
    type: 'collection',
    patterns: [
      /collection/i, /save\s+recipes/i, /organize\s+recipes/i, /group\s+of\s+recipes/i,
      /make\s+a\s+(group|set)\s+of/i,
    ],
  },
  // 'recipes' is the default fallback
];

const DIETARY_MAP: Record<string, string> = {
  'vegetarian': 'Vegetarian', 'veggie': 'Vegetarian',
  'vegan': 'Vegan',
  'gluten-free': 'Gluten-free', 'gluten free': 'Gluten-free', 'no gluten': 'Gluten-free',
  'dairy-free': 'Dairy-free', 'dairy free': 'Dairy-free', 'no dairy': 'Dairy-free', 'lactose free': 'Dairy-free',
  'keto': 'Keto', 'ketogenic': 'Keto',
  'paleo': 'Paleo',
  'low-carb': 'Low-carb', 'low carb': 'Low-carb',
  'mediterranean': 'Mediterranean',
  'pescatarian': 'Pescatarian',
  'whole30': 'Whole30',
  'high-protein': 'High-protein', 'high protein': 'High-protein', 'protein-rich': 'High-protein',
};

const DIET_GOAL_MAP: { patterns: RegExp[]; goal: DietGoal }[] = [
  { patterns: [/lose\s*weight/i, /weight\s*loss/i, /slim/i, /lean/i, /cut\s+(down|weight)/i, /lose\s+\d+\s*kg/i, /diet/i], goal: 'lose_weight' },
  { patterns: [/maintain/i, /maintenance/i, /stay\s+healthy/i, /balanced/i], goal: 'maintain' },
  { patterns: [/build\s*muscle/i, /bulk/i, /gain\s*(weight|muscle)/i, /muscle/i], goal: 'build_muscle' },
];

const METHOD_ALIASES: Record<string, string> = {
  'bake': 'Baked', 'baked': 'Baked',
  'grill': 'Grilled', 'grilled': 'Grilled', 'bbq': 'Grilled', 'barbecue': 'Grilled',
  'roast': 'Roasted', 'roasted': 'Roasted',
  'fry': 'Fried', 'fried': 'Fried',
  'air fry': 'Air fryer', 'air fryer': 'Air fryer', 'airfryer': 'Air fryer',
  'slow cook': 'Slow-cooked', 'slow-cooked': 'Slow-cooked', 'slow cooker': 'Slow-cooked', 'crockpot': 'Slow-cooked',
  'steam': 'Steamed', 'steamed': 'Steamed',
  'stew': 'Stewed', 'stewed': 'Stewed',
  'braise': 'Braised', 'braised': 'Braised',
  'pan-fry': 'Pan-fried', 'pan fry': 'Pan-fried', 'pan-fried': 'Pan-fried',
  'boil': 'Boiled', 'boiled': 'Boiled',
  'pressure cook': 'Pressure cooker', 'pressure cooker': 'Pressure cooker', 'instant pot': 'Pressure cooker',
  'sous vide': 'Sous-vide', 'sous-vide': 'Sous-vide',
  'no-cook': 'Raw / No-cook', 'no cook': 'Raw / No-cook', 'raw': 'Raw / No-cook',
};

const MEAL_TYPE_MAP: Record<string, string> = {
  'breakfast': 'breakfast', 'brunch': 'breakfast',
  'lunch': 'lunch', 'lunches': 'lunch',
  'dinner': 'dinner', 'dinners': 'dinner', 'supper': 'dinner',
  'snack': 'snack', 'snacks': 'snack',
};

const DESCRIPTORS = [
  'creamy', 'spicy', 'healthy', 'quick', 'easy', 'light', 'hearty',
  'comfort', 'fresh', 'simple', 'fancy', 'elegant', 'warming', 'refreshing',
  'rich', 'savory', 'sweet', 'tangy', 'crispy', 'smoky', 'zesty',
  'wholesome', 'filling', 'nourishing', 'protein-packed',
];

// Build cuisine list from tagDefinitions Country category
const CUISINE_TAGS = TAG_CATEGORIES.find(c => c.name === 'Country')?.tags ?? [];

// Also handle some aliases
const CUISINE_ALIASES: Record<string, string> = {
  'south indian': 'Indian', 'north indian': 'Indian',
  'korean': 'International', 'hawaiian': 'American',
  'middle eastern': 'Lebanese', 'levantine': 'Lebanese',
  'asian': 'International', 'european': 'International',
  'african': 'International', 'latin': 'International',
};

// --- Parser ---

export function parseGoal(input: string): ParsedGoal {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  // 1. Goal type
  let goalType: GoalType = 'recipes'; // default
  for (const { type, patterns } of GOAL_TYPE_PATTERNS) {
    if (patterns.some(p => p.test(lower))) {
      goalType = type;
      break;
    }
  }

  // 2. Duration
  let durationDays: number | null = null;
  const durationMatch = lower.match(/(\d+)\s*(day|week|month)s?/);
  if (durationMatch) {
    const num = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    if (unit === 'week') durationDays = Math.min(num * 7, 28);
    else if (unit === 'month') durationDays = Math.min(num * 30, 28);
    else durationDays = Math.min(num, 28);
  }
  if (!durationDays && /this\s+week/i.test(lower)) durationDays = 7;
  if (!durationDays && /next\s+week/i.test(lower)) durationDays = 7;

  // 3. Dietary restrictions
  const dietaryRestrictions: string[] = [];
  for (const [keyword, restriction] of Object.entries(DIETARY_MAP)) {
    if (lower.includes(keyword) && !dietaryRestrictions.includes(restriction)) {
      dietaryRestrictions.push(restriction);
    }
  }

  // 4. Cuisine preferences
  const cuisinePreferences: string[] = [];
  // Check aliases first (multi-word)
  for (const [alias, cuisine] of Object.entries(CUISINE_ALIASES)) {
    if (lower.includes(alias) && !cuisinePreferences.includes(cuisine)) {
      cuisinePreferences.push(cuisine);
    }
  }
  // Check tag definitions
  for (const tag of CUISINE_TAGS) {
    if (tag === 'International') continue; // too generic to match
    if (lower.includes(tag.toLowerCase()) && !cuisinePreferences.includes(tag)) {
      cuisinePreferences.push(tag);
    }
  }

  // 5. Diet goals
  let dietGoal: DietGoal | null = null;
  for (const { patterns, goal } of DIET_GOAL_MAP) {
    if (patterns.some(p => p.test(lower))) {
      dietGoal = goal;
      break;
    }
  }

  // 6. Calorie targets
  let caloriesMin: number | null = null;
  let caloriesMax: number | null = null;
  const calRange = lower.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})\s*(cal|kcal|calories)/);
  if (calRange) {
    caloriesMin = parseInt(calRange[1], 10);
    caloriesMax = parseInt(calRange[2], 10);
  } else {
    const calUnder = lower.match(/under\s+(\d{3,4})\s*(cal|kcal|calories)/);
    if (calUnder) caloriesMax = parseInt(calUnder[1], 10);
    const calAbove = lower.match(/(?:over|above|at\s+least)\s+(\d{3,4})\s*(cal|kcal|calories)/);
    if (calAbove) caloriesMin = parseInt(calAbove[1], 10);
  }

  // 7. Cooking methods
  const preferredMethods: string[] = [];
  // Check multi-word aliases first
  const sortedAliases = Object.entries(METHOD_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, method] of sortedAliases) {
    if (lower.includes(alias) && !preferredMethods.includes(method)) {
      preferredMethods.push(method);
    }
  }

  // 8. Meal types
  const mealTypes: string[] = [];
  for (const [keyword, mealType] of Object.entries(MEAL_TYPE_MAP)) {
    if (lower.includes(keyword) && !mealTypes.includes(mealType)) {
      mealTypes.push(mealType);
    }
  }

  // 9. Descriptors
  const descriptors: string[] = [];
  for (const d of DESCRIPTORS) {
    if (lower.includes(d)) {
      descriptors.push(d);
    }
  }

  // 10. Build concept from remaining meaningful text
  let concept = raw;
  // Strip recognized structural phrases
  concept = concept.replace(/\b(i\s+want\s+to|i'd\s+like\s+to|i\s+need|give\s+me|help\s+me|make\s+me|create|make|plan)\b/gi, '');
  concept = concept.replace(/\b(a|an|the|some|my|for|with|of|and|in|to|that|is|are|would|like)\b/gi, '');
  concept = concept.replace(/\b(meal\s*plan|shopping\s*list|collection|recipes?|week(ly)?|day(s)?|month)\b/gi, '');
  concept = concept.replace(/\b\d+\s*(day|week|month)s?\b/gi, '');
  concept = concept.replace(/\b(lose|gain)\s+\d+\s*kg\b/gi, '');
  concept = concept.replace(/\s{2,}/g, ' ').trim();

  // If concept is empty or too short, build from extracted data
  if (concept.length < 3) {
    const parts: string[] = [];
    if (descriptors.length) parts.push(...descriptors);
    if (cuisinePreferences.length) parts.push(...cuisinePreferences);
    if (mealTypes.length) parts.push(...mealTypes.map(m => m + ' recipes'));
    if (dietaryRestrictions.length) parts.push(...dietaryRestrictions);
    concept = parts.join(' ').trim() || '';
  }

  return {
    goalType,
    durationDays,
    dietaryRestrictions,
    cuisinePreferences,
    dietGoal,
    caloriesMin,
    caloriesMax,
    preferredMethods,
    mealTypes,
    descriptors,
    concept,
    rawInput: raw,
  };
}

// --- Router ---

function getCurrentSeason(): 'Spring' | 'Summer' | 'Autumn' | 'Winter' {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
}

export interface GoalNavigation {
  path: string;
  state: Record<string, unknown>;
}

export function buildGoalNavigation(goal: ParsedGoal): GoalNavigation {
  switch (goal.goalType) {
    case 'meal_plan':
      return {
        path: '/ai-meal-plan',
        state: {
          goalPrefill: {
            durationDays: goal.durationDays ?? 7,
            preferences: {
              dietaryRestrictions: goal.dietaryRestrictions,
              cuisinePreferences: goal.cuisinePreferences,
              preferredMethods: goal.preferredMethods,
              caloriesMin: goal.caloriesMin ?? (goal.dietGoal === 'lose_weight' ? 1200 : null),
              caloriesMax: goal.caloriesMax ?? (goal.dietGoal === 'lose_weight' ? 1600 : goal.dietGoal === 'build_muscle' ? 2800 : null),
              includedMeals: goal.mealTypes.length > 0 ? goal.mealTypes : undefined,
              season: getCurrentSeason(),
            },
          },
        },
      };

    case 'recipes':
      return {
        path: '/recipes/ai-generate',
        state: {
          goalPrefill: {
            concept: goal.concept,
            mealTypes: goal.mealTypes,
            dietaryRestrictions: goal.dietaryRestrictions,
            cuisinePreferences: goal.cuisinePreferences,
            preferredMethods: goal.preferredMethods,
            caloriesMin: goal.caloriesMin,
            caloriesMax: goal.caloriesMax,
            specificTaste: goal.descriptors.join(', '),
          },
        },
      };

    case 'collection':
      return {
        path: '/collections',
        state: {
          goalPrefill: {
            createNew: true,
            suggestedName: goal.concept ||
              (goal.cuisinePreferences[0]
                ? `${goal.cuisinePreferences[0]} Recipes`
                : 'My Collection'),
            suggestedDescription: [
              ...goal.dietaryRestrictions,
              ...goal.cuisinePreferences,
              ...goal.descriptors,
            ].join(', '),
            // Pass recipe context for post-collection AI recipe generation
            recipeContext: {
              concept: goal.concept,
              dietaryRestrictions: goal.dietaryRestrictions,
              cuisinePreferences: goal.cuisinePreferences,
              preferredMethods: goal.preferredMethods,
              specificTaste: goal.descriptors.join(', '),
            },
          },
        },
      };

    case 'shopping':
      return {
        path: '/shopping-lists',
        state: {
          goalPrefill: { openBuilder: true },
        },
      };
  }
}

// --- Summary for preview ---

export function goalSummary(goal: ParsedGoal): string {
  const parts: string[] = [];

  const typeLabels: Record<GoalType, string> = {
    meal_plan: 'Meal Plan',
    recipes: 'Recipes',
    collection: 'Collection',
    shopping: 'Shopping List',
  };
  parts.push(typeLabels[goal.goalType]);

  if (goal.durationDays) parts.push(`${goal.durationDays} days`);
  if (goal.dietGoal) {
    const labels: Record<DietGoal, string> = {
      lose_weight: 'Weight loss',
      maintain: 'Maintain',
      build_muscle: 'Build muscle',
    };
    parts.push(labels[goal.dietGoal]);
  }
  parts.push(...goal.dietaryRestrictions);
  parts.push(...goal.cuisinePreferences);
  parts.push(...goal.descriptors);
  if (goal.mealTypes.length) parts.push(...goal.mealTypes);

  return parts.join(' > ');
}
