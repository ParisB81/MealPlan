import { api } from './api';
import type {
  RecipeCollection,
  RecipeCollectionDetail,
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionMembership,
} from '../types/collection';

export const collectionsService = {
  async list(status?: string): Promise<RecipeCollection[]> {
    const params = status ? { status } : {};
    const { data } = await api.get('/collections', { params });
    return data.data;
  },

  async getById(id: string): Promise<RecipeCollectionDetail> {
    const { data } = await api.get(`/collections/${id}`);
    return data.data;
  },

  async create(input: CreateCollectionInput): Promise<RecipeCollection> {
    const { data } = await api.post('/collections', input);
    return data.data;
  },

  async update(id: string, input: UpdateCollectionInput): Promise<RecipeCollection> {
    const { data } = await api.put(`/collections/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<RecipeCollection> {
    const { data } = await api.delete(`/collections/${id}`);
    return data.data;
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/collections/${id}/permanent`);
  },

  async restore(id: string): Promise<RecipeCollection> {
    const { data } = await api.post(`/collections/${id}/restore`);
    return data.data;
  },

  async addRecipe(collectionId: string, recipeId: string): Promise<any> {
    const { data } = await api.post(`/collections/${collectionId}/recipes`, { recipeId });
    return data.data;
  },

  async addRecipes(collectionId: string, recipeIds: string[]): Promise<{ added: number; alreadyExisted: number }> {
    const { data } = await api.post(`/collections/${collectionId}/recipes/batch`, { recipeIds });
    return data.data;
  },

  async removeRecipe(collectionId: string, recipeId: string): Promise<void> {
    await api.delete(`/collections/${collectionId}/recipes/${recipeId}`);
  },

  async getCollectionsForRecipe(recipeId: string): Promise<CollectionMembership[]> {
    const { data } = await api.get(`/collections/recipe/${recipeId}/collections`);
    return data.data;
  },
};
