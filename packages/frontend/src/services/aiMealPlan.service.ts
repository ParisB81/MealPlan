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

export async function generateRecipeDetails(
  title: string,
  description?: string,
  servings?: number,
  cuisineHint?: string
): Promise<any> {
  const { data } = await api.post('/ai-meal-plan/generate-recipe-details', {
    title,
    description,
    servings,
    cuisineHint,
  });
  return data.data;
}
