import type { Ingredient } from './recipe';

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  checked: boolean;
  ingredient: Ingredient;
}

export interface ShoppingList {
  id: string;
  name: string;
  mealPlanId: string | null;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItem[];
  itemsByCategory?: Record<string, ShoppingListItem[]>;
  mealPlan?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  mealPlanIds?: string[]; // For lists generated from multiple plans
}

export interface CreateShoppingListFromRecipesInput {
  recipeIds: string[];
  name?: string;
}

export interface CreateCustomShoppingListInput {
  name: string;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;
}

export interface AddItemToListInput {
  ingredientId: string;
  quantity: number;
  unit: string;
}
