import { useMutation } from '@tanstack/react-query';
import { generateRecipeSuggestions } from '../services/aiRecipes.service';
import type { GenerateRecipeSuggestionsInput } from '../types/aiRecipe';
import toast from 'react-hot-toast';

export function useGenerateRecipeSuggestions() {
  return useMutation({
    mutationFn: (input: GenerateRecipeSuggestionsInput) => generateRecipeSuggestions(input),
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to generate recipe suggestions';
      toast.error(message);
    },
  });
}
