import { Router } from 'express';
import { mealPlanController } from '../controllers/mealPlan.controller.js';

const router = Router();

// Meal plan CRUD routes
router.post('/', (req, res) => mealPlanController.create(req, res));
router.get('/', (req, res) => mealPlanController.list(req, res));
router.get('/:id', (req, res) => mealPlanController.getById(req, res));
router.put('/:id', (req, res) => mealPlanController.update(req, res));
router.delete('/:id', (req, res) => mealPlanController.delete(req, res));

// Status update (must come before /:id/recipes to avoid route conflict)
router.patch('/:id/status', (req, res) => mealPlanController.updateStatus(req, res));

// Meal plan recipes routes
router.post('/:id/recipes', (req, res) => mealPlanController.addRecipe(req, res));
router.put('/:id/recipes/:recipeId', (req, res) => mealPlanController.updateRecipe(req, res));
router.delete('/:id/recipes/:recipeId', (req, res) => mealPlanController.removeRecipe(req, res));

// Nutrition summary
router.get('/:id/nutrition', (req, res) => mealPlanController.getNutrition(req, res));

export default router;
