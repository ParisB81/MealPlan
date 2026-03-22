import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { VALID_UNITS } from '../utils/validUnits.js';

const prisma = new PrismaClient();

// Rate limiting: max 100 generations per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_GENERATIONS_PER_HOUR = 100;

export function checkRateLimit(userId: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600000 });
    return;
  }

  if (entry.count >= MAX_GENERATIONS_PER_HOUR) {
    throw new AppError(429, 'Rate limit exceeded. Maximum 10 AI generations per hour.');
  }

  entry.count++;
}

export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AppError(500, 'ANTHROPIC_API_KEY is not configured. Set it in .env to enable AI meal plan generation.');
  }
  return new Anthropic({ apiKey });
}

// Fetch condensed recipe library for AI context
export async function getRecipeLibrarySummary(collectionId?: string | null): Promise<string> {
  let recipeIds: string[] | undefined;

  // If collection-scoped, fetch only recipes in that collection
  if (collectionId) {
    const items = await prisma.recipeCollectionItem.findMany({
      where: { collectionId },
      select: { recipeId: true },
    });
    recipeIds = items.map(i => i.recipeId);
    if (recipeIds.length === 0) {
      return '(empty collection — no recipes available)';
    }
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      status: 'active',
      ...(recipeIds ? { id: { in: recipeIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      tags: true,
      prepTime: true,
      cookTime: true,
      servings: true,
    },
    orderBy: { title: 'asc' },
  });

  return recipes.map(r =>
    `{id:"${r.id}",title:"${r.title}",tags:"${r.tags}",prep:${r.prepTime || 0},cook:${r.cookTime || 0},servings:${r.servings}}`
  ).join('\n');
}

// Parse preference from DB format to prompt-friendly format
function formatPreferenceForPrompt(pref: any): string {
  const parts: string[] = [];

  const dietary = JSON.parse(pref.dietaryRestrictions || '[]');
  if (dietary.length) parts.push(`Dietary restrictions: ${dietary.join(', ')}`);

  const cuisines = JSON.parse(pref.cuisinePreferences || '[]');
  if (cuisines.length) parts.push(`Preferred cuisines: ${cuisines.join(', ')}`);

  const allergies = JSON.parse(pref.allergies || '[]');
  if (allergies.length) parts.push(`Allergies: ${allergies.join(', ')}`);

  if (pref.ingredientLikes) parts.push(`Ingredient preferences (more of): ${pref.ingredientLikes}`);
  if (pref.ingredientDislikes) parts.push(`Ingredient preferences (less/none of): ${pref.ingredientDislikes}`);

  if (pref.weekdayMaxPrep || pref.weekdayMaxCook) {
    parts.push(`Weekday cooking limits: max ${pref.weekdayMaxPrep || 'no limit'} min prep, max ${pref.weekdayMaxCook || 'no limit'} min cook`);
  }
  if (pref.weekendMaxPrep || pref.weekendMaxCook) {
    parts.push(`Weekend cooking limits: max ${pref.weekendMaxPrep || 'no limit'} min prep, max ${pref.weekendMaxCook || 'no limit'} min cook`);
  }

  // Preferred cooking methods
  const methods = JSON.parse(pref.preferredMethods || '[]');
  if (methods.length) parts.push(`Preferred cooking methods: ${methods.join(', ')}. Favor recipes using these methods.`);

  // Seasonal context
  if (pref.season) {
    const SEASONAL_INGREDIENTS: Record<string, { prioritize: string[]; avoid: string[] }> = {
      Spring: {
        prioritize: ['artichokes', 'peas', 'fava beans', 'fresh dill', 'spring onions', 'asparagus', 'strawberries', 'lettuce', 'radishes', 'lamb', 'lemons', 'oranges'],
        avoid: ['watermelon', 'figs', 'pomegranates', 'chestnuts', 'pumpkin'],
      },
      Summer: {
        prioritize: ['tomatoes', 'zucchini', 'eggplant', 'peppers', 'watermelon', 'peaches', 'figs', 'green beans', 'cucumbers', 'corn', 'basil'],
        avoid: ['butternut squash', 'chestnuts', 'pomegranates'],
      },
      Autumn: {
        prioritize: ['mushrooms', 'pumpkin', 'chestnuts', 'pomegranates', 'grapes', 'quince', 'cauliflower', 'sweet potato', 'pears', 'apples'],
        avoid: ['strawberries', 'watermelon', 'peaches', 'fresh basil'],
      },
      Winter: {
        prioritize: ['cabbage', 'leeks', 'citrus fruits', 'root vegetables', 'dried legumes', 'kale', 'Brussels sprouts', 'clementines', 'oranges'],
        avoid: ['tomatoes', 'zucchini', 'eggplant', 'strawberries', 'watermelon'],
      },
    };
    const seasonData = SEASONAL_INGREDIENTS[pref.season];
    if (seasonData) {
      parts.push(`SEASONAL CONTEXT: This plan is for ${pref.season} in Greece.`);
      parts.push(`Prioritize these seasonal ingredients: ${seasonData.prioritize.join(', ')}.`);
      parts.push(`Avoid out-of-season ingredients where possible: ${seasonData.avoid.join(', ')}.`);
    }
  }

  // Cooking-free days (specific dates) — takes priority over legacy cookDaysPerWeek
  const cookingFreeDays = (pref.cookingFreeDays || '').split(',').filter((d: string) => d.trim());
  if (cookingFreeDays.length > 0) {
    parts.push(`COOKING-FREE DAYS: ${cookingFreeDays.join(', ')}.`);
    parts.push(`On these specific dates, plan ONLY quick meals (leftovers from previous cook days, salads, no-cook options, sandwiches, yogurt bowls, overnight oats, etc.).`);
    if (pref.quickMealMaxMinutes) {
      parts.push(`Cooking-free-day meals must require ${pref.quickMealMaxMinutes} minutes or less total prep+cook time.`);
    }
    parts.push(`On cooking days (all other dates), recipes should produce enough servings for leftovers on subsequent cooking-free days.`);
  } else if (pref.cookDaysPerWeek && pref.cookDaysPerWeek < 7) {
    // Legacy fallback: cookDaysPerWeek
    parts.push(`Cooking schedule: User cooks only ${pref.cookDaysPerWeek} days per week.`);
    parts.push(`On non-cooking days, plan quick meals (leftovers from cook days, salads, no-cook options, sandwiches, yogurt bowls, overnight oats, etc.).`);
    if (pref.quickMealMaxMinutes) {
      parts.push(`Non-cook-day meals must require ${pref.quickMealMaxMinutes} minutes or less total prep+cook time.`);
    }
    parts.push(`Cook-day recipes should produce enough servings for leftovers on subsequent non-cook days. The same recipe SHOULD appear on consecutive days to represent "cook once, eat leftovers".`);
  }

  if (pref.defaultServings && pref.defaultServings !== 4) {
    parts.push(`Default servings: ${pref.defaultServings} (plan portions accordingly)`);
  }

  if (pref.numberOfPersons && pref.numberOfPersons > 1) {
    parts.push(`Number of persons eating: ${pref.numberOfPersons}. Each recipe should produce enough servings for all ${pref.numberOfPersons} people.`);
  }

  return parts.join('\n');
}

function formatNutritionForPrompt(pref: any): string {
  const parts: string[] = [];
  if (pref.caloriesMin || pref.caloriesMax) {
    parts.push(`Daily calories: ${pref.caloriesMin || '?'}–${pref.caloriesMax || '?'} kcal`);
  }
  if (pref.proteinPercent) parts.push(`Protein: ~${pref.proteinPercent}% of calories`);
  if (pref.carbsPercent) parts.push(`Carbs: ~${pref.carbsPercent}% of calories`);
  if (pref.fatPercent) parts.push(`Fat: ~${pref.fatPercent}% of calories`);
  return parts.length ? parts.join('\n') : 'No specific nutritional targets.';
}

export interface GeneratedMeal {
  date: string;
  mealType: string;
  existingRecipeId?: string;
  existingRecipeTitle?: string;
  newRecipeTitle?: string;
  newRecipeDescription?: string;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
  cuisineTag?: string;
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

export interface GeneratedPlan {
  days: { date: string; meals: GeneratedMeal[] }[];
  description: string;
  stats: {
    uniqueBreakfasts: number;
    uniqueLunches: number;
    uniqueDinners: number;
    uniqueSnacks: number;
  };
}

export class AIMealPlanService {
  // Generate a meal plan from preferences
  async generatePlan(userId: string, preferenceId: string, startDate: string, endDate: string, pinnedMeals: { recipeId: string; recipeTitle: string; mealType: string; count: number }[] = []): Promise<GeneratedPlan> {
    checkRateLimit(userId);

    const pref = await prisma.mealPlanPreference.findUnique({ where: { id: preferenceId } });
    if (!pref) throw new AppError(404, 'Preference profile not found');

    const includedMeals = pref.includedMeals.split(',');
    const collectionId = pref.recipeSource === 'collection_only' ? pref.sourceCollectionId : null;
    const recipeLibrary = await getRecipeLibrarySummary(collectionId);
    const prefText = formatPreferenceForPrompt(pref);
    const nutritionText = formatNutritionForPrompt(pref);

    const isWeekend = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getDay() === 0 || d.getDay() === 6;
    };

    // Build date list
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const sourceMode = pref.recipeSource === 'library_and_ai'
      ? 'You may use existing recipes from the library OR suggest new dishes based on real culinary traditions from around the world (e.g., cassoulet, borscht, shakshuka, pad thai, moussaka). For new dishes, provide title, brief description, estimated prep/cook time, and a cuisine tag.'
      : pref.recipeSource === 'collection_only'
      ? 'You must ONLY use existing recipes from the provided collection. Reference them by their exact ID and title. Do NOT suggest any new recipes.'
      : 'You must ONLY use existing recipes from the library. Reference them by their exact ID and title.';

    const varietyDescription = [
      '', // unused index 0
      'Minimal variety: repeat the same few dishes across the week.',
      'Low variety: some repetition is fine, use 3-5 different dishes per meal type.',
      'Moderate variety: balance between new dishes and some repeats. About 5-7 different dishes per meal type.',
      'High variety: prefer different dishes each day with minimal repetition.',
      'Maximum variety: every meal should be a different dish if possible. No repeats.'
    ][pref.mealVariety];

    // Cooking-free days rule: specific dates take priority over legacy cookDaysPerWeek
    const cookingFreeDaysList = (pref.cookingFreeDays || '').split(',').filter((d: string) => d.trim());
    let batchCookingRule = '';
    if (cookingFreeDaysList.length > 0) {
      batchCookingRule = `- COOKING-FREE DAYS: The following dates are cooking-free: ${cookingFreeDaysList.join(', ')}. On these dates, assign ONLY quick no-cook/leftover meals (under ${pref.quickMealMaxMinutes || 10} minutes). On all other dates, assign full recipes that can produce multiple servings for leftovers. The same dish MAY appear on consecutive days (leftovers from a cook day).`;
    } else if (pref.cookDaysPerWeek && pref.cookDaysPerWeek < 7) {
      batchCookingRule = `- BATCH COOKING: The user cooks only ${pref.cookDaysPerWeek} days per week. On cook days, assign recipes that can produce multiple servings. On non-cook days, reuse the SAME recipe from a recent cook day (representing leftovers) or assign quick no-cook meals (under ${pref.quickMealMaxMinutes || 10} minutes). It is EXPECTED and DESIRED for the same dish to appear on consecutive days.`;
    }

    const systemPrompt = `You are a professional meal planning assistant. Generate a structured meal plan as valid JSON.

IMPORTANT RULES:
- Return ONLY valid JSON, no explanations or markdown
- For existing recipes, use the EXACT id and title from the library
- For new recipes (if allowed), provide realistic prep/cook times based on actual culinary knowledge
- Respect ALL dietary restrictions and allergies absolutely
- Respect cooking time limits: check if each date is a weekday or weekend and apply the appropriate limits
- Distribute meals to meet nutritional targets approximately across the day
- ${varietyDescription}
${batchCookingRule}
${pref.repeatWeekly ? '- This is a repeat-weekly plan: design 7 unique days, then repeat them for the duration.' : '- Design unique meals for each day.'}`;

    // Format pinned meals constraint for the AI
    const pinnedMealsText = pinnedMeals.length > 0
      ? `\nPRE-ASSIGNED MEALS (MANDATORY — these must be included exactly as specified):\n${pinnedMeals.map(pm =>
          `- Recipe "${pm.recipeTitle}" (ID: ${pm.recipeId}) must appear as ${pm.mealType} exactly ${pm.count} time(s). Use the EXACT recipe ID and title. Distribute these across different days.`
        ).join('\n')}\nYou must include ALL pre-assigned meals in the plan. Fill the remaining meal slots with other dishes based on preferences.\n`
      : '';

    const userPrompt = `Generate a meal plan for these dates: ${dates.join(', ')}
Meal types to include: ${includedMeals.join(', ')}

PREFERENCES:
${prefText}

NUTRITIONAL TARGETS:
${nutritionText}

RECIPE SOURCE MODE: ${pref.recipeSource}
${sourceMode}
${pinnedMealsText}
EXISTING RECIPE LIBRARY:
${recipeLibrary}

Weekend dates (for cooking time limits): ${dates.filter(d => isWeekend(d)).join(', ') || 'none'}

IMPORTANT: Every meal MUST include estimated per-serving nutrition (estimatedCalories, estimatedProtein, estimatedCarbs, estimatedFat). For existing library recipes, estimate based on the dish name. For new AI-suggested recipes, estimate based on typical nutritional values for that type of dish. These estimates help the user evaluate the plan before committing.

Return this exact JSON structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "existingRecipeId": "id from library or null",
          "existingRecipeTitle": "title or null",
          "newRecipeTitle": "title for AI dish or null",
          "newRecipeDescription": "brief description or null",
          "estimatedPrepTime": 15,
          "estimatedCookTime": 30,
          "cuisineTag": "Italian|Greek|etc or null",
          "estimatedCalories": 450,
          "estimatedProtein": 25,
          "estimatedCarbs": 45,
          "estimatedFat": 18
        }
      ]
    }
  ],
  "description": "A descriptive name for this meal plan based on the preferences",
  "stats": {
    "uniqueBreakfasts": 0,
    "uniqueLunches": 0,
    "uniqueDinners": 0,
    "uniqueSnacks": 0
  }
}`;

    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Check if response was truncated
    if (response.stop_reason === 'max_tokens') {
      console.warn('AI response was truncated (hit max_tokens). Plan may be incomplete.');
    }

    // Extract text content from response
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AppError(500, 'AI returned unexpected response format');
    }

    // Parse JSON from response — handle markdown fences and surrounding text
    let jsonStr = textBlock.text.trim();

    // Strip markdown code fences
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    }

    // If there's still non-JSON text, try to extract the JSON object
    if (!jsonStr.startsWith('{')) {
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
    }

    let plan: GeneratedPlan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON.');
      console.error('Stop reason:', response.stop_reason);
      console.error('Response length:', textBlock.text.length);
      console.error('First 500 chars:', textBlock.text.substring(0, 500));
      console.error('Last 500 chars:', textBlock.text.substring(textBlock.text.length - 500));
      throw new AppError(500, 'AI returned invalid JSON. Please try regenerating.');
    }

    // Validate referenced recipe IDs and match "new" recipes against existing library
    const existingRecipes = await prisma.recipe.findMany({
      where: { status: 'active' },
      select: { id: true, title: true },
    });
    const existingIds = new Set(existingRecipes.map(r => r.id));

    // Build title lookup maps for fuzzy matching
    const titleToRecipe = new Map<string, { id: string; title: string }>();
    const normalizedTitleToRecipe = new Map<string, { id: string; title: string }>();
    for (const r of existingRecipes) {
      titleToRecipe.set(r.title.toLowerCase(), r);
      // Normalize: strip common prefixes/qualifiers for broader matching
      const normalized = r.title.toLowerCase()
        .replace(/^(classic|traditional|easy|simple|quick|homemade|greek|italian|french|american)\s+/i, '')
        .replace(/\s+(recipe|dish|bowl|plate)$/i, '')
        .trim();
      normalizedTitleToRecipe.set(normalized, r);
    }

    for (const day of plan.days) {
      for (const meal of day.meals) {
        // Step 1: Fix hallucinated IDs
        if (meal.existingRecipeId && !existingIds.has(meal.existingRecipeId)) {
          console.warn(`AI referenced non-existent recipe ID: ${meal.existingRecipeId}, converting to new recipe`);
          meal.newRecipeTitle = meal.existingRecipeTitle || meal.existingRecipeId;
          meal.newRecipeDescription = 'Recipe suggested by AI';
          meal.existingRecipeId = undefined;
          meal.existingRecipeTitle = undefined;
        }

        // Step 2: Check if "new" recipes actually match existing library recipes
        if (meal.newRecipeTitle && !meal.existingRecipeId) {
          const newLower = meal.newRecipeTitle.toLowerCase();
          const newNormalized = newLower
            .replace(/^(classic|traditional|easy|simple|quick|homemade|greek|italian|french|american)\s+/i, '')
            .replace(/\s+(recipe|dish|bowl|plate)$/i, '')
            .trim();

          // Try exact match, then normalized match, then substring containment
          let match = titleToRecipe.get(newLower)
            || normalizedTitleToRecipe.get(newNormalized);

          if (!match) {
            // Check if any existing title contains the new title or vice versa
            for (const r of existingRecipes) {
              const existLower = r.title.toLowerCase();
              if (existLower.includes(newLower) || newLower.includes(existLower)) {
                match = r;
                break;
              }
            }
          }

          if (match) {
            console.log(`Matched "new" recipe "${meal.newRecipeTitle}" to existing "${match.title}" (${match.id})`);
            meal.existingRecipeId = match.id;
            meal.existingRecipeTitle = match.title;
            meal.newRecipeTitle = undefined;
            meal.newRecipeDescription = undefined;
          }
        }
      }
    }

    return plan;
  }

  // Get alternative meals for swapping
  async swapMeal(
    userId: string,
    preferenceId: string,
    date: string,
    mealType: string,
    currentRecipeTitle: string,
    existingPlanContext?: string
  ) {
    checkRateLimit(userId);

    const pref = await prisma.mealPlanPreference.findUnique({ where: { id: preferenceId } });
    if (!pref) throw new AppError(404, 'Preference profile not found');

    const collectionId = pref.recipeSource === 'collection_only' ? pref.sourceCollectionId : null;
    const recipeLibrary = await getRecipeLibrarySummary(collectionId);
    const prefText = formatPreferenceForPrompt(pref);
    const sourceMode = pref.recipeSource === 'library_and_ai'
      ? 'You may suggest existing recipes OR new dishes based on real culinary traditions.'
      : pref.recipeSource === 'collection_only'
      ? 'You must ONLY suggest existing recipes from the provided collection.'
      : 'You must ONLY suggest existing recipes from the library.';

    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
    const timeLimit = isWeekend
      ? `Weekend limits: max ${pref.weekendMaxPrep || 'no'} min prep, max ${pref.weekendMaxCook || 'no'} min cook`
      : `Weekday limits: max ${pref.weekdayMaxPrep || 'no'} min prep, max ${pref.weekdayMaxCook || 'no'} min cook`;

    const userPrompt = `I need 3 alternative ${mealType} options for ${date} to replace "${currentRecipeTitle}".

PREFERENCES:
${prefText}

${timeLimit}

${sourceMode}

${existingPlanContext ? `Context of existing plan (avoid duplicating these):\n${existingPlanContext}` : ''}

EXISTING RECIPE LIBRARY:
${recipeLibrary}

Each alternative MUST include estimated per-serving nutrition.

Return ONLY valid JSON:
{
  "alternatives": [
    {
      "existingRecipeId": "id or null",
      "existingRecipeTitle": "title or null",
      "newRecipeTitle": "title or null",
      "newRecipeDescription": "description or null",
      "estimatedPrepTime": 15,
      "estimatedCookTime": 30,
      "cuisineTag": "Italian or null",
      "estimatedCalories": 450,
      "estimatedProtein": 25,
      "estimatedCarbs": 45,
      "estimatedFat": 18
    }
  ]
}`;

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: 'You are a meal planning assistant. Return only valid JSON.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AppError(500, 'AI returned unexpected response format');
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      throw new AppError(500, 'AI returned invalid JSON for swap alternatives.');
    }
  }

  // Generate full recipe details for an AI-suggested dish
  async generateRecipeDetails(
    userId: string,
    title: string,
    description?: string,
    servings: number = 4,
    cuisineHint?: string
  ) {
    checkRateLimit(userId);

    const validUnitsList = VALID_UNITS.join(', ');

    // Fetch all ingredient names from DB so AI only uses known ingredients
    const dbIngredients = await prisma.ingredient.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const ingredientList = dbIngredients.map(i => i.name).join(', ');

    const userPrompt = `Create a complete, detailed recipe for: "${title}"
${description ? `Description: ${description}` : ''}
Target servings: ${servings}
${cuisineHint ? `Cuisine: ${cuisineHint}` : ''}

IMPORTANT RULES:
- INGREDIENT NAMES MUST come from this approved ingredient database. Use ONLY ingredients from this list (use the exact names as shown):
${ingredientList}
- If a recipe would typically use an ingredient not in the list, substitute with the closest available ingredient from the list or omit it
- All ingredient names must be lowercase
- All units must be from this exact list: ${validUnitsList}
- Quantities must be positive numbers with at most 2 decimal places
- Instructions should be clear, numbered steps as separate strings
- Provide realistic nutritional info per serving
- Tags should include relevant categories: meal type, base ingredient, cuisine, cooking method
- Always include "AI" as one of the tags
- This must be based on real culinary knowledge — authentic ingredients and techniques

Return ONLY valid JSON matching this exact schema:
{
  "title": "${title}",
  "description": "Appetizing description",
  "servings": ${servings},
  "prepTime": 15,
  "cookTime": 30,
  "instructions": ["Step 1...", "Step 2..."],
  "tags": ["AI", "Main Dishes", "Italian", "Pasta"],
  "ingredients": [
    {"name": "ingredient name lowercase", "quantity": 1.5, "unit": "cup", "notes": "optional prep note"}
  ],
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 45,
    "fat": 18,
    "fiber": 5,
    "sugar": 8,
    "sodium": 600
  }
}`;

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are a professional recipe writer. Return only valid JSON. Create authentic recipes based on real culinary traditions with accurate ingredients, proportions, and techniques. You MUST only use ingredients from the approved ingredient database provided in the prompt.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AppError(500, 'AI returned unexpected response format');
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    }

    // If there's still non-JSON text, try to extract the JSON object
    if (!jsonStr.startsWith('{')) {
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
    }

    try {
      const recipe = JSON.parse(jsonStr);

      // Ensure ingredient names are lowercase
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.map((ing: any) => ({
          ...ing,
          name: ing.name.toLowerCase().trim(),
        }));
      }

      // Ensure "AI" tag is always present
      if (!recipe.tags) recipe.tags = [];
      if (!recipe.tags.includes('AI')) {
        recipe.tags.unshift('AI');
      }

      return recipe;
    } catch {
      console.error('Failed to parse AI recipe details.');
      console.error('Response length:', textBlock.text.length);
      console.error('First 500 chars:', textBlock.text.substring(0, 500));
      throw new AppError(500, 'AI returned invalid JSON for recipe details.');
    }
  }
}

export const aiMealPlanService = new AIMealPlanService();
