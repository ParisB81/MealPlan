import { api } from './api';
import type { MealPlanPreference, CreatePreferenceInput, UpdatePreferenceInput } from '../types/mealPlanPreference';

export async function listPreferences(status?: string): Promise<MealPlanPreference[]> {
  const params = status ? { status } : {};
  const { data } = await api.get('/meal-plan-preferences', { params });
  return data.data;
}

export async function getPreference(id: string): Promise<MealPlanPreference> {
  const { data } = await api.get(`/meal-plan-preferences/${id}`);
  return data.data;
}

export async function createPreference(input: CreatePreferenceInput): Promise<MealPlanPreference> {
  const { data } = await api.post('/meal-plan-preferences', input);
  return data.data;
}

export async function updatePreference(id: string, input: UpdatePreferenceInput): Promise<MealPlanPreference> {
  const { data } = await api.put(`/meal-plan-preferences/${id}`, input);
  return data.data;
}

export async function deletePreference(id: string): Promise<void> {
  await api.delete(`/meal-plan-preferences/${id}`);
}
