import { Request, Response } from 'express';
import { aiRecipeService } from '../services/aiRecipe.service.js';
import { generateRecipeSuggestionsSchema } from '../validators/aiRecipe.validator.js';

const TEMP_USER_ID = 'temp-user-1';

export class AIRecipeController {
  // Generate recipe suggestions from concept + preferences
  async generateSuggestions(req: Request, res: Response) {
    const input = generateRecipeSuggestionsSchema.parse(req.body);

    const suggestions = await aiRecipeService.generateRecipeSuggestions(
      TEMP_USER_ID,
      input
    );

    res.json({
      status: 'success',
      data: suggestions,
    });
  }
}

export const aiRecipeController = new AIRecipeController();
