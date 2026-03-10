import { Router } from 'express';
import { mealPlanPreferenceController } from '../controllers/mealPlanPreference.controller.js';

const router = Router();

router.post('/', (req, res) => mealPlanPreferenceController.create(req, res));
router.get('/', (req, res) => mealPlanPreferenceController.list(req, res));
router.get('/:id', (req, res) => mealPlanPreferenceController.getById(req, res));
router.put('/:id', (req, res) => mealPlanPreferenceController.update(req, res));
router.delete('/:id', (req, res) => mealPlanPreferenceController.delete(req, res));

export default router;
