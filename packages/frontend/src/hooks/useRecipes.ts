import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesService } from '../services/recipes.service';
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  ListRecipesParams,
} from '../types/recipe';
import type { ApiError } from '../services/api';
import toast from 'react-hot-toast';

/** Builds a toast message that includes field-level error details when available */
function buildErrorToast(error: Error, fallback: string): string {
  const apiErr = error as ApiError;
  const fieldErrors = apiErr.response?.data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const count = fieldErrors.length;
    return `Validation error: ${count} field${count > 1 ? 's' : ''} need${count === 1 ? 's' : ''} fixing. See details below.`;
  }
  return error.message || fallback;
}

const RECIPES_KEY = 'recipes';

// List recipes with search and filters - fetches ALL recipes by paginating through the backend
export function useRecipes(params?: ListRecipesParams) {
  return useQuery({
    queryKey: [RECIPES_KEY, params],
    queryFn: async () => {
      // Paginate through all results since backend caps limit at 100
      const allRecipes: Awaited<ReturnType<typeof recipesService.list>>['recipes'] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const result = await recipesService.list({ ...params, limit, offset });
        allRecipes.push(...result.recipes);
        if (allRecipes.length >= result.pagination.total) {
          // Return in same format with updated pagination
          return {
            recipes: allRecipes,
            pagination: {
              ...result.pagination,
              limit: allRecipes.length,
              offset: 0,
              hasMore: false,
            },
          };
        }
        offset += limit;
      }
    },
  });
}

// Get single recipe by ID
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: () => recipesService.getById(id!),
    enabled: !!id,
  });
}

// Create recipe mutation
export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecipeInput) => recipesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success('Recipe created successfully!');
    },
    onError: (error: Error) => {
      toast.error(buildErrorToast(error, 'Failed to create recipe'));
    },
  });
}

// Update recipe mutation
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) =>
      recipesService.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, variables.id] });
      toast.success('Recipe updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(buildErrorToast(error, 'Failed to update recipe'));
    },
  });
}

// Delete recipe mutation
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success('Recipe deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete recipe');
    },
  });
}

// Bulk import recipes mutation
export function useBulkImportRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipes: CreateRecipeInput[]) => recipesService.bulkImport(recipes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success(`Successfully imported ${data.imported} recipes!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import recipes');
    },
  });
}

// Bulk delete recipes mutation
export function useBulkDeleteRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => recipesService.bulkDelete(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success(`Successfully deleted ${data.deleted} recipes!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete recipes');
    },
  });
}

// Restore recipe mutation
export function useRestoreRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success('Recipe restored successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore recipe');
    },
  });
}

// Permanent delete recipe mutation
export function usePermanentDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesService.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      toast.success('Recipe permanently deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete recipe');
    },
  });
}
