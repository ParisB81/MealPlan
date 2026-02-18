import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientsService, type CreateIngredientInput, type UpdateIngredientInput, type ReplaceAndDeleteResult } from '../services/ingredients.service';
import toast from 'react-hot-toast';

const INGREDIENTS_KEY = 'ingredients';

// List all ingredients
export function useIngredients(search?: string, category?: string) {
  return useQuery({
    queryKey: [INGREDIENTS_KEY, search, category],
    queryFn: () => ingredientsService.list(search, category),
  });
}

// Get recipes that use a specific ingredient
export function useIngredientRecipes(ingredientId: string | undefined) {
  return useQuery({
    queryKey: [INGREDIENTS_KEY, ingredientId, 'recipes'],
    queryFn: () => ingredientsService.getRecipes(ingredientId!),
    enabled: !!ingredientId,
  });
}

// Get single ingredient by ID
export function useIngredient(id: string | undefined) {
  return useQuery({
    queryKey: [INGREDIENTS_KEY, id],
    queryFn: () => ingredientsService.getById(id!),
    enabled: !!id,
  });
}

// Update ingredient mutation
export function useUpdateIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIngredientInput }) =>
      ingredientsService.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY, variables.id] });
      toast.success('Ingredient updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to update ingredient';
      toast.error(message);
    },
  });
}

// Delete ingredient mutation
export function useDeleteIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ingredientsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY] });
      toast.success('Ingredient deleted successfully!');
    },
    // onError handled at call site to support replace-and-delete flow
  });
}

// Replace ingredient in all recipes/shopping lists, then delete it
export function useReplaceAndDeleteIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, replacementIngredientId }: { id: string; replacementIngredientId: string }) =>
      ingredientsService.replaceAndDelete(id, replacementIngredientId),
    onSuccess: (data: ReplaceAndDeleteResult) => {
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      const totalRecipes = data.recipesUpdated + data.recipesMerged;
      toast.success(
        `Replaced "${data.deletedIngredient}" with "${data.replacementIngredient}" in ${totalRecipes} recipe(s) and ${data.shoppingListItemsUpdated} shopping list item(s), then deleted it.`
      );
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to replace and delete ingredient';
      toast.error(message);
    },
  });
}

// Bulk import ingredients mutation
export function useBulkImportIngredients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredients: CreateIngredientInput[]) => ingredientsService.bulkImport(ingredients),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY] });
      toast.success(`Successfully imported ${data.imported} ingredients! ${data.skipped > 0 ? `Skipped ${data.skipped}.` : ''}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import ingredients');
    },
  });
}

// Bulk delete ingredients mutation
export function useBulkDeleteIngredients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => ingredientsService.bulkDelete(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INGREDIENTS_KEY] });
      toast.success(`Successfully deleted ${data.deleted} ingredients!`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to delete ingredients';
      toast.error(message);
    },
  });
}
