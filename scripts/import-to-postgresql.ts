/**
 * Import data from JSON files into PostgreSQL database.
 * Run this AFTER:
 * 1. Exporting SQLite data with: npx tsx scripts/export-sqlite-data.ts
 * 2. Switching to PostgreSQL schema
 * 3. Running migrations: npx prisma migrate dev
 *
 * Usage: npx tsx scripts/import-to-postgresql.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportedRecipe {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
  instructions: string;
  tags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  ingredients: Array<{
    id: string;
    recipeId: string;
    ingredientId: string;
    quantity: number;
    unit: string;
    notes: string | null;
  }>;
  nutrition: {
    id: string;
    recipeId: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
  } | null;
}

async function importData() {
  console.log('📥 Importing data to PostgreSQL...\n');

  const exportDir = path.join(__dirname, '..', 'data-export');

  if (!fs.existsSync(exportDir)) {
    console.error('❌ Export directory not found. Run export-sqlite-data.ts first.');
    process.exit(1);
  }

  try {
    // 1. Import Users
    console.log('Importing users...');
    const usersFile = path.join(exportDir, 'users.json');
    if (fs.existsSync(usersFile)) {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      for (const user of users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: null, // Will be set when user registers
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
      }
      console.log(`✅ Users: ${users.length} imported`);
    }

    // 2. Import Ingredients (global)
    console.log('Importing ingredients...');
    const ingredientsFile = path.join(exportDir, 'ingredients.json');
    if (fs.existsSync(ingredientsFile)) {
      const ingredients = JSON.parse(fs.readFileSync(ingredientsFile, 'utf-8'));
      for (const ing of ingredients) {
        await prisma.ingredient.upsert({
          where: { id: ing.id },
          update: {},
          create: {
            id: ing.id,
            name: ing.name,
            category: ing.category,
            tags: ing.tags || '',
            createdAt: new Date(ing.createdAt),
          },
        });
      }
      console.log(`✅ Ingredients: ${ingredients.length} imported`);
    }

    // 3. Import Recipes with ingredients and nutrition
    console.log('Importing recipes...');
    const recipesFile = path.join(exportDir, 'recipes.json');
    if (fs.existsSync(recipesFile)) {
      const recipes: ExportedRecipe[] = JSON.parse(fs.readFileSync(recipesFile, 'utf-8'));
      for (const recipe of recipes) {
        // Create recipe
        await prisma.recipe.upsert({
          where: { id: recipe.id },
          update: {},
          create: {
            id: recipe.id,
            userId: recipe.userId,
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            imageUrl: recipe.imageUrl,
            instructions: recipe.instructions,
            tags: recipe.tags,
            status: recipe.status,
            createdAt: new Date(recipe.createdAt),
            updatedAt: new Date(recipe.updatedAt),
          },
        });

        // Create recipe ingredients
        for (const ing of recipe.ingredients || []) {
          await prisma.recipeIngredient.upsert({
            where: { id: ing.id },
            update: {},
            create: {
              id: ing.id,
              recipeId: ing.recipeId,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
            },
          });
        }

        // Create nutrition if exists
        if (recipe.nutrition) {
          await prisma.recipeNutrition.upsert({
            where: { id: recipe.nutrition.id },
            update: {},
            create: {
              id: recipe.nutrition.id,
              recipeId: recipe.nutrition.recipeId,
              calories: recipe.nutrition.calories,
              protein: recipe.nutrition.protein,
              carbs: recipe.nutrition.carbs,
              fat: recipe.nutrition.fat,
              fiber: recipe.nutrition.fiber,
              sugar: recipe.nutrition.sugar,
              sodium: recipe.nutrition.sodium,
            },
          });
        }
      }
      console.log(`✅ Recipes: ${recipes.length} imported`);
    }

    // 4. Import Meal Plans with meals
    console.log('Importing meal plans...');
    const mealPlansFile = path.join(exportDir, 'mealPlans.json');
    if (fs.existsSync(mealPlansFile)) {
      const mealPlans = JSON.parse(fs.readFileSync(mealPlansFile, 'utf-8'));
      for (const plan of mealPlans) {
        await prisma.mealPlan.upsert({
          where: { id: plan.id },
          update: {},
          create: {
            id: plan.id,
            userId: plan.userId,
            name: plan.name,
            startDate: new Date(plan.startDate),
            endDate: new Date(plan.endDate),
            status: plan.status,
            createdAt: new Date(plan.createdAt),
            updatedAt: new Date(plan.updatedAt),
          },
        });

        // Import meals
        for (const meal of plan.recipes || []) {
          await prisma.mealPlanRecipe.upsert({
            where: { id: meal.id },
            update: {},
            create: {
              id: meal.id,
              mealPlanId: meal.mealPlanId,
              recipeId: meal.recipeId,
              date: new Date(meal.date),
              mealType: meal.mealType,
              servings: meal.servings,
              notes: meal.notes,
              completed: meal.completed,
            },
          });
        }
      }
      console.log(`✅ Meal Plans: ${mealPlans.length} imported`);
    }

    // 5. Import Shopping Lists with items
    console.log('Importing shopping lists...');
    const shoppingListsFile = path.join(exportDir, 'shoppingLists.json');
    if (fs.existsSync(shoppingListsFile)) {
      const shoppingLists = JSON.parse(fs.readFileSync(shoppingListsFile, 'utf-8'));
      for (const list of shoppingLists) {
        // Get userId from meal plan if available, otherwise use default
        let userId = 'temp-user-1'; // Default user
        if (list.mealPlanId) {
          const mealPlan = await prisma.mealPlan.findUnique({
            where: { id: list.mealPlanId },
          });
          if (mealPlan) {
            userId = mealPlan.userId;
          }
        }

        await prisma.shoppingList.upsert({
          where: { id: list.id },
          update: {},
          create: {
            id: list.id,
            userId: userId,
            name: list.name,
            mealPlanId: list.mealPlanId,
            status: list.status,
            createdAt: new Date(list.createdAt),
            updatedAt: new Date(list.updatedAt),
          },
        });

        // Import items
        for (const item of list.items || []) {
          await prisma.shoppingListItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
              id: item.id,
              shoppingListId: item.shoppingListId,
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              unit: item.unit,
              checked: item.checked,
            },
          });
        }
      }
      console.log(`✅ Shopping Lists: ${shoppingLists.length} imported`);
    }

    // 6. Import Cooking Plans
    console.log('Importing cooking plans...');
    const cookingPlansFile = path.join(exportDir, 'cookingPlans.json');
    if (fs.existsSync(cookingPlansFile)) {
      const cookingPlans = JSON.parse(fs.readFileSync(cookingPlansFile, 'utf-8'));
      for (const plan of cookingPlans) {
        await prisma.cookingPlan.upsert({
          where: { id: plan.id },
          update: {},
          create: {
            id: plan.id,
            userId: plan.userId,
            name: plan.name,
            mealPlanIds: plan.mealPlanIds,
            cookDays: plan.cookDays,
            status: plan.status,
            createdAt: new Date(plan.createdAt),
            updatedAt: new Date(plan.updatedAt),
          },
        });
      }
      console.log(`✅ Cooking Plans: ${cookingPlans.length} imported`);
    }

    console.log('\n🎉 Import complete!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
