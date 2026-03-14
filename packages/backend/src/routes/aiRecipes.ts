import { Router } from 'express';
import { aiRecipeController } from '../controllers/aiRecipe.controller.js';

const router = Router();

router.post('/generate', (req, res) => aiRecipeController.generateSuggestions(req, res));

export default router;
