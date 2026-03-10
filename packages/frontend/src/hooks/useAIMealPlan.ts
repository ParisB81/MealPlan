import { useMutation } from '@tanstack/react-query';
import {
  generateMealPlan,
  swapMeal,
  generateRecipeDetails,
} from '../services/aiMealPlan.service';
import type { PinnedMeal } from '../types/mealPlanPreference';
import toast from 'react-hot-toast';

export function useGenerateMealPlan() {
  return useMutation({
    mutationFn: ({ preferenceId, startDate, endDate, pinnedMeals }: {
      preferenceId: string;
      startDate: string;
      endDate: string;
      pinnedMeals?: PinnedMeal[];
    }) => generateMealPlan(preferenceId, startDate, endDate, pinnedMeals),
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to generate meal plan';
      toast.error(message);
    },
  });
}

export function useSwapMeal() {
  return useMutation({
    mutationFn: ({ preferenceId, date, mealType, currentRecipeTitle, existingPlanContext }: {
      preferenceId: string;
      date: string;
      mealType: string;
      currentRecipeTitle: string;
      existingPlanContext?: string;
    }) => swapMeal(preferenceId, date, mealType, currentRecipeTitle, existingPlanContext),
    onError: () => {
      toast.error('Failed to get swap alternatives');
    },
  });
}

export function useGenerateRecipeDetails() {
  return useMutation({
    mutationFn: ({ title, description, servings, cuisineHint }: {
      title: string;
      description?: string;
      servings?: number;
      cuisineHint?: string;
    }) => generateRecipeDetails(title, description, servings, cuisineHint),
    onError: () => {
      toast.error('Failed to generate recipe details');
    },
  });
}
