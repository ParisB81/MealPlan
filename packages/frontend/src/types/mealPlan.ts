import type { Recipe } from './recipe';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealPlanStatus = 'active' | 'completed' | 'deleted';

export interface MealPlanRecipe {
  id: string;
  mealPlanId: string;
  recipeId: string;
  date: string;
  mealType: MealType;
  servings: number;
  notes?: string;
  completed: boolean;
  recipe: Recipe;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: MealPlanStatus;
  createdAt: string;
  updatedAt: string;
  meals: MealPlanRecipe[];
}

export interface CreateMealPlanInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateMealPlanInput extends Partial<CreateMealPlanInput> {
  status?: MealPlanStatus;
}

export interface UpdateMealPlanStatusInput {
  status: MealPlanStatus;
}

export interface AddRecipeToMealPlanInput {
  recipeId: string;
  date: string;
  mealType: MealType;
  servings: number;
  notes?: string;
}

export interface UpdateMealPlanRecipeInput {
  date?: string;
  mealType?: MealType;
  servings?: number;
  notes?: string;
  completed?: boolean;
}

export interface MealPlanNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCount: number;
}

export interface CopyMealData {
  recipeId: string;
  mealType: MealType;
  servings: number;
  notes?: string;
}

export interface CopyState {
  sourceDate: string;
  meals: CopyMealData[];
  label: string;
}
