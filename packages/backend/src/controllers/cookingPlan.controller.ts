import { Request, Response } from 'express';
import { cookingPlanService } from '../services/cookingPlan.service.js';
import {
  createCookingPlanSchema,
  updateCookingPlanSchema,
} from '../validators/cookingPlan.validator.js';
import { AppError } from '../middleware/errorHandler.js';

const TEMP_USER_ID = 'temp-user-1';

export class CookingPlanController {
  // List cooking plans
  async list(req: Request, res: Response) {
    const { status } = req.query;
    const plans = await cookingPlanService.listAll(
      TEMP_USER_ID,
      status as string | undefined
    );
    res.json({ status: 'success', data: plans });
  }

  // Get by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const plan = await cookingPlanService.getById(id);
    if (!plan) {
      throw new AppError(404, 'Cooking plan not found');
    }
    res.json({ status: 'success', data: plan });
  }

  // Create
  async create(req: Request, res: Response) {
    const validatedData = createCookingPlanSchema.parse(req.body);
    const plan = await cookingPlanService.create(TEMP_USER_ID, validatedData);
    res.status(201).json({ status: 'success', data: plan });
  }

  // Update
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateCookingPlanSchema.parse(req.body);
    try {
      const plan = await cookingPlanService.update(
        id,
        TEMP_USER_ID,
        validatedData
      );
      if (!plan) {
        throw new AppError(404, 'Cooking plan not found');
      }
      res.json({ status: 'success', data: plan });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Permission denied');
      }
      throw error;
    }
  }

  // Soft delete
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const plan = await cookingPlanService.softDelete(id, TEMP_USER_ID);
      if (!plan) {
        throw new AppError(404, 'Cooking plan not found');
      }
      res.json({ status: 'success', data: plan });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Permission denied');
      }
      throw error;
    }
  }

  // Permanent delete
  async permanentDelete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const deleted = await cookingPlanService.permanentDelete(
        id,
        TEMP_USER_ID
      );
      if (!deleted) {
        throw new AppError(404, 'Cooking plan not found');
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Permission denied');
      }
      throw error;
    }
  }

  // Restore
  async restore(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const plan = await cookingPlanService.restore(id, TEMP_USER_ID);
      if (!plan) {
        throw new AppError(404, 'Cooking plan not found');
      }
      res.json({ status: 'success', data: plan });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Permission denied');
      }
      throw error;
    }
  }
}

export const cookingPlanController = new CookingPlanController();
