import { api } from './api';
import type {
  MealPlan,
  CreateMealPlanInput,
  UpdateMealPlanInput,
  AddRecipeToMealPlanInput,
  UpdateMealPlanRecipeInput,
  UpdateMealPlanStatusInput,
  MealPlanNutrition,
  MealPlanStatus,
} from '../types/mealPlan';

export const mealPlansService = {
  // Get all meal plans (with optional status filter)
  async list(status?: MealPlanStatus): Promise<MealPlan[]> {
    const params = status ? { status } : {};
    const { data } = await api.get('/meal-plans', { params });
    return data.data;
  },

  // Get a single meal plan by ID
  async getById(id: string): Promise<MealPlan> {
    const { data } = await api.get(`/meal-plans/${id}`);
    return data.data;
  },

  // Create a new meal plan
  async create(input: CreateMealPlanInput): Promise<MealPlan> {
    const { data } = await api.post('/meal-plans', input);
    return data.data;
  },

  // Update an existing meal plan
  async update(id: string, input: UpdateMealPlanInput): Promise<MealPlan> {
    const { data } = await api.put(`/meal-plans/${id}`, input);
    return data.data;
  },

  // Delete a meal plan
  async delete(id: string): Promise<void> {
    await api.delete(`/meal-plans/${id}`);
  },

  // Add recipe to meal plan
  async addRecipe(mealPlanId: string, input: AddRecipeToMealPlanInput) {
    const { data } = await api.post(`/meal-plans/${mealPlanId}/recipes`, input);
    return data.data;
  },

  // Update recipe in meal plan
  async updateRecipe(mealPlanId: string, recipeId: string, input: UpdateMealPlanRecipeInput) {
    const { data } = await api.put(`/meal-plans/${mealPlanId}/recipes/${recipeId}`, input);
    return data.data;
  },

  // Remove recipe from meal plan
  async removeRecipe(mealPlanId: string, recipeId: string): Promise<void> {
    await api.delete(`/meal-plans/${mealPlanId}/recipes/${recipeId}`);
  },

  // Get nutrition summary for meal plan
  async getNutrition(mealPlanId: string): Promise<MealPlanNutrition> {
    const { data } = await api.get(`/meal-plans/${mealPlanId}/nutrition`);
    return data.data;
  },

  // Update meal plan status
  async updateStatus(id: string, input: UpdateMealPlanStatusInput): Promise<MealPlan> {
    const { data } = await api.patch(`/meal-plans/${id}/status`, input);
    return data.data;
  },
};
