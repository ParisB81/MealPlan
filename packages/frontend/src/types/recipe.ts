export interface Ingredient {
  id: string;
  name: string;
  category?: string;
  tags: string;
}

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  notes?: string;
  ingredient: Ingredient;
}

export interface RecipeNutrition {
  id: string;
  recipeId: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  sourceUrl?: string;  // Original recipe URL
  instructions: string[];
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  nutrition?: RecipeNutrition;
}

export interface CreateRecipeInput {
  title: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  sourceUrl?: string;  // Original recipe URL
  instructions: string[];
  tags: string[];
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {}

export interface ListRecipesParams {
  search?: string;
  tags?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListRecipesResponse {
  recipes: Recipe[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface IngredientRecipe {
  recipeId: string;
  recipeTitle: string;
  quantity: number;
  unit: string;
  notes: string | null;
  servings: number;
  tags: string;
}
