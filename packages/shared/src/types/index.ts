// Common types shared between frontend and backend
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
  instructions: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  createdAt: Date;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface RecipeNutrition {
  id: string;
  recipeId: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlanRecipe {
  id: string;
  mealPlanId: string;
  recipeId: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes: string | null;
  completed: boolean;
}

export interface ShoppingList {
  id: string;
  mealPlanId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

// Extended types with relations
export interface RecipeWithDetails extends Recipe {
  ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
  nutrition: RecipeNutrition | null;
}

export interface MealPlanWithRecipes extends MealPlan {
  meals: (MealPlanRecipe & { recipe: Recipe })[];
}

export interface ShoppingListWithItems extends ShoppingList {
  items: (ShoppingListItem & { ingredient: Ingredient })[];
}
