import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IngredientController {
  // List all ingredients
  async list(req: Request, res: Response) {
    const { search, category, limit, offset } = req.query;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.name = { contains: search.toLowerCase() };
    }
    if (category && typeof category === 'string') {
      if (category === 'uncategorized') {
        where.OR = [{ category: null }, { category: '' }];
      } else {
        where.category = category;
      }
    }

    // Parse pagination params
    const take = Math.min(Number(limit) || 100, 500); // Default 100, max 500
    const skip = Number(offset) || 0;

    const [ingredients, total] = await Promise.all([
      prisma.ingredient.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      prisma.ingredient.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: ingredients,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + ingredients.length < total,
      },
    });
  }

  // Get ingredient by ID
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      return res.status(404).json({
        status: 'error',
        message: 'Ingredient not found',
      });
    }

    res.json({
      status: 'success',
      data: ingredient,
    });
  }

  // Update ingredient
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, category, tags } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Name is required',
      });
    }

    // Check if ingredient exists
    const existing = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Ingredient not found',
      });
    }

    // Check if new name conflicts with another ingredient
    if (name.toLowerCase() !== existing.name) {
      const duplicate = await prisma.ingredient.findUnique({
        where: { name: name.toLowerCase() },
      });

      if (duplicate) {
        return res.status(400).json({
          status: 'error',
          message: 'An ingredient with this name already exists',
        });
      }
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: {
        name: name.toLowerCase(),
        category: category || null,
        tags: tags || '',
      },
    });

    res.json({
      status: 'success',
      data: updated,
    });
  }

  // Delete ingredient
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    // Check if ingredient is used in any recipes or shopping lists
    const recipeCount = await prisma.recipeIngredient.count({
      where: { ingredientId: id },
    });

    const shoppingListCount = await prisma.shoppingListItem.count({
      where: { ingredientId: id },
    });

    if (recipeCount > 0 || shoppingListCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete ingredient. It is used in ${recipeCount} recipe(s) and ${shoppingListCount} shopping list item(s).`,
        code: 'INGREDIENT_IN_USE',
        data: { recipeCount, shoppingListCount },
      });
    }

    await prisma.ingredient.delete({
      where: { id },
    });

    res.status(204).send();
  }

  // Replace ingredient in all recipes/shopping lists, then delete it
  async replaceAndDelete(req: Request, res: Response) {
    const { id } = req.params;
    const { replacementIngredientId } = req.body;

    if (!replacementIngredientId || typeof replacementIngredientId !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'replacementIngredientId is required',
      });
    }

    if (id === replacementIngredientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot replace an ingredient with itself',
      });
    }

    // Verify both ingredients exist
    const oldIngredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!oldIngredient) {
      return res.status(404).json({
        status: 'error',
        message: 'Ingredient to delete not found',
      });
    }

    const replacementIngredient = await prisma.ingredient.findUnique({ where: { id: replacementIngredientId } });
    if (!replacementIngredient) {
      return res.status(404).json({
        status: 'error',
        message: 'Replacement ingredient not found',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let recipesUpdated = 0;
      let recipesMerged = 0;
      let shoppingListItemsUpdated = 0;

      // Handle RecipeIngredient records
      const oldRecipeIngredients = await tx.recipeIngredient.findMany({
        where: { ingredientId: id },
      });

      for (const ri of oldRecipeIngredients) {
        const existingReplacement = await tx.recipeIngredient.findUnique({
          where: {
            recipeId_ingredientId: {
              recipeId: ri.recipeId,
              ingredientId: replacementIngredientId,
            },
          },
        });

        if (existingReplacement) {
          // Recipe already has the replacement ingredient — delete the old entry
          await tx.recipeIngredient.delete({ where: { id: ri.id } });
          recipesMerged++;
        } else {
          // Update ingredientId to the replacement
          await tx.recipeIngredient.update({
            where: { id: ri.id },
            data: { ingredientId: replacementIngredientId },
          });
          recipesUpdated++;
        }
      }

      // Handle ShoppingListItem records
      const oldShoppingItems = await tx.shoppingListItem.findMany({
        where: { ingredientId: id },
      });

      for (const item of oldShoppingItems) {
        const existingItem = await tx.shoppingListItem.findFirst({
          where: {
            shoppingListId: item.shoppingListId,
            ingredientId: replacementIngredientId,
            unit: item.unit,
          },
        });

        if (existingItem) {
          // Same shopping list already has replacement with same unit — merge quantities
          await tx.shoppingListItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + item.quantity },
          });
          await tx.shoppingListItem.delete({ where: { id: item.id } });
        } else {
          // Update ingredientId to the replacement
          await tx.shoppingListItem.update({
            where: { id: item.id },
            data: { ingredientId: replacementIngredientId },
          });
        }
        shoppingListItemsUpdated++;
      }

      // Delete the old ingredient
      await tx.ingredient.delete({ where: { id } });

      return { recipesUpdated, recipesMerged, shoppingListItemsUpdated };
    });

    res.json({
      status: 'success',
      data: {
        deletedIngredient: oldIngredient.name,
        replacementIngredient: replacementIngredient.name,
        recipesUpdated: result.recipesUpdated,
        recipesMerged: result.recipesMerged,
        shoppingListItemsUpdated: result.shoppingListItemsUpdated,
      },
    });
  }

  // Bulk import ingredients
  async bulkImport(req: Request, res: Response) {
    const { ingredients } = req.body;

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: ingredients must be an array',
      });
    }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const ing of ingredients) {
      const { name, category, tags } = ing;

      if (!name) {
        skipped.push({ name, reason: 'Missing name' });
        continue;
      }

      // Check if ingredient already exists
      const existing = await prisma.ingredient.findUnique({
        where: { name: name.toLowerCase() },
      });

      if (existing) {
        skipped.push({ name, reason: 'Already exists' });
        continue;
      }

      // Create new ingredient
      const newIngredient = await prisma.ingredient.create({
        data: {
          name: name.toLowerCase(),
          category: category || null,
          tags: tags || '',
        },
      });

      created.push(newIngredient);
    }

    res.json({
      status: 'success',
      data: {
        imported: created.length,
        skipped: skipped.length,
        ingredients: created,
        skippedItems: skipped,
      },
    });
  }

  // Bulk delete ingredients
  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: ids must be an array',
      });
    }

    // Check if any ingredients are used in recipes
    const usedInRecipes = await prisma.recipeIngredient.groupBy({
      by: ['ingredientId'],
      where: { ingredientId: { in: ids } },
      _count: true,
    });

    if (usedInRecipes.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete ${usedInRecipes.length} ingredient(s) that are used in recipes.`,
      });
    }

    // Check if any ingredients are used in shopping lists
    const usedInShoppingLists = await prisma.shoppingListItem.groupBy({
      by: ['ingredientId'],
      where: { ingredientId: { in: ids } },
      _count: true,
    });

    if (usedInShoppingLists.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete ${usedInShoppingLists.length} ingredient(s) that are used in shopping lists.`,
      });
    }

    const result = await prisma.ingredient.deleteMany({
      where: { id: { in: ids } },
    });

    res.json({
      status: 'success',
      data: { deleted: result.count },
    });
  }
  // Get all recipes that use a specific ingredient
  async getRecipes(req: Request, res: Response) {
    const { id } = req.params;

    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      return res.status(404).json({ status: 'error', message: 'Ingredient not found' });
    }

    const recipeIngredients = await prisma.recipeIngredient.findMany({
      where: { ingredientId: id },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            status: true,
            servings: true,
            tags: true,
            imageUrl: true,
          },
        },
      },
    });

    // Filter to active recipes only and map to a clean response
    const recipes = recipeIngredients
      .filter((ri) => ri.recipe.status === 'active')
      .map((ri) => ({
        recipeId: ri.recipe.id,
        recipeTitle: ri.recipe.title,
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes,
        servings: ri.recipe.servings,
        tags: ri.recipe.tags,
      }))
      .sort((a, b) => a.recipeTitle.localeCompare(b.recipeTitle));

    res.json({ status: 'success', data: recipes });
  }
}

export const ingredientController = new IngredientController();
