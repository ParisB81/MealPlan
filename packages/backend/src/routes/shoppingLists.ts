import { Router } from 'express';
import { shoppingListController } from '../controllers/shoppingList.controller.js';

const router = Router();

// List all shopping lists
router.get('/', (req, res) => shoppingListController.list(req, res));

// Create shopping list from meal plan(s)
router.post('/generate', (req, res) => shoppingListController.generate(req, res));

// Create shopping list from recipes
router.post('/generate-from-recipes', (req, res) => shoppingListController.generateFromRecipes(req, res));

// Create custom shopping list
router.post('/custom', (req, res) => shoppingListController.createCustom(req, res));

// Get shopping list for meal plan
router.get('/meal-plan/:mealPlanId', (req, res) => shoppingListController.getForMealPlan(req, res));

// Get single shopping list by ID
router.get('/:id', (req, res) => shoppingListController.getById(req, res));

// Update shopping list
router.put('/:id', (req, res) => shoppingListController.update(req, res));

// Complete shopping list
router.post('/:id/complete', (req, res) => shoppingListController.complete(req, res));

// Restore shopping list to active
router.post('/:id/restore', (req, res) => shoppingListController.restore(req, res));

// Add all ingredients from a meal plan to an existing shopping list
router.post('/:id/add-from-meal-plan', (req, res) => shoppingListController.addFromMealPlan(req, res));

// Add item to shopping list
router.post('/:id/items', (req, res) => shoppingListController.addItem(req, res));

// Toggle item checked
router.post('/:id/items/:itemId/toggle', (req, res) => shoppingListController.toggleItemChecked(req, res));

// Update item quantity
router.put('/:id/items/:itemId', (req, res) => shoppingListController.updateItemQuantity(req, res));

// Remove item from shopping list
router.delete('/:id/items/:itemId', (req, res) => shoppingListController.removeItem(req, res));

// Delete shopping list (soft delete - move to deleted status)
router.delete('/:id', (req, res) => shoppingListController.delete(req, res));

// Permanent delete shopping list (remove from database)
router.delete('/:id/permanent', (req, res) => shoppingListController.permanentDelete(req, res));

export default router;
