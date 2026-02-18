import { Request, Response } from 'express';
import { recipeService } from '../services/recipe.service.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
} from '../validators/recipe.validator.js';
import { AppError } from '../middleware/errorHandler.js';

// Temporary: For now, we'll use a hardcoded user ID
// In a real app, this would come from authentication middleware
const TEMP_USER_ID = 'temp-user-1';

export class RecipeController {
  // Create a new recipe
  async create(req: Request, res: Response) {
    const validatedData = createRecipeSchema.parse(req.body);
    const recipe = await recipeService.createRecipe(TEMP_USER_ID, validatedData);

    res.status(201).json({
      status: 'success',
      data: recipe,
    });
  }

  // Get recipe by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const recipe = await recipeService.getRecipeById(id);

    if (!recipe) {
      throw new AppError(404, 'Recipe not found');
    }

    res.json({
      status: 'success',
      data: recipe,
    });
  }

  // List recipes with search and pagination
  async list(req: Request, res: Response) {
    const query = listRecipesQuerySchema.parse(req.query);
    const result = await recipeService.listRecipes(query);

    res.json({
      status: 'success',
      data: result.recipes,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    });
  }

  // Update recipe
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateRecipeSchema.parse(req.body);

    try {
      const recipe = await recipeService.updateRecipe(id, TEMP_USER_ID, validatedData);

      if (!recipe) {
        throw new AppError(404, 'Recipe not found');
      }

      res.json({
        status: 'success',
        data: recipe,
      });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to update this recipe');
      }
      throw error;
    }
  }

  // Delete recipe
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const deleted = await recipeService.deleteRecipe(id, TEMP_USER_ID);

      if (!deleted) {
        throw new AppError(404, 'Recipe not found');
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to delete this recipe');
      }
      throw error;
    }
  }

  // Bulk import recipes
  async bulkImport(req: Request, res: Response) {
    const recipes = req.body.recipes;

    if (!Array.isArray(recipes)) {
      throw new AppError(400, 'Expected an array of recipes');
    }

    const results = await recipeService.bulkCreateRecipes(TEMP_USER_ID, recipes);

    res.status(201).json({
      status: 'success',
      data: {
        imported: results.length,
        recipes: results,
      },
    });
  }

  // Bulk delete recipes
  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      throw new AppError(400, 'Expected an array of recipe IDs');
    }

    const deleted = await recipeService.bulkDeleteRecipes(ids, TEMP_USER_ID);

    res.json({
      status: 'success',
      data: {
        deleted,
      },
    });
  }

  // Restore recipe
  async restore(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const recipe = await recipeService.restoreRecipe(id, TEMP_USER_ID);

      if (!recipe) {
        throw new AppError(404, 'Recipe not found');
      }

      res.json({
        status: 'success',
        data: recipe,
      });
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to restore this recipe');
      }
      throw error;
    }
  }

  // Permanent delete recipe
  async permanentDelete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const deleted = await recipeService.permanentDeleteRecipe(id, TEMP_USER_ID);

      if (!deleted) {
        throw new AppError(404, 'Recipe not found');
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'You do not have permission to permanently delete this recipe');
      }
      throw error;
    }
  }
}

export const recipeController = new RecipeController();
