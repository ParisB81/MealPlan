import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { checkRateLimit, getClient, getRecipeLibrarySummary } from './aiMealPlan.service.js';
import type { GenerateRecipeSuggestionsInput } from '../validators/aiRecipe.validator.js';

const prisma = new PrismaClient();

export interface AIRecipeSuggestion {
  title: string;
  description: string;
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
  cuisineTag?: string;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
}

export class AIRecipeService {
  /**
   * Generate N standalone recipe suggestions based on a concept and preferences.
   * Returns titles + descriptions + estimated nutrition (not full recipes).
   * Use the existing generateRecipeDetails() from aiMealPlan.service for full details.
   */
  async generateRecipeSuggestions(
    userId: string,
    input: GenerateRecipeSuggestionsInput
  ): Promise<AIRecipeSuggestion[]> {
    checkRateLimit(userId);

    // If baseRecipeId provided, fetch the base recipe for reference
    let baseRecipeContext = '';
    if (input.baseRecipeId) {
      const baseRecipe = await prisma.recipe.findUnique({
        where: { id: input.baseRecipeId },
        include: {
          ingredients: { include: { ingredient: true } },
          nutrition: true,
        },
      });
      if (baseRecipe) {
        const ingredientList = baseRecipe.ingredients
          .map(ri => `${ri.quantity} ${ri.unit} ${ri.ingredient.name}${ri.notes ? ` (${ri.notes})` : ''}`)
          .join(', ');
        baseRecipeContext = `\nBASE RECIPE FOR VARIATIONS:\nTitle: ${baseRecipe.title}\nDescription: ${baseRecipe.description || 'N/A'}\nTags: ${baseRecipe.tags}\nIngredients: ${ingredientList}\nServings: ${baseRecipe.servings}\nPrep: ${baseRecipe.prepTime || 0} min, Cook: ${baseRecipe.cookTime || 0} min\n${baseRecipe.nutrition ? `Nutrition per serving: ${baseRecipe.nutrition.calories || '?'} kcal, ${baseRecipe.nutrition.protein || '?'}g protein, ${baseRecipe.nutrition.carbs || '?'}g carbs, ${baseRecipe.nutrition.fat || '?'}g fat` : ''}\nGenerate creative VARIATIONS of this recipe — different ingredients, methods, or cuisine twists while maintaining the core concept.\n`;
      }
    }

    // Build preference context
    const prefParts: string[] = [];
    if (input.mealTypes?.length) prefParts.push(`Meal types: ${input.mealTypes.join(', ')}`);
    if (input.specificTaste) prefParts.push(`Specific taste target: ${input.specificTaste}`);
    if (input.ingredientLikes) prefParts.push(`Ingredient preferences (more of): ${input.ingredientLikes}`);
    if (input.ingredientDislikes) prefParts.push(`Ingredient preferences (less/none of): ${input.ingredientDislikes}`);
    if (input.dietaryRestrictions?.length) prefParts.push(`Dietary restrictions: ${input.dietaryRestrictions.join(', ')}`);
    if (input.allergies?.length) prefParts.push(`Allergies: ${input.allergies.join(', ')}`);
    if (input.cuisinePreferences?.length) prefParts.push(`Preferred cuisines: ${input.cuisinePreferences.join(', ')}`);
    if (input.caloriesMin || input.caloriesMax) {
      prefParts.push(`Per-recipe calorie range: ${input.caloriesMin || 'any'} — ${input.caloriesMax || 'any'} kcal`);
    }
    if (input.preferredMethods?.length) prefParts.push(`Preferred cooking methods: ${input.preferredMethods.join(', ')}`);
    if (input.maxPrepTime) prefParts.push(`Max prep time: ${input.maxPrepTime} minutes`);
    if (input.maxCookTime) prefParts.push(`Max cook time: ${input.maxCookTime} minutes`);
    if (input.otherRemarks) prefParts.push(`Additional remarks: ${input.otherRemarks}`);
    const preferencesText = prefParts.length > 0 ? prefParts.join('\n') : 'No specific preferences.';

    // Get recipe library for deduplication awareness
    const recipeLibrary = await getRecipeLibrarySummary();

    // Build explicit forbidden ingredients for suggestions too
    const suggestionForbidden: string[] = [];
    const restrictionSetSugg = new Set((input.dietaryRestrictions || []).map(r => r.toLowerCase()));
    const allergySetSugg = new Set((input.allergies || []).map(a => a.toLowerCase()));
    if (restrictionSetSugg.has('dairy-free') || allergySetSugg.has('dairy') || allergySetSugg.has('milk') || allergySetSugg.has('lactose')) {
      suggestionForbidden.push('milk, cheese, butter, cream, yogurt, sour cream, parmesan, mozzarella, feta, ricotta, ghee, whey');
    }
    if (restrictionSetSugg.has('gluten-free') || allergySetSugg.has('gluten') || allergySetSugg.has('wheat')) {
      suggestionForbidden.push('wheat flour, pasta, bread, couscous, soy sauce, barley, rye, breadcrumbs');
    }
    if (restrictionSetSugg.has('vegan')) {
      suggestionForbidden.push('all dairy, eggs, honey, meat, poultry, fish, seafood, gelatin');
    }
    if (restrictionSetSugg.has('vegetarian')) {
      suggestionForbidden.push('meat, poultry, fish, seafood, gelatin');
    }
    if (allergySetSugg.has('nuts') || allergySetSugg.has('tree nuts')) {
      suggestionForbidden.push('almonds, walnuts, cashews, pecans, pistachios, hazelnuts, pine nuts');
    }
    if (allergySetSugg.has('shellfish')) {
      suggestionForbidden.push('shrimp, crab, lobster, mussels, clams, scallops');
    }
    const forbiddenSuggestionText = suggestionForbidden.length > 0
      ? `\n- FORBIDDEN INGREDIENTS (must NOT appear in any suggested recipe): ${suggestionForbidden.join('; ')}\n- Do NOT suggest recipes that traditionally contain forbidden ingredients (e.g., do NOT suggest mac & cheese if dairy-free, do NOT suggest pasta carbonara if dairy-free)`
      : '';

    const systemPrompt = `You are a professional recipe creator. Generate exactly ${input.count} recipe suggestion(s) as valid JSON.

IMPORTANT RULES:
- Return ONLY valid JSON array, no explanations or markdown
- Each recipe must be a real, authentic dish — no made-up names
- Provide realistic estimated nutrition per serving
- Provide realistic prep and cook times
- CRITICAL: You MUST respect ALL dietary restrictions and allergies. Do NOT suggest any recipe that would require a forbidden ingredient, even as a minor component${forbiddenSuggestionText}
- Suggest recipes that are DIFFERENT from each other
- Avoid duplicating recipes already in the user's library (provided below for reference)
- Every suggestion MUST include: title, description, estimatedCalories, estimatedProtein, estimatedCarbs, estimatedFat, cuisineTag, estimatedPrepTime, estimatedCookTime`;

    const userPrompt = `CONCEPT: ${input.concept}
${baseRecipeContext}
PREFERENCES:
${preferencesText}

EXISTING RECIPE LIBRARY (avoid duplicates):
${recipeLibrary}

Generate exactly ${input.count} recipe suggestion(s). Return this exact JSON structure:
[
  {
    "title": "Recipe Title",
    "description": "Appetizing 1-2 sentence description",
    "estimatedCalories": 450,
    "estimatedProtein": 25,
    "estimatedCarbs": 45,
    "estimatedFat": 18,
    "cuisineTag": "Italian|Greek|etc or null",
    "estimatedPrepTime": 15,
    "estimatedCookTime": 30
  }
]`;

    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parse response
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AppError(500, 'AI returned no text response');
    }

    let jsonText = textBlock.text.trim();

    // Strip markdown code fences if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Try to extract JSON array if surrounded by text
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }

    let suggestions: AIRecipeSuggestion[];
    try {
      suggestions = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI recipe suggestions:', jsonText.substring(0, 500));
      throw new AppError(500, 'Failed to parse AI response. Please try again.');
    }

    if (!Array.isArray(suggestions)) {
      throw new AppError(500, 'AI returned invalid format (expected array). Please try again.');
    }

    return suggestions;
  }
}

export const aiRecipeService = new AIRecipeService();
