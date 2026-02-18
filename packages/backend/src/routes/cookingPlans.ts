import { Router } from 'express';
import { cookingPlanController } from '../controllers/cookingPlan.controller.js';

const router = Router();

router.get('/', (req, res) => cookingPlanController.list(req, res));
router.get('/:id', (req, res) => cookingPlanController.getById(req, res));
router.post('/', (req, res) => cookingPlanController.create(req, res));
router.put('/:id', (req, res) => cookingPlanController.update(req, res));
router.delete('/:id', (req, res) => cookingPlanController.delete(req, res));
router.delete('/:id/permanent', (req, res) =>
  cookingPlanController.permanentDelete(req, res)
);
router.post('/:id/restore', (req, res) =>
  cookingPlanController.restore(req, res)
);

export default router;
