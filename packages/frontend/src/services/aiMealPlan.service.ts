import { api } from './api';
import type { GeneratedPlan, SwapAlternative, PinnedMeal } from '../types/mealPlanPreference';

export async function generateMealPlan(
  preferenceId: string,
  startDate: string,
  endDate: string,
  pinnedMeals: PinnedMeal[] = []
): Promise<GeneratedPlan> {
  const { data } = await api.post('/ai-meal-plan/generate', {
    preferenceId,
    startDate,
    endDate,
    pinnedMeals,
  });
  return data.data;
}

export async function swapMeal(
  preferenceId: string,
  date: string,
  mealType: string,
  currentRecipeTitle: string,
  existingPlanContext?: string
): Promise<{ alternatives: SwapAlternative[] }> {
  const { data } = await api.post('/ai-meal-plan/swap', {
    preferenceId,
    date,
    mealType,
    currentRecipeTitle,
    existingPlanContext,
  });
  return data.data;
}

export interface GenerateRecipeDetailsParams {
  title: string;
  description?: string;
  servings?: number;
  cuisineHint?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  ingredientLikes?: string;
  ingredientDislikes?: string;
  caloriesMin?: number | null;
  caloriesMax?: number | null;
  maxPrepTime?: number | null;
  maxCookTime?: number | null;
  preferredMethods?: string[];
  specificTaste?: string;
  otherRemarks?: string;
}

export async function generateRecipeDetails(params: GenerateRecipeDetailsParams): Promise<any> {
  const { data } = await api.post('/ai-meal-plan/generate-recipe-details', params);
  return data.data;
}
