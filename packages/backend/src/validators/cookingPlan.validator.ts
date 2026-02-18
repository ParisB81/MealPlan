import { z } from 'zod';

export const cookingPlanStatusSchema = z.enum(['active', 'deleted']);

export const createCookingPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  mealPlanIds: z
    .array(z.string().min(1))
    .min(1, 'At least one meal plan is required')
    .max(4, 'Maximum 4 meal plans allowed'),
  cookDays: z
    .array(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in yyyy-MM-dd format')
    )
    .min(1, 'At least one cook day is required'),
});

export const updateCookingPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
});

export type CreateCookingPlanInput = z.infer<typeof createCookingPlanSchema>;
export type UpdateCookingPlanInput = z.infer<typeof updateCookingPlanSchema>;
export type CookingPlanStatus = z.infer<typeof cookingPlanStatusSchema>;
