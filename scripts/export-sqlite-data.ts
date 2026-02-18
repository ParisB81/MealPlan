/**
 * Export all data from SQLite database to JSON files.
 * Run this BEFORE migrating to PostgreSQL to preserve your data.
 *
 * Usage: npx tsx scripts/export-sqlite-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  console.log('📦 Exporting data from SQLite...\n');

  const exportDir = path.join(__dirname, '..', 'data-export');

  // Create export directory
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Export Users
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`✅ Users: ${users.length} records`);

    // Export Ingredients
    const ingredients = await prisma.ingredient.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'ingredients.json'),
      JSON.stringify(ingredients, null, 2)
    );
    console.log(`✅ Ingredients: ${ingredients.length} records`);

    // Export Recipes with related data
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: true,
        nutrition: true,
      },
    });
    fs.writeFileSync(
      path.join(exportDir, 'recipes.json'),
      JSON.stringify(recipes, null, 2)
    );
    console.log(`✅ Recipes: ${recipes.length} records`);

    // Export Meal Plans with related data
    const mealPlans = await prisma.mealPlan.findMany({
      include: {
        recipes: true,
      },
    });
    fs.writeFileSync(
      path.join(exportDir, 'mealPlans.json'),
      JSON.stringify(mealPlans, null, 2)
    );
    console.log(`✅ Meal Plans: ${mealPlans.length} records`);

    // Export Shopping Lists with items
    const shoppingLists = await prisma.shoppingList.findMany({
      include: {
        items: true,
      },
    });
    fs.writeFileSync(
      path.join(exportDir, 'shoppingLists.json'),
      JSON.stringify(shoppingLists, null, 2)
    );
    console.log(`✅ Shopping Lists: ${shoppingLists.length} records`);

    // Export Cooking Plans
    const cookingPlans = await prisma.cookingPlan.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'cookingPlans.json'),
      JSON.stringify(cookingPlans, null, 2)
    );
    console.log(`✅ Cooking Plans: ${cookingPlans.length} records`);

    console.log(`\n🎉 Export complete! Data saved to: ${exportDir}`);
    console.log('\nExported files:');
    console.log('  - users.json');
    console.log('  - ingredients.json');
    console.log('  - recipes.json');
    console.log('  - mealPlans.json');
    console.log('  - shoppingLists.json');
    console.log('  - cookingPlans.json');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
