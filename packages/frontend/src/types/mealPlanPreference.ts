export type RecipeSource = 'library_only' | 'library_and_ai' | 'collection_only';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanPreference {
  id: string;
  userId: string;
  name: string;
  recipeSource: RecipeSource;
  sourceCollectionId: string | null;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  allergies: string[];
  ingredientLikes: string;
  ingredientDislikes: string;
  weekdayMaxPrep: number | null;
  weekdayMaxCook: number | null;
  weekendMaxPrep: number | null;
  weekendMaxCook: number | null;
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinPercent: number | null;
  carbsPercent: number | null;
  fatPercent: number | null;
  cookDaysPerWeek: number | null;
  cookingFreeDays: string;
  quickMealMaxMinutes: number | null;
  defaultServings: number;
  durationWeeks: number;
  durationDays: number | null;
  repeatWeekly: boolean;
  mealVariety: number;
  includedMeals: MealType[];
  preferredMethods: string[];
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreferenceInput {
  name: string;
  recipeSource?: RecipeSource;
  sourceCollectionId?: string | null;
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  allergies?: string[];
  ingredientLikes?: string;
  ingredientDislikes?: string;
  weekdayMaxPrep?: number | null;
  weekdayMaxCook?: number | null;
  weekendMaxPrep?: number | null;
  weekendMaxCook?: number | null;
  caloriesMin?: number | null;
  caloriesMax?: number | null;
  proteinPercent?: number | null;
  carbsPercent?: number | null;
  fatPercent?: number | null;
  cookDaysPerWeek?: number | null;
  cookingFreeDays?: string;
  quickMealMaxMinutes?: number | null;
  defaultServings?: number;
  durationWeeks?: number;
  durationDays?: number | null;
  repeatWeekly?: boolean;
  mealVariety?: number;
  includedMeals?: MealType[];
  preferredMethods?: string[];
  season?: 'Spring' | 'Summer' | 'Autumn' | 'Winter' | null;
}

export type UpdatePreferenceInput = Partial<CreatePreferenceInput>;

// AI Generation types
export interface GeneratedMeal {
  mealType: MealType;
  existingRecipeId?: string | null;
  existingRecipeTitle?: string | null;
  newRecipeTitle?: string | null;
  newRecipeDescription?: string | null;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
  cuisineTag?: string | null;
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

export interface GeneratedDay {
  date: string;
  meals: GeneratedMeal[];
}

export interface GeneratedPlan {
  days: GeneratedDay[];
  description: string;
  stats: {
    uniqueBreakfasts: number;
    uniqueLunches: number;
    uniqueDinners: number;
    uniqueSnacks: number;
  };
}

export interface SwapAlternative {
  existingRecipeId?: string | null;
  existingRecipeTitle?: string | null;
  newRecipeTitle?: string | null;
  newRecipeDescription?: string | null;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
  cuisineTag?: string | null;
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

export interface AIRecipeEntry {
  tempKey: string; // unique key for tracking in queue
  title: string;
  description?: string;
  cuisineTag?: string;
  estimatedPrepTime?: number;
  estimatedCookTime?: number;
  mealTypes?: MealType[]; // which meal slots this recipe fills (for alternative matching)
  status: 'pending' | 'creating' | 'created' | 'skipped';
  createdRecipeId?: string;
}

// Pre-assigned meal: user wants a specific recipe to appear N times for a given meal type
export interface PinnedMeal {
  recipeId: string;
  recipeTitle: string;
  mealType: MealType;
  count: number;
}
