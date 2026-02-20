import { PrismaClient } from '@prisma/client';
import {
  convertToBase,
  convertFromBase,
  applyIngredientOverride,
  getCountSubKey,
  MeasurementSystem,
} from '../utils/unitConversion.js';

const prisma = new PrismaClient();

interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  recipes: string[]; // Recipe titles that use this ingredient
}

interface AggregationEntry {
  ingredientId: string;
  name: string;
  category: string | null;
  baseQuantity: number; // Quantity in base unit
  system: MeasurementSystem;
  originalUnits: string[]; // Track original units for display preference
  recipes: string[];
}

export class ShoppingListService {
  // List all shopping lists (optionally filter by status)
  async listAll(status?: string) {
    const shoppingLists = await prisma.shoppingList.findMany({
      where: status ? { status } : undefined,
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return shoppingLists.map(list => ({
      ...list,
      itemsByCategory: this.groupByCategory(list.items),
    }));
  }

  // Get shopping list by ID
  async getById(id: string) {
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!shoppingList) {
      return null;
    }

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }

  // Generate shopping list from multiple meal plans
  async generateFromMealPlans(mealPlanIds: string[], name?: string) {
    // Get all recipes from all meal plans
    const mealPlanRecipes = await prisma.mealPlanRecipe.findMany({
      where: {
        mealPlanId: { in: mealPlanIds },
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Aggregate ingredients across all meal plans
    const aggregated = this.aggregateIngredients(mealPlanRecipes);

    // For multiple meal plans, we'll create a shopping list linked to the first one
    // (or we could store multiple meal plan IDs in a separate table)
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name: name || 'Shopping List',
        mealPlanId: mealPlanIds[0], // Link to first meal plan
        items: {
          create: aggregated.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
      mealPlanIds, // Include all meal plan IDs that were used
    };
  }

  // Generate or get shopping list for a meal plan
  async getOrCreateShoppingList(mealPlanId: string) {
    // Check if shopping list already exists
    let shoppingList = await prisma.shoppingList.findFirst({
      where: { mealPlanId },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    // If not, generate it
    if (!shoppingList) {
      shoppingList = await this.generateShoppingList(mealPlanId);
    }

    // Group items by category
    const itemsByCategory = this.groupByCategory(shoppingList.items);

    return {
      ...shoppingList,
      itemsByCategory,
    };
  }

  // Generate shopping list from meal plan
  async generateShoppingList(mealPlanId: string) {
    // Get all recipes in the meal plan with their ingredients
    const mealPlanRecipes = await prisma.mealPlanRecipe.findMany({
      where: { mealPlanId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Aggregate ingredients
    const aggregated = this.aggregateIngredients(mealPlanRecipes);

    // Create shopping list
    const shoppingList = await prisma.shoppingList.create({
      data: {
        mealPlanId,
        items: {
          create: aggregated.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return shoppingList;
  }

  // Aggregate ingredients across all recipes with unit conversion
  private aggregateIngredients(mealPlanRecipes: any[]): AggregatedIngredient[] {
    // Use a map with ingredient ID + measurement system as key
    // This allows combining same ingredients with convertible units
    const ingredientMap = new Map<string, AggregationEntry>();

    mealPlanRecipes.forEach((mealPlanRecipe) => {
      const recipe = mealPlanRecipe.recipe;
      const servingsMultiplier = mealPlanRecipe.servings / recipe.servings;

      recipe.ingredients.forEach((recipeIngredient: any) => {
        const adjustedQuantity = recipeIngredient.quantity * servingsMultiplier;
        const unit = recipeIngredient.unit;

        // Convert to base unit for the measurement system
        const { quantity: baseQuantity, system } = convertToBase(adjustedQuantity, unit);

        // For count-system units of overridden ingredients (e.g. garlic),
        // separate "clove" from "head"/"piece" so they don't get mixed
        // before the override can apply fromSize correctly.
        const countSub = getCountSubKey(recipeIngredient.ingredient.name, unit, system);
        const key = countSub
          ? `${recipeIngredient.ingredientId}-${system}-${countSub}`
          : `${recipeIngredient.ingredientId}-${system}`;
        const existingItem = ingredientMap.get(key);

        if (existingItem) {
          // Add to existing quantity (in base units)
          existingItem.baseQuantity += baseQuantity;
          if (!existingItem.recipes.includes(recipe.title)) {
            existingItem.recipes.push(recipe.title);
          }
          // Track original units for display preference
          if (!existingItem.originalUnits.includes(unit)) {
            existingItem.originalUnits.push(unit);
          }
        } else {
          // Create new entry
          ingredientMap.set(key, {
            ingredientId: recipeIngredient.ingredientId,
            name: recipeIngredient.ingredient.name,
            category: recipeIngredient.ingredient.category,
            baseQuantity: baseQuantity,
            system: system,
            originalUnits: [unit],
            recipes: [recipe.title],
          });
        }
      });
    });

    // Convert from base units back to display-friendly units
    const converted = Array.from(ingredientMap.values()).map((entry) => {
      // First try ingredient-specific override (e.g. garlic→cloves, herbs→bunch)
      const overrideResult = applyIngredientOverride(
        entry.name,
        entry.baseQuantity,
        entry.system,
        entry.originalUnits,
      );

      const { quantity, unit } = overrideResult
        ?? convertFromBase(entry.baseQuantity, entry.system, entry.originalUnits[0]);

      return {
        ingredientId: entry.ingredientId,
        name: entry.name,
        category: entry.category,
        quantity: quantity,
        unit: unit,
        recipes: entry.recipes,
      };
    });

    // Second pass: merge items that ended up with same ingredientId + unit
    // (happens when overrides convert different systems to the same unit, e.g. garlic clove+tsp both → clove)
    const mergedMap = new Map<string, AggregatedIngredient>();
    for (const item of converted) {
      const key = `${item.ingredientId}-${item.unit}`;
      const existing = mergedMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        for (const r of item.recipes) {
          if (!existing.recipes.includes(r)) existing.recipes.push(r);
        }
      } else {
        mergedMap.set(key, { ...item });
      }
    }

    return Array.from(mergedMap.values());
  }

  // Group shopping list items by category
  private groupByCategory(items: any[]) {
    const grouped: Record<string, any[]> = {};

    items.forEach((item) => {
      const category = item.ingredient.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Sort categories by preferred order
    const CATEGORY_ORDER = ['produce', 'pulses', 'dairy', 'meat', 'seafood', 'pantry', 'grains', 'oils', 'nuts', 'herbs', 'spices', 'Other'];
    const sortedGrouped: Record<string, any[]> = {};
    const knownCategories = Object.keys(grouped).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b); // both unknown: alphabetical
      if (ai === -1) return 1;  // unknown goes after known
      if (bi === -1) return -1;
      return ai - bi;
    });
    knownCategories.forEach((category) => {
      sortedGrouped[category] = grouped[category].sort((a: any, b: any) =>
        (a.ingredient.name || '').localeCompare(b.ingredient.name || '')
      );
    });

    return sortedGrouped;
  }

  // Toggle item checked status
  async toggleItemChecked(itemId: string) {
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return null;
    }

    return await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { checked: !item.checked },
    });
  }

  // Update item quantity
  async updateItemQuantity(itemId: string, quantity: number) {
    return await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  // Delete shopping list (to regenerate)
  // Soft delete - move to deleted status
  async deleteShoppingList(shoppingListId: string) {
    const shoppingList = await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: { status: 'deleted' },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }

  // Permanent delete - actually remove from database
  async permanentDeleteShoppingList(shoppingListId: string) {
    await prisma.shoppingList.delete({
      where: { id: shoppingListId },
    });
    return true;
  }

  // Complete shopping list
  async completeShoppingList(shoppingListId: string) {
    return await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: { status: 'completed' },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }

  // Create shopping list from recipes
  async generateFromRecipes(recipeIds: string[], name?: string) {
    // Get all recipes with their ingredients
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    // Create mock meal plan recipes for aggregation
    const mockMealPlanRecipes = recipes.map((recipe) => ({
      servings: recipe.servings,
      recipe,
    }));

    // Aggregate ingredients
    const aggregated = this.aggregateIngredients(mockMealPlanRecipes);

    // Create shopping list
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name: name || 'Shopping List from Recipes',
        mealPlanId: null, // Not linked to a meal plan
        items: {
          create: aggregated.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: Math.round(item.quantity * 100) / 100, // Round to 2 decimals
            unit: item.unit,
          })),
        },
      },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }

  // Create shopping list with custom ingredients
  async createCustom(
    name: string,
    customIngredients: Array<{ ingredientId: string; quantity: number; unit: string }>
  ) {
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name,
        mealPlanId: null,
        items: {
          create: customIngredients.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: Math.round(item.quantity * 100) / 100, // Round to 2 decimals
            unit: item.unit,
          })),
        },
      },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }

  // Add all ingredients from a meal plan to an existing shopping list (with proper unit aggregation)
  async addFromMealPlan(shoppingListId: string, mealPlanId: string) {
    // Verify shopping list exists
    const shoppingList = await prisma.shoppingList.findUnique({ where: { id: shoppingListId } });
    if (!shoppingList) return null;

    // Fetch all meal plan recipes with ingredients
    const mealPlanRecipes = await prisma.mealPlanRecipe.findMany({
      where: { mealPlanId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
    });

    if (mealPlanRecipes.length === 0) return { added: 0 };

    // Aggregate using the same unit-conversion logic as generateFromMealPlans
    const aggregated = this.aggregateIngredients(mealPlanRecipes);

    // Add each aggregated item to the existing list
    for (const item of aggregated) {
      await this.addItemToList(shoppingListId, item.ingredientId, item.quantity, item.unit);
    }

    return { added: aggregated.length };
  }

  // Add all ingredients from recipes to an existing shopping list (with proper unit aggregation)
  async addFromRecipes(shoppingListId: string, recipeIds: string[]) {
    // Verify shopping list exists
    const shoppingList = await prisma.shoppingList.findUnique({ where: { id: shoppingListId } });
    if (!shoppingList) return null;

    // Fetch recipes with ingredients
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (recipes.length === 0) return { added: 0 };

    // Create mock meal plan recipes for aggregation (1:1 servings)
    const mockMealPlanRecipes = recipes.map((recipe) => ({
      servings: recipe.servings,
      recipe,
    }));

    // Aggregate using the same unit-conversion logic
    const aggregated = this.aggregateIngredients(mockMealPlanRecipes);

    // Add each aggregated item to the existing list
    for (const item of aggregated) {
      await this.addItemToList(shoppingListId, item.ingredientId, item.quantity, item.unit);
    }

    return { added: aggregated.length };
  }

  // Add item to existing shopping list
  async addItemToList(shoppingListId: string, ingredientId: string, quantity: number, unit: string) {
    // Check if item already exists
    const existingItem = await prisma.shoppingListItem.findFirst({
      where: {
        shoppingListId,
        ingredientId,
        unit,
      },
    });

    if (existingItem) {
      // Update quantity
      return await prisma.shoppingListItem.update({
        where: { id: existingItem.id },
        data: { quantity: Math.round((existingItem.quantity + quantity) * 100) / 100 },
        include: { ingredient: true },
      });
    } else {
      // Create new item
      return await prisma.shoppingListItem.create({
        data: {
          shoppingListId,
          ingredientId,
          quantity: Math.round(quantity * 100) / 100,
          unit,
        },
        include: { ingredient: true },
      });
    }
  }

  // Remove item from shopping list
  async removeItemFromList(itemId: string) {
    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    });
    return true;
  }

  // Update shopping list name
  async updateShoppingList(shoppingListId: string, name: string) {
    const shoppingList = await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: { name },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }

  // Restore shopping list to active status
  async restoreShoppingList(shoppingListId: string) {
    const shoppingList = await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: { status: 'active' },
      include: {
        mealPlan: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return {
      ...shoppingList,
      itemsByCategory: this.groupByCategory(shoppingList.items),
    };
  }
}

export const shoppingListService = new ShoppingListService();
