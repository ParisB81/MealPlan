import { api } from './api';
import type { AIRecipeSuggestion, GenerateRecipeSuggestionsInput } from '../types/aiRecipe';

export async function generateRecipeSuggestions(
  input: GenerateRecipeSuggestionsInput
): Promise<AIRecipeSuggestion[]> {
  const { data } = await api.post('/ai-recipes/generate', input);
  return data.data;
}
