import { Router } from 'express';
import { collectionController } from '../controllers/collection.controller.js';

const router = Router();

// IMPORTANT: /recipe/:recipeId/collections must come BEFORE /:id
// to prevent "recipe" from matching as :id
router.get('/recipe/:recipeId/collections', (req, res) =>
  collectionController.getCollectionsForRecipe(req, res)
);

router.get('/', (req, res) => collectionController.list(req, res));
router.get('/:id', (req, res) => collectionController.getById(req, res));
router.post('/', (req, res) => collectionController.create(req, res));
router.put('/:id', (req, res) => collectionController.update(req, res));
router.delete('/:id', (req, res) => collectionController.delete(req, res));
router.delete('/:id/permanent', (req, res) =>
  collectionController.permanentDelete(req, res)
);
router.post('/:id/restore', (req, res) =>
  collectionController.restore(req, res)
);
router.post('/:id/recipes', (req, res) =>
  collectionController.addRecipe(req, res)
);
router.post('/:id/recipes/batch', (req, res) =>
  collectionController.addRecipes(req, res)
);
router.delete('/:id/recipes/:recipeId', (req, res) =>
  collectionController.removeRecipe(req, res)
);

export default router;
