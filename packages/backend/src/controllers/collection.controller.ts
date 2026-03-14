import { Request, Response } from 'express';
import { collectionService } from '../services/collection.service.js';
import {
  createCollectionSchema,
  updateCollectionSchema,
  addRecipeToCollectionSchema,
  addRecipesToCollectionSchema,
} from '../validators/collection.validator.js';
import { AppError } from '../middleware/errorHandler.js';

const TEMP_USER_ID = 'temp-user-1';

export class CollectionController {
  // GET / — List collections
  async list(req: Request, res: Response) {
    const { status } = req.query;
    const collections = await collectionService.listAll(TEMP_USER_ID, status as string | undefined);
    res.json({ status: 'success', data: collections });
  }

  // GET /:id — Get collection with recipes
  async getById(req: Request, res: Response) {
    const collection = await collectionService.getById(req.params.id);
    if (!collection) throw new AppError(404, 'Collection not found');
    res.json({ status: 'success', data: collection });
  }

  // POST / — Create collection
  async create(req: Request, res: Response) {
    const data = createCollectionSchema.parse(req.body);
    const collection = await collectionService.create(TEMP_USER_ID, data);
    res.status(201).json({ status: 'success', data: collection });
  }

  // PUT /:id — Update collection
  async update(req: Request, res: Response) {
    const data = updateCollectionSchema.parse(req.body);
    try {
      const collection = await collectionService.update(req.params.id, TEMP_USER_ID, data);
      if (!collection) throw new AppError(404, 'Collection not found');
      res.json({ status: 'success', data: collection });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // DELETE /:id — Soft delete
  async delete(req: Request, res: Response) {
    try {
      const collection = await collectionService.softDelete(req.params.id, TEMP_USER_ID);
      if (!collection) throw new AppError(404, 'Collection not found');
      res.json({ status: 'success', data: collection });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // DELETE /:id/permanent — Hard delete
  async permanentDelete(req: Request, res: Response) {
    try {
      const deleted = await collectionService.permanentDelete(req.params.id, TEMP_USER_ID);
      if (!deleted) throw new AppError(404, 'Collection not found');
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // POST /:id/restore — Restore
  async restore(req: Request, res: Response) {
    try {
      const collection = await collectionService.restore(req.params.id, TEMP_USER_ID);
      if (!collection) throw new AppError(404, 'Collection not found');
      res.json({ status: 'success', data: collection });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // POST /:id/recipes — Add recipe to collection
  async addRecipe(req: Request, res: Response) {
    const { recipeId } = addRecipeToCollectionSchema.parse(req.body);
    try {
      const item = await collectionService.addRecipe(req.params.id, recipeId, TEMP_USER_ID);
      if (!item) throw new AppError(404, 'Collection not found');
      res.status(201).json({ status: 'success', data: item });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      if (error.message === 'Recipe already in collection') throw new AppError(409, error.message);
      throw error;
    }
  }

  // POST /:id/recipes/batch — Add multiple recipes
  async addRecipes(req: Request, res: Response) {
    const { recipeIds } = addRecipesToCollectionSchema.parse(req.body);
    try {
      const result = await collectionService.addRecipes(req.params.id, recipeIds, TEMP_USER_ID);
      if (!result) throw new AppError(404, 'Collection not found');
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // DELETE /:id/recipes/:recipeId — Remove recipe from collection
  async removeRecipe(req: Request, res: Response) {
    const { id, recipeId } = req.params;
    try {
      const removed = await collectionService.removeRecipe(id, recipeId, TEMP_USER_ID);
      if (!removed) throw new AppError(404, 'Collection not found');
      res.json({ status: 'success', data: { removed: true } });
    } catch (error: any) {
      if (error.message === 'Unauthorized') throw new AppError(403, 'Permission denied');
      throw error;
    }
  }

  // GET /recipe/:recipeId/collections — Get collections for a recipe
  async getCollectionsForRecipe(req: Request, res: Response) {
    const collections = await collectionService.getCollectionsForRecipe(
      req.params.recipeId,
      TEMP_USER_ID
    );
    res.json({ status: 'success', data: collections });
  }
}

export const collectionController = new CollectionController();
