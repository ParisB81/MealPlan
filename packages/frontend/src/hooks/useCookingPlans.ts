import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cookingPlansService } from '../services/cookingPlans.service';
import type {
  CreateCookingPlanInput,
  UpdateCookingPlanInput,
  CookingPlanStatus,
} from '../types/cookingPlan';
import toast from 'react-hot-toast';

const COOKING_PLANS_KEY = 'cooking-plans';

// List cooking plans (with optional status filter)
export function useCookingPlans(status?: CookingPlanStatus) {
  return useQuery({
    queryKey: [COOKING_PLANS_KEY, status],
    queryFn: () => cookingPlansService.list(status),
  });
}

// Get single cooking plan by ID
export function useCookingPlan(id: string | undefined) {
  return useQuery({
    queryKey: [COOKING_PLANS_KEY, id],
    queryFn: () => cookingPlansService.getById(id!),
    enabled: !!id,
  });
}

// Create cooking plan
export function useCreateCookingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCookingPlanInput) =>
      cookingPlansService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COOKING_PLANS_KEY] });
      toast.success('Cooking plan saved!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save cooking plan');
    },
  });
}

// Update cooking plan
export function useUpdateCookingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCookingPlanInput }) =>
      cookingPlansService.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [COOKING_PLANS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [COOKING_PLANS_KEY, variables.id],
      });
      toast.success('Cooking plan updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update cooking plan');
    },
  });
}

// Soft delete cooking plan
export function useDeleteCookingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cookingPlansService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COOKING_PLANS_KEY] });
      toast.success('Cooking plan deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete cooking plan');
    },
  });
}

// Permanent delete cooking plan
export function usePermanentDeleteCookingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cookingPlansService.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COOKING_PLANS_KEY] });
      toast.success('Cooking plan permanently deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete cooking plan');
    },
  });
}

// Restore cooking plan
export function useRestoreCookingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cookingPlansService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COOKING_PLANS_KEY] });
      toast.success('Cooking plan restored!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore cooking plan');
    },
  });
}
