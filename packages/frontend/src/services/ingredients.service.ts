import { api } from './api';
import type { Ingredient, IngredientRecipe } from '../types/recipe';

export interface CreateIngredientInput {
  name: string;
  category?: string;
  tags?: string;
}

export interface UpdateIngredientInput {
  name: string;
  category?: string;
  tags?: string;
}

export interface ReplaceAndDeleteResult {
  deletedIngredient: string;
  replacementIngredient: string;
  recipesUpdated: number;
  recipesMerged: number;
  shoppingListItemsUpdated: number;
}

export const ingredientsService = {
  // Get all ingredients (auto-paginates to fetch all)
  async list(search?: string, category?: string): Promise<Ingredient[]> {
    const allIngredients: Ingredient[] = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      const params: any = { limit, offset };
      if (search) params.search = search;
      if (category) params.category = category;

      const { data } = await api.get('/ingredients', { params });
      allIngredients.push(...data.data);

      if (!data.pagination?.hasMore || allIngredients.length >= data.pagination.total) {
        break;
      }
      offset += limit;
    }

    return allIngredients;
  },

  // Get a single ingredient by ID
  async getById(id: string): Promise<Ingredient> {
    const { data } = await api.get(`/ingredients/${id}`);
    return data.data;
  },

  // Update an ingredient
  async update(id: string, input: UpdateIngredientInput): Promise<Ingredient> {
    const { data } = await api.put(`/ingredients/${id}`, input);
    return data.data;
  },

  // Delete an ingredient
  async delete(id: string): Promise<void> {
    await api.delete(`/ingredients/${id}`);
  },

  // Bulk import ingredients
  async bulkImport(ingredients: CreateIngredientInput[]): Promise<{ imported: number; skipped: number; ingredients: Ingredient[]; skippedItems: any[] }> {
    const { data } = await api.post('/ingredients/bulk-import', { ingredients });
    return data.data;
  },

  // Replace ingredient in all recipes/shopping lists, then delete it
  async replaceAndDelete(id: string, replacementIngredientId: string): Promise<ReplaceAndDeleteResult> {
    const { data } = await api.post(`/ingredients/${id}/replace-and-delete`, { replacementIngredientId });
    return data.data;
  },

  // Get recipes that use an ingredient
  async getRecipes(id: string): Promise<IngredientRecipe[]> {
    const { data } = await api.get(`/ingredients/${id}/recipes`);
    return data.data;
  },

  // Bulk delete ingredients
  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.post('/ingredients/bulk-delete', { ids });
    return data.data;
  },
};
