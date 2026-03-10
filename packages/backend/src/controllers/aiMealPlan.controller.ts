import { Request, Response } from 'express';
import { aiMealPlanService } from '../services/aiMealPlan.service.js';
import {
  generateMealPlanSchema,
  swapMealSchema,
  generateRecipeDetailsSchema,
} from '../validators/mealPlanPreference.validator.js';

const TEMP_USER_ID = 'temp-user-1';

export class AIMealPlanController {
  // Generate a meal plan from preferences
  async generate(req: Request, res: Response) {
    const { preferenceId, startDate, endDate, pinnedMeals } = generateMealPlanSchema.parse(req.body);

    const plan = await aiMealPlanService.generatePlan(
      TEMP_USER_ID,
      preferenceId,
      startDate,
      endDate,
      pinnedMeals
    );

    res.json({
      status: 'success',
      data: plan,
    });
  }

  // Get alternative meals for swapping
  async swap(req: Request, res: Response) {
    const { preferenceId, date, mealType, currentRecipeTitle, existingPlanContext } =
      swapMealSchema.parse(req.body);

    const result = await aiMealPlanService.swapMeal(
      TEMP_USER_ID,
      preferenceId,
      date,
      mealType,
      currentRecipeTitle,
      existingPlanContext
    );

    res.json({
      status: 'success',
      data: result,
    });
  }

  // Generate full recipe details for an AI-suggested dish
  async generateRecipeDetails(req: Request, res: Response) {
    const { title, description, servings, cuisineHint } =
      generateRecipeDetailsSchema.parse(req.body);

    const recipe = await aiMealPlanService.generateRecipeDetails(
      TEMP_USER_ID,
      title,
      description,
      servings,
      cuisineHint
    );

    res.json({
      status: 'success',
      data: recipe,
    });
  }
}

export const aiMealPlanController = new AIMealPlanController();
