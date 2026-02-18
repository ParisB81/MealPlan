import { api } from './api';
import type {
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  ListRecipesParams,
  ListRecipesResponse,
} from '../types/recipe';

export const recipesService = {
  // Get all recipes with optional search and filters
  async list(params?: ListRecipesParams): Promise<ListRecipesResponse> {
    const { data } = await api.get('/recipes', { params });
    return {
      recipes: data.data,
      pagination: data.pagination,
    };
  },

  // Get a single recipe by ID
  async getById(id: string): Promise<Recipe> {
    const { data } = await api.get(`/recipes/${id}`);
    return data.data;
  },

  // Create a new recipe
  async create(input: CreateRecipeInput): Promise<Recipe> {
    const { data } = await api.post('/recipes', input);
    return data.data;
  },

  // Update an existing recipe
  async update(id: string, input: UpdateRecipeInput): Promise<Recipe> {
    const { data } = await api.put(`/recipes/${id}`, input);
    return data.data;
  },

  // Delete a recipe
  async delete(id: string): Promise<void> {
    await api.delete(`/recipes/${id}`);
  },

  // Bulk import recipes
  async bulkImport(recipes: CreateRecipeInput[]): Promise<{ imported: number; recipes: Recipe[] }> {
    const { data } = await api.post('/recipes/bulk-import', { recipes });
    return data.data;
  },

  // Bulk delete recipes
  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.post('/recipes/bulk-delete', { ids });
    return data.data;
  },

  // Restore a deleted recipe
  async restore(id: string): Promise<Recipe> {
    const { data } = await api.post(`/recipes/${id}/restore`);
    return data.data;
  },

  // Permanently delete a recipe
  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/recipes/${id}/permanent`);
  },
};
