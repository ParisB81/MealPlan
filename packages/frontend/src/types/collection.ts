import type { Recipe } from './recipe';

export interface RecipeCollection {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  status: string;
  recipeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRecipe extends Recipe {
  addedAt: string;
  collectionItemId: string;
}

export interface RecipeCollectionDetail extends Omit<RecipeCollection, 'recipeCount'> {
  recipeCount: number;
  recipes: CollectionRecipe[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
}

export interface CollectionMembership {
  id: string;
  name: string;
}
