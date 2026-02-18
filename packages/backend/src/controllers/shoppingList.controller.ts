import { Request, Response } from 'express';
import { shoppingListService } from '../services/shoppingList.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { isValidUnit } from '../utils/validUnits.js';

export class ShoppingListController {
  // List all shopping lists
  async list(req: Request, res: Response) {
    const { status } = req.query;
    const shoppingLists = await shoppingListService.listAll(status as string);

    res.json({
      status: 'success',
      data: shoppingLists,
    });
  }

  // Generate shopping list from meal plan(s)
  async generate(req: Request, res: Response) {
    const { mealPlanIds, name } = req.body;

    if (!Array.isArray(mealPlanIds) || mealPlanIds.length === 0) {
      throw new AppError(400, 'mealPlanIds must be a non-empty array');
    }

    const shoppingList = await shoppingListService.generateFromMealPlans(mealPlanIds, name);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Get single shopping list by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const shoppingList = await shoppingListService.getById(id);

    if (!shoppingList) {
      throw new AppError(404, 'Shopping list not found');
    }

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Get or create shopping list for meal plan
  async getForMealPlan(req: Request, res: Response) {
    const { mealPlanId } = req.params;

    const shoppingList = await shoppingListService.getOrCreateShoppingList(mealPlanId);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Toggle item checked status
  async toggleItemChecked(req: Request, res: Response) {
    const { itemId } = req.params;

    const item = await shoppingListService.toggleItemChecked(itemId);

    if (!item) {
      throw new AppError(404, 'Shopping list item not found');
    }

    res.json({
      status: 'success',
      data: item,
    });
  }

  // Update item quantity
  async updateItemQuantity(req: Request, res: Response) {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new AppError(400, 'Invalid quantity');
    }

    const item = await shoppingListService.updateItemQuantity(itemId, quantity);

    res.json({
      status: 'success',
      data: item,
    });
  }

  // Soft delete shopping list (move to deleted status)
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const shoppingList = await shoppingListService.deleteShoppingList(id);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Permanent delete shopping list (remove from database)
  async permanentDelete(req: Request, res: Response) {
    const { id } = req.params;

    await shoppingListService.permanentDeleteShoppingList(id);

    res.status(204).send();
  }

  // Complete shopping list
  async complete(req: Request, res: Response) {
    const { id } = req.params;

    const shoppingList = await shoppingListService.completeShoppingList(id);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Generate shopping list from recipes
  async generateFromRecipes(req: Request, res: Response) {
    const { recipeIds, name } = req.body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new AppError(400, 'recipeIds must be a non-empty array');
    }

    const shoppingList = await shoppingListService.generateFromRecipes(recipeIds, name);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Create custom shopping list
  async createCustom(req: Request, res: Response) {
    const { name, ingredients } = req.body;

    if (!name || typeof name !== 'string') {
      throw new AppError(400, 'name is required');
    }

    if (!Array.isArray(ingredients)) {
      throw new AppError(400, 'ingredients must be an array');
    }

    // Validate units for all ingredients
    for (const ingredient of ingredients) {
      if (ingredient.unit && !isValidUnit(ingredient.unit)) {
        throw new AppError(400, `Invalid unit "${ingredient.unit}". Please use a valid unit (e.g., g, kg, ml, cup, piece).`);
      }
    }

    const shoppingList = await shoppingListService.createCustom(name, ingredients);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Add all ingredients from a meal plan to an existing shopping list
  async addFromMealPlan(req: Request, res: Response) {
    const { id } = req.params;
    const { mealPlanId } = req.body;

    if (!mealPlanId) {
      throw new AppError(400, 'mealPlanId is required');
    }

    const result = await shoppingListService.addFromMealPlan(id, mealPlanId);

    if (!result) {
      throw new AppError(404, 'Shopping list not found');
    }

    res.json({ status: 'success', data: result });
  }

  // Add item to shopping list
  async addItem(req: Request, res: Response) {
    const { id } = req.params;
    const { ingredientId, quantity, unit } = req.body;

    if (!ingredientId || !quantity || !unit) {
      throw new AppError(400, 'ingredientId, quantity, and unit are required');
    }

    if (!isValidUnit(unit)) {
      throw new AppError(400, 'Invalid unit of measurement. Please use a valid unit (e.g., g, kg, ml, cup, piece).');
    }

    const item = await shoppingListService.addItemToList(id, ingredientId, quantity, unit);

    res.json({
      status: 'success',
      data: item,
    });
  }

  // Remove item from shopping list
  async removeItem(req: Request, res: Response) {
    const { id, itemId } = req.params;

    await shoppingListService.removeItemFromList(itemId);

    res.status(204).send();
  }

  // Update shopping list
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'name is required and must be a non-empty string');
    }

    const shoppingList = await shoppingListService.updateShoppingList(id, name.trim());

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }

  // Restore shopping list to active
  async restore(req: Request, res: Response) {
    const { id } = req.params;

    const shoppingList = await shoppingListService.restoreShoppingList(id);

    res.json({
      status: 'success',
      data: shoppingList,
    });
  }
}

export const shoppingListController = new ShoppingListController();
