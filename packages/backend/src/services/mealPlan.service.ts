import { PrismaClient } from '@prisma/client';
import {
  CreateMealPlanInput,
  UpdateMealPlanInput,
  AddRecipeToMealPlanInput,
  UpdateMealPlanRecipeInput,
} from '../validators/mealPlan.validator.js';

const prisma = new PrismaClient();

export class MealPlanService {
  // Create a new meal plan
  async createMealPlan(userId: string, data: CreateMealPlanInput) {
    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
                nutrition: true,
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    return this.formatMealPlan(mealPlan);
  }

  // Get meal plan by ID
  async getMealPlanById(mealPlanId: string) {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
                nutrition: true,
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!mealPlan) {
      return null;
    }

    return this.formatMealPlan(mealPlan);
  }

  // List meal plans for a user
  async listMealPlans(userId: string, status?: string) {
    const where: any = { userId };

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where,
      include: {
        meals: {
          include: {
            recipe: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return mealPlans.map((mp) => this.formatMealPlan(mp));
  }

  // Update meal plan
  async updateMealPlan(mealPlanId: string, userId: string, data: UpdateMealPlanInput) {
    const existingMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!existingMealPlan) {
      return null;
    }

    if (existingMealPlan.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.status) updateData.status = data.status;

    const mealPlan = await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: updateData,
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
                nutrition: true,
              },
            },
          },
        },
      },
    });

    return this.formatMealPlan(mealPlan);
  }

  // Update meal plan status
  async updateMealPlanStatus(mealPlanId: string, userId: string, status: string) {
    const existingMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!existingMealPlan) {
      return null;
    }

    if (existingMealPlan.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const mealPlan = await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: { status },
      include: {
        meals: {
          include: {
            recipe: true,
          },
        },
      },
    });

    return this.formatMealPlan(mealPlan);
  }

  // Delete meal plan
  async deleteMealPlan(mealPlanId: string, userId: string) {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!mealPlan) {
      return false;
    }

    if (mealPlan.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.mealPlan.delete({
      where: { id: mealPlanId },
    });

    return true;
  }

  // Add recipe to meal plan
  async addRecipeToMealPlan(mealPlanId: string, data: AddRecipeToMealPlanInput) {
    const mealPlanRecipe = await prisma.mealPlanRecipe.create({
      data: {
        mealPlanId,
        recipeId: data.recipeId,
        date: new Date(data.date),
        mealType: data.mealType,
        servings: data.servings || 1,
        notes: data.notes,
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
            nutrition: true,
          },
        },
      },
    });

    return this.formatRecipeInMealPlan(mealPlanRecipe);
  }

  // Update meal plan recipe
  async updateMealPlanRecipe(
    mealPlanRecipeId: string,
    data: UpdateMealPlanRecipeInput
  ) {
    const updateData: any = {};
    if (data.date) updateData.date = new Date(data.date);
    if (data.mealType) updateData.mealType = data.mealType;
    if (data.servings !== undefined) updateData.servings = data.servings;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.completed !== undefined) updateData.completed = data.completed;

    const mealPlanRecipe = await prisma.mealPlanRecipe.update({
      where: { id: mealPlanRecipeId },
      data: updateData,
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
            nutrition: true,
          },
        },
      },
    });

    return this.formatRecipeInMealPlan(mealPlanRecipe);
  }

  // Remove recipe from meal plan
  async removeRecipeFromMealPlan(mealPlanRecipeId: string) {
    await prisma.mealPlanRecipe.delete({
      where: { id: mealPlanRecipeId },
    });

    return true;
  }

  // Get nutrition summary for meal plan
  async getMealPlanNutrition(mealPlanId: string) {
    const meals = await prisma.mealPlanRecipe.findMany({
      where: { mealPlanId },
      include: {
        recipe: {
          include: {
            nutrition: true,
          },
        },
      },
    });

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meals.forEach((meal) => {
      if (meal.recipe.nutrition) {
        const multiplier = meal.servings / meal.recipe.servings;
        totalCalories += (meal.recipe.nutrition.calories || 0) * multiplier;
        totalProtein += (meal.recipe.nutrition.protein || 0) * multiplier;
        totalCarbs += (meal.recipe.nutrition.carbs || 0) * multiplier;
        totalFat += (meal.recipe.nutrition.fat || 0) * multiplier;
      }
    });

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      mealsCount: meals.length,
    };
  }

  // Helper to format meal plan (parse recipe instructions and tags)
  private formatMealPlan(mealPlan: any) {
    return {
      ...mealPlan,
      meals: mealPlan.meals.map((meal: any) => this.formatRecipeInMealPlan(meal)),
    };
  }

  // Helper to format recipe in meal plan
  private formatRecipeInMealPlan(mealPlanRecipe: any) {
    if (mealPlanRecipe.recipe) {
      return {
        ...mealPlanRecipe,
        recipe: {
          ...mealPlanRecipe.recipe,
          instructions: JSON.parse(mealPlanRecipe.recipe.instructions),
          tags: mealPlanRecipe.recipe.tags
            ? mealPlanRecipe.recipe.tags.split(',').filter((t: string) => t)
            : [],
        },
      };
    }
    return mealPlanRecipe;
  }
}

export const mealPlanService = new MealPlanService();
