import { z } from 'zod';
import { isValidUnit } from '../utils/validUnits';

// Ingredient input schema
export const ingredientInputSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive').refine(
    (val) => {
      // Check if the number has more than 2 decimal places
      // Round to 2 decimals and compare with original
      const rounded = Math.round(val * 100) / 100;
      return Math.abs(val - rounded) < 0.001; // Allow tiny floating point errors
    },
    { message: 'Quantity must have at most 2 decimal places' }
  ),
  unit: z.string().min(1, 'Unit is required').refine(
    (val) => isValidUnit(val),
    { message: 'Invalid unit of measurement. Please use a valid unit (e.g., g, kg, ml, cup, piece).' }
  ),
  notes: z.string().optional(),
});

// Nutrition schema
export const nutritionSchema = z.object({
  calories: z.number().nonnegative().optional().nullable(),
  protein: z.number().nonnegative().optional().nullable(),
  carbs: z.number().nonnegative().optional().nullable(),
  fat: z.number().nonnegative().optional().nullable(),
  fiber: z.number().nonnegative().optional().nullable(),
  sugar: z.number().nonnegative().optional().nullable(),
  sodium: z.number().nonnegative().optional().nullable(),
}).optional();

// Create recipe schema
export const createRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  servings: z.number().int().positive().default(4),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  sourceUrl: z.string().url().optional().or(z.literal('')), // Original recipe URL
  instructions: z.array(z.string().min(1)).min(1, 'At least one instruction is required'),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(ingredientInputSchema).min(1, 'At least one ingredient is required'),
  nutrition: nutritionSchema.optional(),
});

// Update recipe schema (all fields optional except id)
export const updateRecipeSchema = createRecipeSchema.partial();

// Query params for listing recipes
export const listRecipesQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  status: z.string().optional(), // "active" or "deleted"
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).default('0'),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type IngredientInput = z.infer<typeof ingredientInputSchema>;
export type NutritionInput = z.infer<typeof nutritionSchema>;
