import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPreferences,
  getPreference,
  createPreference,
  updatePreference,
  deletePreference,
} from '../services/mealPlanPreferences.service';
import type { CreatePreferenceInput, UpdatePreferenceInput } from '../types/mealPlanPreference';
import toast from 'react-hot-toast';

export function usePreferences(status?: string) {
  return useQuery({
    queryKey: ['preferences', status],
    queryFn: () => listPreferences(status),
  });
}

export function usePreference(id: string | null) {
  return useQuery({
    queryKey: ['preference', id],
    queryFn: () => getPreference(id!),
    enabled: !!id,
  });
}

export function useCreatePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePreferenceInput) => createPreference(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preference profile saved');
    },
    onError: () => {
      toast.error('Failed to save preference profile');
    },
  });
}

export function useUpdatePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePreferenceInput }) =>
      updatePreference(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['preference', data.id] });
      toast.success('Preference profile updated');
    },
    onError: () => {
      toast.error('Failed to update preference profile');
    },
  });
}

export function useDeletePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePreference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preference profile deleted');
    },
    onError: () => {
      toast.error('Failed to delete preference profile');
    },
  });
}
