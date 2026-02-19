import { PrismaClient } from '@prisma/client';
import { CreateRecipeInput, UpdateRecipeInput, ListRecipesQuery } from '../validators/recipe.validator.js';
import { autoTagRecipe } from '../utils/autoTagger.js';

const prisma = new PrismaClient();

export class RecipeService {
  // Create a new recipe
  async createRecipe(userId: string, data: CreateRecipeInput) {
    const { ingredients, nutrition, instructions, tags, ...recipeData } = data;

    // Convert arrays to strings for SQLite
    const instructionsString = JSON.stringify(instructions);

    // Auto-assign tags for missing categories + source site tag
    const enrichedTags = autoTagRecipe({
      title: recipeData.title,
      description: recipeData.description || '',
      ingredientNames: ingredients.map(i => i.name),
      prepTime: recipeData.prepTime || 0,
      cookTime: recipeData.cookTime || 0,
      existingTags: tags,
      sourceUrl: recipeData.sourceUrl || undefined,
    });
    const tagsString = enrichedTags.join(',');

    // Deduplicate ingredients by name - combine quantities if same unit, keep first if different units
    const deduplicatedIngredients = this.deduplicateIngredients(ingredients);

    // Create recipe with ingredients and nutrition
    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        userId,
        instructions: instructionsString,
        tags: tagsString,
        ingredients: {
          create: await Promise.all(
            deduplicatedIngredients.map(async (ing) => {
              const ingredientName = ing.name.toLowerCase().trim();

              // Upsert ingredient to avoid race conditions with duplicate names
              const ingredient = await prisma.ingredient.upsert({
                where: { name: ingredientName },
                update: {},
                create: { name: ingredientName },
              });

              return {
                ingredientId: ingredient.id,
                quantity: Math.round(ing.quantity * 100) / 100, // Round to 2 decimal places
                unit: ing.unit,
                notes: ing.notes,
              };
            })
          ),
        },
        nutrition: nutrition
          ? {
              create: nutrition,
            }
          : undefined,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        nutrition: true,
      },
    });

    return this.formatRecipe(recipe);
  }

  // Get recipe by ID
  async getRecipeById(recipeId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        nutrition: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!recipe) {
      return null;
    }

    return this.formatRecipe(recipe);
  }

  // List recipes with search and pagination
  async listRecipes(query: ListRecipesQuery) {
    const { search, tags, status, limit, offset } = query;

    const where: any = {};

    // Filter by status (default to active)
    where.status = status || 'active';

    // Search by title, description, or tags
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      where.AND = tagArray.map((tag) => ({
        tags: { contains: tag },
      }));
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
          nutrition: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.recipe.count({ where }),
    ]);

    return {
      recipes: recipes.map((r) => this.formatRecipe(r)),
      total,
      limit,
      offset,
    };
  }

  // Update recipe
  async updateRecipe(recipeId: string, userId: string, data: UpdateRecipeInput) {
    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      return null;
    }

    if (existingRecipe.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const { ingredients, nutrition, instructions, tags, ...recipeData } = data;

    // Prepare update data
    const updateData: any = { ...recipeData };

    if (instructions) {
      updateData.instructions = JSON.stringify(instructions);
    }

    if (tags) {
      updateData.tags = tags.join(',');
    }

    // Update recipe
    await prisma.recipe.update({
      where: { id: recipeId },
      data: updateData,
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        nutrition: true,
      },
    });

    // Update ingredients if provided
    if (ingredients) {
      // Delete existing ingredients
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId },
      });

      // Deduplicate ingredients
      const deduplicatedIngredients = this.deduplicateIngredients(ingredients);

      // Create new ingredients
      await Promise.all(
        deduplicatedIngredients.map(async (ing) => {
          const ingredientName = ing.name.toLowerCase().trim();

          // Upsert ingredient to avoid race conditions with duplicate names
          const ingredient = await prisma.ingredient.upsert({
            where: { name: ingredientName },
            update: {},
            create: { name: ingredientName },
          });

          await prisma.recipeIngredient.create({
            data: {
              recipeId,
              ingredientId: ingredient.id,
              quantity: Math.round(ing.quantity * 100) / 100, // Round to 2 decimal places
              unit: ing.unit,
              notes: ing.notes,
            },
          });
        })
      );
    }

    // Update nutrition if provided
    if (nutrition) {
      await prisma.recipeNutrition.upsert({
        where: { recipeId },
        create: {
          recipeId,
          ...nutrition,
        },
        update: nutrition,
      });
    }

    // Fetch updated recipe
    return this.getRecipeById(recipeId);
  }

  // Delete recipe (soft delete - mark as deleted)
  async deleteRecipe(recipeId: string, userId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return false;
    }

    if (recipe.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.recipe.update({
      where: { id: recipeId },
      data: { status: 'deleted' },
    });

    return true;
  }

  // Restore recipe (mark as active)
  async restoreRecipe(recipeId: string, userId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return null;
    }

    if (recipe.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return await prisma.recipe.update({
      where: { id: recipeId },
      data: { status: 'active' },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        nutrition: true,
      },
    });
  }

  // Permanent delete recipe (actually remove from database)
  async permanentDeleteRecipe(recipeId: string, userId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return false;
    }

    if (recipe.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.recipe.delete({
      where: { id: recipeId },
    });

    return true;
  }

  // Bulk create recipes
  async bulkCreateRecipes(userId: string, recipes: any[]) {
    const createdRecipes = [];

    for (const recipeData of recipes) {
      try {
        const recipe = await this.createRecipe(userId, recipeData);
        createdRecipes.push(recipe);
      } catch (error) {
        console.error(`Failed to import recipe: ${recipeData.title}`, error);
      }
    }

    return createdRecipes;
  }

  // Bulk delete recipes
  async bulkDeleteRecipes(recipeIds: string[], userId: string) {
    const recipes = await prisma.recipe.findMany({
      where: {
        id: { in: recipeIds },
        userId,
      },
    });

    if (recipes.length === 0) {
      return 0;
    }

    await prisma.recipe.deleteMany({
      where: {
        id: { in: recipes.map(r => r.id) },
      },
    });

    return recipes.length;
  }

  // Deduplicate ingredients by name within a single recipe
  // If same ingredient appears with same unit, quantities are summed
  // If same ingredient appears with different units, the first occurrence is kept
  private deduplicateIngredients(ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string }>) {
    const seen = new Map<string, { name: string; quantity: number; unit: string; notes?: string }>();

    for (const ing of ingredients) {
      const key = ing.name.toLowerCase().trim();
      const existing = seen.get(key);

      if (existing) {
        // Same ingredient found - combine if same unit
        if (existing.unit.toLowerCase() === ing.unit.toLowerCase()) {
          existing.quantity += ing.quantity;
          // Merge notes
          if (ing.notes && ing.notes !== existing.notes) {
            existing.notes = [existing.notes, ing.notes].filter(Boolean).join(', ');
          }
        }
        // If different units, keep the first occurrence (skip duplicate)
      } else {
        seen.set(key, { ...ing });
      }
    }

    return Array.from(seen.values());
  }

  // Helper to format recipe (parse JSON strings back to arrays)
  private formatRecipe(recipe: any) {
    return {
      ...recipe,
      instructions: JSON.parse(recipe.instructions),
      tags: recipe.tags ? recipe.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
    };
  }
}

export const recipeService = new RecipeService();
