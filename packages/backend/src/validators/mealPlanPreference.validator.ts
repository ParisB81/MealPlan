import { z } from 'zod';

// Create preference profile schema
export const createPreferenceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  recipeSource: z.enum(['library_only', 'library_and_ai']).default('library_only'),
  dietaryRestrictions: z.array(z.string()).default([]),
  cuisinePreferences: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  ingredientLikes: z.string().default(''),
  ingredientDislikes: z.string().default(''),
  weekdayMaxPrep: z.number().int().nonnegative().nullable().optional(),
  weekdayMaxCook: z.number().int().nonnegative().nullable().optional(),
  weekendMaxPrep: z.number().int().nonnegative().nullable().optional(),
  weekendMaxCook: z.number().int().nonnegative().nullable().optional(),
  caloriesMin: z.number().int().nonnegative().nullable().optional(),
  caloriesMax: z.number().int().nonnegative().nullable().optional(),
  proteinPercent: z.number().int().min(0).max(100).nullable().optional(),
  carbsPercent: z.number().int().min(0).max(100).nullable().optional(),
  fatPercent: z.number().int().min(0).max(100).nullable().optional(),
  cookDaysPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  quickMealMaxMinutes: z.number().int().min(0).nullable().optional(),
  defaultServings: z.number().int().min(1).max(12).default(4),
  durationWeeks: z.number().int().min(1).max(4).default(1),
  durationDays: z.number().int().min(1).max(28).nullable().optional(),
  repeatWeekly: z.boolean().default(false),
  mealVariety: z.number().int().min(1).max(5).default(3),
  includedMeals: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).default(['breakfast', 'lunch', 'dinner']),
});

// Update preference schema (all fields optional)
export const updatePreferenceSchema = createPreferenceSchema.partial();

// Pinned meal schema (pre-assigned recipes in the plan)
const pinnedMealSchema = z.object({
  recipeId: z.string().min(1),
  recipeTitle: z.string().min(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  count: z.number().int().min(1).max(28),
});

// AI generation request schema
export const generateMealPlanSchema = z.object({
  preferenceId: z.string().min(1, 'Preference ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  pinnedMeals: z.array(pinnedMealSchema).default([]),
});

// Swap meal request schema
export const swapMealSchema = z.object({
  preferenceId: z.string().min(1),
  date: z.string().min(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  currentRecipeTitle: z.string().min(1),
  existingPlanContext: z.string().optional(),
});

// Generate full recipe details schema
export const generateRecipeDetailsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  servings: z.number().int().positive().default(4),
  cuisineHint: z.string().optional(),
});

export type CreatePreferenceInput = z.infer<typeof createPreferenceSchema>;
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
export type GenerateMealPlanInput = z.infer<typeof generateMealPlanSchema>;
export type SwapMealInput = z.infer<typeof swapMealSchema>;
export type GenerateRecipeDetailsInput = z.infer<typeof generateRecipeDetailsSchema>;
