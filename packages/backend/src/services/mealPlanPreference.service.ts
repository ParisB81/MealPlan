import { PrismaClient } from '@prisma/client';
import { CreatePreferenceInput, UpdatePreferenceInput } from '../validators/mealPlanPreference.validator.js';

const prisma = new PrismaClient();

export class MealPlanPreferenceService {
  // Create a new preference profile
  async create(userId: string, data: CreatePreferenceInput) {
    const preference = await prisma.mealPlanPreference.create({
      data: {
        userId,
        name: data.name,
        recipeSource: data.recipeSource,
        dietaryRestrictions: JSON.stringify(data.dietaryRestrictions),
        cuisinePreferences: JSON.stringify(data.cuisinePreferences),
        allergies: JSON.stringify(data.allergies),
        ingredientLikes: data.ingredientLikes,
        ingredientDislikes: data.ingredientDislikes,
        weekdayMaxPrep: data.weekdayMaxPrep ?? null,
        weekdayMaxCook: data.weekdayMaxCook ?? null,
        weekendMaxPrep: data.weekendMaxPrep ?? null,
        weekendMaxCook: data.weekendMaxCook ?? null,
        caloriesMin: data.caloriesMin ?? null,
        caloriesMax: data.caloriesMax ?? null,
        proteinPercent: data.proteinPercent ?? null,
        carbsPercent: data.carbsPercent ?? null,
        fatPercent: data.fatPercent ?? null,
        cookDaysPerWeek: data.cookDaysPerWeek ?? null,
        cookingFreeDays: data.cookingFreeDays ?? '',
        quickMealMaxMinutes: data.quickMealMaxMinutes ?? null,
        defaultServings: data.defaultServings ?? 4,
        preferredMethods: JSON.stringify(data.preferredMethods ?? []),
        durationWeeks: data.durationWeeks,
        durationDays: data.durationDays ?? null,
        repeatWeekly: data.repeatWeekly,
        mealVariety: data.mealVariety,
        includedMeals: data.includedMeals.join(','),
      },
    });

    return this.formatPreference(preference);
  }

  // Get preference by ID
  async getById(id: string) {
    const preference = await prisma.mealPlanPreference.findUnique({
      where: { id },
    });

    if (!preference) return null;
    return this.formatPreference(preference);
  }

  // List all preference profiles for a user
  async list(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    } else {
      where.status = 'active';
    }

    const preferences = await prisma.mealPlanPreference.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return preferences.map(p => this.formatPreference(p));
  }

  // Update preference profile
  async update(id: string, userId: string, data: UpdatePreferenceInput) {
    // Verify ownership
    const existing = await prisma.mealPlanPreference.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.recipeSource !== undefined) updateData.recipeSource = data.recipeSource;
    if (data.dietaryRestrictions !== undefined) updateData.dietaryRestrictions = JSON.stringify(data.dietaryRestrictions);
    if (data.cuisinePreferences !== undefined) updateData.cuisinePreferences = JSON.stringify(data.cuisinePreferences);
    if (data.allergies !== undefined) updateData.allergies = JSON.stringify(data.allergies);
    if (data.ingredientLikes !== undefined) updateData.ingredientLikes = data.ingredientLikes;
    if (data.ingredientDislikes !== undefined) updateData.ingredientDislikes = data.ingredientDislikes;
    if (data.weekdayMaxPrep !== undefined) updateData.weekdayMaxPrep = data.weekdayMaxPrep;
    if (data.weekdayMaxCook !== undefined) updateData.weekdayMaxCook = data.weekdayMaxCook;
    if (data.weekendMaxPrep !== undefined) updateData.weekendMaxPrep = data.weekendMaxPrep;
    if (data.weekendMaxCook !== undefined) updateData.weekendMaxCook = data.weekendMaxCook;
    if (data.caloriesMin !== undefined) updateData.caloriesMin = data.caloriesMin;
    if (data.caloriesMax !== undefined) updateData.caloriesMax = data.caloriesMax;
    if (data.proteinPercent !== undefined) updateData.proteinPercent = data.proteinPercent;
    if (data.carbsPercent !== undefined) updateData.carbsPercent = data.carbsPercent;
    if (data.fatPercent !== undefined) updateData.fatPercent = data.fatPercent;
    if (data.cookDaysPerWeek !== undefined) updateData.cookDaysPerWeek = data.cookDaysPerWeek;
    if (data.cookingFreeDays !== undefined) updateData.cookingFreeDays = data.cookingFreeDays;
    if (data.quickMealMaxMinutes !== undefined) updateData.quickMealMaxMinutes = data.quickMealMaxMinutes;
    if (data.defaultServings !== undefined) updateData.defaultServings = data.defaultServings;
    if (data.preferredMethods !== undefined) updateData.preferredMethods = JSON.stringify(data.preferredMethods);
    if (data.durationWeeks !== undefined) updateData.durationWeeks = data.durationWeeks;
    if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;
    if (data.repeatWeekly !== undefined) updateData.repeatWeekly = data.repeatWeekly;
    if (data.mealVariety !== undefined) updateData.mealVariety = data.mealVariety;
    if (data.includedMeals !== undefined) updateData.includedMeals = data.includedMeals.join(',');

    const preference = await prisma.mealPlanPreference.update({
      where: { id },
      data: updateData,
    });

    return this.formatPreference(preference);
  }

  // Soft delete preference profile
  async delete(id: string, userId: string) {
    const existing = await prisma.mealPlanPreference.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    await prisma.mealPlanPreference.update({
      where: { id },
      data: { status: 'deleted' },
    });

    return true;
  }

  // Format DB row to API response (parse JSON strings back to arrays)
  private formatPreference(preference: any) {
    return {
      ...preference,
      dietaryRestrictions: JSON.parse(preference.dietaryRestrictions || '[]'),
      cuisinePreferences: JSON.parse(preference.cuisinePreferences || '[]'),
      allergies: JSON.parse(preference.allergies || '[]'),
      preferredMethods: JSON.parse(preference.preferredMethods || '[]'),
      includedMeals: preference.includedMeals ? preference.includedMeals.split(',') : ['breakfast', 'lunch', 'dinner'],
    };
  }
}

export const mealPlanPreferenceService = new MealPlanPreferenceService();
