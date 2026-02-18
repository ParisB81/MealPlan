import { Request, Response } from 'express';
import { mealPlanService } from '../services/mealPlan.service.js';
import {
  createMealPlanSchema,
  updateMealPlanSchema,
  addRecipeToMealPlanSchema,
  updateMealPlanRecipeSchema,
  updateMealPlanStatusSchema,
} from '../validators/mealPlan.validator.js';
import { AppError } from '../middleware/errorHandler.js';

// Temporary: For now, we'll use a hardcoded user ID
const TEMP_USER_ID = 'temp-user-1';

export class MealPlanController {
  // Create a new meal plan
  async create(req: Request, res: Response) {
    const validatedData = createMealPlanSchema.parse(req.body);
    const mealPlan = await mealPlanService.createMealPlan(TEMP_USER_ID, validatedData);

    res.status(201).json({
      status: 'success',
      data: mealPlan,
    });
  }

  // Get meal plan by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const mealPlan = await mealPlanService.getMealPlanById(id);

    if (!mealPlan) {
      throw new AppError(404, 'Meal plan not found');
    }

    res.json({
      status: 'success',
      data: mealPlan,
    });
  }

  // List meal plans
  async list(req: Request, res: Response) {
    const { status } = req.query;
    const mealPlans = await mealPlanService.listMealPlans(
      TEMP_USER_ID,
      status as string | undefined
    );

    res.json({
      status: 'success',
      data: mealPlans,
    });
  }

  // Update meal plan
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateMealPlanSchema.parse(req.body);

    try {
      const mealPlan = await mealPlanService.updateMealPlan(id, TEMP_USER_ID, validatedData);

      if (!mealPlan) {
        throw new AppError(404, 'Meal plan not found');
      }

      res.json({
        status: 'success',
        data: mealPlan,
      });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to update this meal plan');
      }
      throw error;
    }
  }

  // Delete meal plan
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const deleted = await mealPlanService.deleteMealPlan(id, TEMP_USER_ID);

      if (!deleted) {
        throw new AppError(404, 'Meal plan not found');
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to delete this meal plan');
      }
      throw error;
    }
  }

  // Add recipe to meal plan
  async addRecipe(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = addRecipeToMealPlanSchema.parse(req.body);

    const mealPlanRecipe = await mealPlanService.addRecipeToMealPlan(id, validatedData);

    res.status(201).json({
      status: 'success',
      data: mealPlanRecipe,
    });
  }

  // Update meal plan recipe
  async updateRecipe(req: Request, res: Response) {
    const { recipeId } = req.params;
    const validatedData = updateMealPlanRecipeSchema.parse(req.body);

    const mealPlanRecipe = await mealPlanService.updateMealPlanRecipe(
      recipeId,
      validatedData
    );

    res.json({
      status: 'success',
      data: mealPlanRecipe,
    });
  }

  // Remove recipe from meal plan
  async removeRecipe(req: Request, res: Response) {
    const { recipeId } = req.params;

    await mealPlanService.removeRecipeFromMealPlan(recipeId);

    res.status(204).send();
  }

  // Get nutrition summary for meal plan
  async getNutrition(req: Request, res: Response) {
    const { id } = req.params;

    const nutrition = await mealPlanService.getMealPlanNutrition(id);

    res.json({
      status: 'success',
      data: nutrition,
    });
  }

  // Update meal plan status
  async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateMealPlanStatusSchema.parse(req.body);

    try {
      const mealPlan = await mealPlanService.updateMealPlanStatus(
        id,
        TEMP_USER_ID,
        validatedData.status
      );

      if (!mealPlan) {
        throw new AppError(404, 'Meal plan not found');
      }

      res.json({
        status: 'success',
        data: mealPlan,
      });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to update this meal plan');
      }
      throw error;
    }
  }
}

export const mealPlanController = new MealPlanController();
