import { Router } from 'express';
import { aiMealPlanController } from '../controllers/aiMealPlan.controller.js';

const router = Router();

router.post('/generate', (req, res) => aiMealPlanController.generate(req, res));
router.post('/swap', (req, res) => aiMealPlanController.swap(req, res));
router.post('/generate-recipe-details', (req, res) => aiMealPlanController.generateRecipeDetails(req, res));

export default router;
