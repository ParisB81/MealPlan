import { z } from 'zod';

// Meal type enum
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

// Meal plan status enum
export const mealPlanStatusSchema = z.enum(['active', 'completed', 'deleted']);

// Create meal plan schema
export const createMealPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
});

// Update meal plan schema
export const updateMealPlanSchema = createMealPlanSchema.partial().extend({
  status: mealPlanStatusSchema.optional(),
});

// Update meal plan status schema
export const updateMealPlanStatusSchema = z.object({
  status: mealPlanStatusSchema,
});

// Add recipe to meal plan schema
export const addRecipeToMealPlanSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
  date: z.string().datetime().or(z.date()),
  mealType: mealTypeSchema,
  servings: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

// Update meal plan recipe schema
export const updateMealPlanRecipeSchema = z.object({
  date: z.string().datetime().or(z.date()).optional(),
  mealType: mealTypeSchema.optional(),
  servings: z.number().int().positive().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional(),
});

export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;
export type AddRecipeToMealPlanInput = z.infer<typeof addRecipeToMealPlanSchema>;
export type UpdateMealPlanRecipeInput = z.infer<typeof updateMealPlanRecipeSchema>;
export type UpdateMealPlanStatusInput = z.infer<typeof updateMealPlanStatusSchema>;
export type MealType = z.infer<typeof mealTypeSchema>;
export type MealPlanStatus = z.infer<typeof mealPlanStatusSchema>;
