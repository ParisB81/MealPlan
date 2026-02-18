import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealPlansService } from '../services/mealPlans.service';
import type {
  CreateMealPlanInput,
  UpdateMealPlanInput,
  AddRecipeToMealPlanInput,
  UpdateMealPlanRecipeInput,
  UpdateMealPlanStatusInput,
  MealPlanStatus,
} from '../types/mealPlan';
import toast from 'react-hot-toast';

const MEAL_PLANS_KEY = 'meal-plans';

// List all meal plans (with optional status filter)
export function useMealPlans(status?: MealPlanStatus) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, status],
    queryFn: () => mealPlansService.list(status),
  });
}

// Get single meal plan by ID
export function useMealPlan(id: string | undefined) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, id],
    queryFn: () => mealPlansService.getById(id!),
    enabled: !!id,
  });
}

// Get meal plan nutrition
export function useMealPlanNutrition(id: string | undefined) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, id, 'nutrition'],
    queryFn: () => mealPlansService.getNutrition(id!),
    enabled: !!id,
  });
}

// Create meal plan mutation
export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMealPlanInput) => mealPlansService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
      toast.success('Meal plan created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create meal plan');
    },
  });
}

// Update meal plan mutation
export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMealPlanInput }) =>
      mealPlansService.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY, variables.id] });
      toast.success('Meal plan updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update meal plan');
    },
  });
}

// Delete meal plan mutation
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mealPlansService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
      toast.success('Meal plan deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete meal plan');
    },
  });
}

// Add recipe to meal plan mutation
export function useAddRecipeToMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mealPlanId, input }: { mealPlanId: string; input: AddRecipeToMealPlanInput }) =>
      mealPlansService.addRecipe(mealPlanId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY, variables.mealPlanId] });
      toast.success('Recipe added to meal plan!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add recipe');
    },
  });
}

// Update recipe in meal plan mutation
export function useUpdateMealPlanRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mealPlanId,
      recipeId,
      input,
    }: {
      mealPlanId: string;
      recipeId: string;
      input: UpdateMealPlanRecipeInput;
    }) => mealPlansService.updateRecipe(mealPlanId, recipeId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY, variables.mealPlanId] });
      toast.success('Recipe updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update recipe');
    },
  });
}

// Remove recipe from meal plan mutation
export function useRemoveRecipeFromMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mealPlanId, recipeId }: { mealPlanId: string; recipeId: string }) =>
      mealPlansService.removeRecipe(mealPlanId, recipeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY, variables.mealPlanId] });
      toast.success('Recipe removed from meal plan!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove recipe');
    },
  });
}

// Update meal plan status mutation
export function useUpdateMealPlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMealPlanStatusInput }) =>
      mealPlansService.updateStatus(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY, variables.id] });
      toast.success('Meal plan status updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}
