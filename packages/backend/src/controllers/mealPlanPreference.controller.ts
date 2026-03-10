import { Request, Response } from 'express';
import { mealPlanPreferenceService } from '../services/mealPlanPreference.service.js';
import {
  createPreferenceSchema,
  updatePreferenceSchema,
} from '../validators/mealPlanPreference.validator.js';
import { AppError } from '../middleware/errorHandler.js';

const TEMP_USER_ID = 'temp-user-1';

export class MealPlanPreferenceController {
  // Create a new preference profile
  async create(req: Request, res: Response) {
    const validatedData = createPreferenceSchema.parse(req.body);
    const preference = await mealPlanPreferenceService.create(TEMP_USER_ID, validatedData);

    res.status(201).json({
      status: 'success',
      data: preference,
    });
  }

  // Get preference by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const preference = await mealPlanPreferenceService.getById(id);

    if (!preference) {
      throw new AppError(404, 'Preference profile not found');
    }

    res.json({
      status: 'success',
      data: preference,
    });
  }

  // List preference profiles
  async list(req: Request, res: Response) {
    const { status } = req.query;
    const preferences = await mealPlanPreferenceService.list(
      TEMP_USER_ID,
      status as string | undefined
    );

    res.json({
      status: 'success',
      data: preferences,
    });
  }

  // Update preference profile
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updatePreferenceSchema.parse(req.body);

    try {
      const preference = await mealPlanPreferenceService.update(id, TEMP_USER_ID, validatedData);

      if (!preference) {
        throw new AppError(404, 'Preference profile not found');
      }

      res.json({
        status: 'success',
        data: preference,
      });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to update this preference');
      }
      throw error;
    }
  }

  // Soft delete preference profile
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const deleted = await mealPlanPreferenceService.delete(id, TEMP_USER_ID);

      if (!deleted) {
        throw new AppError(404, 'Preference profile not found');
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to delete this preference');
      }
      throw error;
    }
  }
}

export const mealPlanPreferenceController = new MealPlanPreferenceController();
