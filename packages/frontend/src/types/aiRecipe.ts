import type { MealType } from './mealPlanPreference';

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

export interface GenerateRecipeSuggestionsInput {
  count: number;
  concept: string;
  baseRecipeId?: string;
  mealTypes?: MealType[];
  specificTaste?: string;
  ingredientLikes?: string;
  ingredientDislikes?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  cuisinePreferences?: string[];
  caloriesMin?: number | null;
  caloriesMax?: number | null;
  preferredMethods?: string[];
  maxPrepTime?: number | null;
  maxCookTime?: number | null;
  otherRemarks?: string;
}

export interface AIRecipeQueueEntry {
  tempKey: string;
  title: string;
  description?: string;
  cuisineTag?: string;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
  status: 'pending' | 'creating' | 'created' | 'skipped';
  createdRecipeId?: string;
}
