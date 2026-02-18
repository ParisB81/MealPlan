import { api } from './api';
import type { ShoppingList, CreateShoppingListFromRecipesInput, CreateCustomShoppingListInput, AddItemToListInput } from '../types/shoppingList';

export interface GenerateShoppingListInput {
  mealPlanIds: string[];
  name?: string;
}

export const shoppingListsService = {
  // List all shopping lists
  async list(status?: string): Promise<ShoppingList[]> {
    const { data } = await api.get('/shopping-lists', { params: { status } });
    return data.data;
  },

  // Get shopping list by ID
  async getById(id: string): Promise<ShoppingList> {
    const { data } = await api.get(`/shopping-lists/${id}`);
    return data.data;
  },

  // Generate shopping list from meal plan(s)
  async generate(input: GenerateShoppingListInput): Promise<ShoppingList> {
    const { data } = await api.post('/shopping-lists/generate', input);
    return data.data;
  },

  // Get shopping list for meal plan (creates if doesn't exist)
  async getForMealPlan(mealPlanId: string): Promise<ShoppingList> {
    const { data } = await api.get(`/shopping-lists/meal-plan/${mealPlanId}`);
    return data.data;
  },

  // Toggle item checked status
  async toggleItemChecked(shoppingListId: string, itemId: string) {
    const { data } = await api.post(`/shopping-lists/${shoppingListId}/items/${itemId}/toggle`);
    return data.data;
  },

  // Update item quantity
  async updateItemQuantity(shoppingListId: string, itemId: string, quantity: number) {
    const { data } = await api.put(`/shopping-lists/${shoppingListId}/items/${itemId}`, { quantity });
    return data.data;
  },

  // Delete shopping list (soft delete - move to deleted status)
  async delete(shoppingListId: string): Promise<ShoppingList> {
    const { data } = await api.delete(`/shopping-lists/${shoppingListId}`);
    return data.data;
  },

  // Complete shopping list
  async complete(shoppingListId: string): Promise<ShoppingList> {
    const { data } = await api.post(`/shopping-lists/${shoppingListId}/complete`);
    return data.data;
  },

  // Generate shopping list from recipes
  async generateFromRecipes(input: CreateShoppingListFromRecipesInput): Promise<ShoppingList> {
    const { data } = await api.post('/shopping-lists/generate-from-recipes', input);
    return data.data;
  },

  // Create custom shopping list
  async createCustom(input: CreateCustomShoppingListInput): Promise<ShoppingList> {
    const { data} = await api.post('/shopping-lists/custom', input);
    return data.data;
  },

  // Add all ingredients from a meal plan to an existing shopping list
  async addFromMealPlan(shoppingListId: string, mealPlanId: string): Promise<{ added: number }> {
    const { data } = await api.post(`/shopping-lists/${shoppingListId}/add-from-meal-plan`, { mealPlanId });
    return data.data;
  },

  // Add item to shopping list
  async addItem(shoppingListId: string, item: AddItemToListInput) {
    const { data } = await api.post(`/shopping-lists/${shoppingListId}/items`, item);
    return data.data;
  },

  // Remove item from shopping list
  async removeItem(shoppingListId: string, itemId: string): Promise<void> {
    await api.delete(`/shopping-lists/${shoppingListId}/items/${itemId}`);
  },

  // Update shopping list
  async update(shoppingListId: string, name: string): Promise<ShoppingList> {
    const { data } = await api.put(`/shopping-lists/${shoppingListId}`, { name });
    return data.data;
  },

  // Restore shopping list to active
  async restore(shoppingListId: string): Promise<ShoppingList> {
    const { data } = await api.post(`/shopping-lists/${shoppingListId}/restore`);
    return data.data;
  },

  // Permanent delete shopping list (remove from database)
  async permanentDelete(shoppingListId: string): Promise<void> {
    await api.delete(`/shopping-lists/${shoppingListId}/permanent`);
  },
};
