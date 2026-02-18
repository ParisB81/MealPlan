import { Router } from 'express';
import { recipeController } from '../controllers/recipe.controller.js';

const router = Router();

// Bulk operations (must come before /:id routes)
router.post('/bulk-import', (req, res) => recipeController.bulkImport(req, res));
router.post('/bulk-delete', (req, res) => recipeController.bulkDelete(req, res));

// Recipe CRUD routes
router.post('/', (req, res) => recipeController.create(req, res));
router.get('/', (req, res) => recipeController.list(req, res));
router.get('/:id', (req, res) => recipeController.getById(req, res));
router.put('/:id', (req, res) => recipeController.update(req, res));
router.delete('/:id', (req, res) => recipeController.delete(req, res));

// Recipe status management
router.post('/:id/restore', (req, res) => recipeController.restore(req, res));
router.delete('/:id/permanent', (req, res) => recipeController.permanentDelete(req, res));

export default router;
