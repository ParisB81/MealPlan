import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListsService, type GenerateShoppingListInput } from '../services/shoppingLists.service';
import type { CreateShoppingListFromRecipesInput, CreateCustomShoppingListInput, AddItemToListInput } from '../types/shoppingList';
import toast from 'react-hot-toast';

const SHOPPING_LISTS_KEY = 'shopping-lists';

// List all shopping lists (optionally filter by status)
export function useShoppingLists(status?: string) {
  return useQuery({
    queryKey: [SHOPPING_LISTS_KEY, status],
    queryFn: () => shoppingListsService.list(status),
  });
}

// Get shopping list by ID
export function useShoppingListById(id: string | undefined) {
  return useQuery({
    queryKey: [SHOPPING_LISTS_KEY, id],
    queryFn: () => shoppingListsService.getById(id!),
    enabled: !!id,
  });
}

// Generate shopping list
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateShoppingListInput) => shoppingListsService.generate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate shopping list');
    },
  });
}

// Get shopping list for meal plan
export function useShoppingList(mealPlanId: string | undefined) {
  return useQuery({
    queryKey: [SHOPPING_LISTS_KEY, mealPlanId],
    queryFn: () => shoppingListsService.getForMealPlan(mealPlanId!),
    enabled: !!mealPlanId,
  });
}

// Toggle item checked
export function useToggleShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, itemId }: { shoppingListId: string; itemId: string }) =>
      shoppingListsService.toggleItemChecked(shoppingListId, itemId),
    onSuccess: () => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });
}

// Update item quantity
export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shoppingListId,
      itemId,
      quantity,
    }: {
      shoppingListId: string;
      itemId: string;
      quantity: number;
    }) => shoppingListsService.updateItemQuantity(shoppingListId, itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Quantity updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update quantity');
    },
  });
}

// Delete shopping list
export function useDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: string) => shoppingListsService.delete(shoppingListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list deleted. A new one will be generated.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete shopping list');
    },
  });
}

// Complete shopping list
export function useCompleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: string) => shoppingListsService.complete(shoppingListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list marked as completed!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete shopping list');
    },
  });
}

// Generate shopping list from recipes
export function useGenerateFromRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShoppingListFromRecipesInput) => shoppingListsService.generateFromRecipes(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list created from recipes!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create shopping list from recipes');
    },
  });
}

// Create custom shopping list
export function useCreateCustomShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomShoppingListInput) => shoppingListsService.createCustom(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Custom shopping list created!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create custom shopping list');
    },
  });
}

// Add item to shopping list
export function useAddItemToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, item }: { shoppingListId: string; item: AddItemToListInput }) =>
      shoppingListsService.addItem(shoppingListId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Item added to shopping list!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add item to shopping list');
    },
  });
}

// Remove item from shopping list
export function useRemoveItemFromList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, itemId }: { shoppingListId: string; itemId: string }) =>
      shoppingListsService.removeItem(shoppingListId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Item removed from shopping list!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove item');
    },
  });
}

// Update shopping list
export function useUpdateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, name }: { shoppingListId: string, name: string }) =>
      shoppingListsService.update(shoppingListId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list name updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shopping list');
    },
  });
}

// Restore shopping list to active
export function useRestoreShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: string) =>
      shoppingListsService.restore(shoppingListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list restored to active!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore shopping list');
    },
  });
}

// Add all ingredients from a meal plan to an existing shopping list
export function useAddFromMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, mealPlanId }: { shoppingListId: string; mealPlanId: string }) =>
      shoppingListsService.addFromMealPlan(shoppingListId, mealPlanId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success(`Added ${data.added} ingredient(s) to shopping list!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add ingredients to shopping list');
    },
  });
}

// Permanent delete shopping list
export function usePermanentDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: string) =>
      shoppingListsService.permanentDelete(shoppingListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] });
      toast.success('Shopping list permanently deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete shopping list');
    },
  });
}
