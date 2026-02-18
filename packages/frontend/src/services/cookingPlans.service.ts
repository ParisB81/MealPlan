import { api } from './api';
import type {
  CookingPlan,
  CookingPlanStatus,
  CreateCookingPlanInput,
  UpdateCookingPlanInput,
} from '../types/cookingPlan';

export const cookingPlansService = {
  async list(status?: CookingPlanStatus): Promise<CookingPlan[]> {
    const params = status ? { status } : {};
    const { data } = await api.get('/cooking-plans', { params });
    return data.data;
  },

  async getById(id: string): Promise<CookingPlan> {
    const { data } = await api.get(`/cooking-plans/${id}`);
    return data.data;
  },

  async create(input: CreateCookingPlanInput): Promise<CookingPlan> {
    const { data } = await api.post('/cooking-plans', input);
    return data.data;
  },

  async update(id: string, input: UpdateCookingPlanInput): Promise<CookingPlan> {
    const { data } = await api.put(`/cooking-plans/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<CookingPlan> {
    const { data } = await api.delete(`/cooking-plans/${id}`);
    return data.data;
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/cooking-plans/${id}/permanent`);
  },

  async restore(id: string): Promise<CookingPlan> {
    const { data } = await api.post(`/cooking-plans/${id}/restore`);
    return data.data;
  },
};
