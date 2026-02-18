import { Router } from 'express';
import { ingredientController } from '../controllers/ingredient.controller.js';

const router = Router();

// Bulk operations (must come before /:id routes)
router.post('/bulk-import', (req, res) => ingredientController.bulkImport(req, res));
router.post('/bulk-delete', (req, res) => ingredientController.bulkDelete(req, res));

// CRUD routes
router.get('/', (req, res) => ingredientController.list(req, res));
router.get('/:id/recipes', (req, res) => ingredientController.getRecipes(req, res));
router.get('/:id', (req, res) => ingredientController.getById(req, res));
router.put('/:id', (req, res) => ingredientController.update(req, res));
router.post('/:id/replace-and-delete', (req, res) => ingredientController.replaceAndDelete(req, res));
router.delete('/:id', (req, res) => ingredientController.delete(req, res));

export default router;
