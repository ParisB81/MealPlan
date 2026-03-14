import { z } from 'zod';

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const addRecipeToCollectionSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
});

export const addRecipesToCollectionSchema = z.object({
  recipeIds: z.array(z.string().min(1)).min(1, 'At least one recipe is required'),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
