import { z } from 'zod';

// AI recipe generation request schema
export const generateRecipeSuggestionsSchema = z.object({
  count: z.number().int().min(1).max(5).default(3),
  concept: z.string().min(1, 'Concept description is required').max(1000),
  baseRecipeId: z.string().optional(),
  mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).optional(),
  specificTaste: z.string().max(500).optional(),
  ingredientLikes: z.string().max(500).optional(),
  ingredientDislikes: z.string().max(500).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  caloriesMin: z.number().int().nonnegative().nullable().optional(),
  caloriesMax: z.number().int().nonnegative().nullable().optional(),
  preferredMethods: z.array(z.string()).optional(),
  maxPrepTime: z.number().int().nonnegative().nullable().optional(),
  maxCookTime: z.number().int().nonnegative().nullable().optional(),
  otherRemarks: z.string().max(1000).optional(),
});

export type GenerateRecipeSuggestionsInput = z.infer<typeof generateRecipeSuggestionsSchema>;
