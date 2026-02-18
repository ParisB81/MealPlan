import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScrapedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  imageUrl: string;
  instructions: string;
  tags: string;
  ingredients: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  sourceUrl: string;
}

function parseIngredients(ingredientsStr: string): Array<{ name: string; quantity: number; unit: string; notes?: string }> {
  const ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string }> = [];

  const parts = ingredientsStr.split(';').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Pattern: "600 g leeks (cleaned)" or "1 clove(s) of garlic"
    const match = part.match(/^([\d.,]+)\s+(\S+)\s+(.+)$/);
    if (match) {
      let quantity = parseFloat(match[1].replace(',', '.'));
      let unit = match[2].toLowerCase();
      let name = match[3].toLowerCase();

      // Clean up unit
      unit = unit.replace(/\(s\)$/, ''); // Remove (s) suffix
      if (unit === 'piece') unit = 'piece';
      if (unit === 'clove') unit = 'clove';
      if (unit === 'pinch') unit = 'pinch';

      // Clean up name - remove parenthetical notes
      let notes: string | undefined;
      const noteMatch = name.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (noteMatch) {
        name = noteMatch[1].trim();
        notes = noteMatch[2].trim();
      }

      // Remove "of X" pattern from name (e.g., "of garlic" -> "garlic")
      name = name.replace(/^of\s+/, '');

      ingredients.push({ name, quantity, unit, notes });
    }
  }

  return ingredients;
}

async function updateRecipe(recipeId: string, scraped: ScrapedRecipe) {
  console.log(`\nUpdating recipe: ${scraped.title}`);

  // Parse ingredients
  const parsedIngredients = parseIngredients(scraped.ingredients);
  console.log(`  Parsed ${parsedIngredients.length} ingredients`);

  // Get or create ingredients in database
  const ingredientIds: Map<string, string> = new Map();
  for (const ing of parsedIngredients) {
    let dbIng = await prisma.ingredient.findUnique({ where: { name: ing.name } });
    if (!dbIng) {
      dbIng = await prisma.ingredient.create({ data: { name: ing.name } });
      console.log(`  Created ingredient: "${ing.name}"`);
    }
    ingredientIds.set(ing.name, dbIng.id);
  }

  // Delete existing recipe ingredients (should be none, but just in case)
  await prisma.recipeIngredient.deleteMany({ where: { recipeId } });

  // Add new recipe ingredients
  for (const ing of parsedIngredients) {
    const ingredientId = ingredientIds.get(ing.name)!;

    // Check for duplicates within same recipe
    const existing = await prisma.recipeIngredient.findFirst({
      where: { recipeId, ingredientId },
    });

    if (existing) {
      // Combine quantities
      await prisma.recipeIngredient.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + ing.quantity },
      });
    } else {
      await prisma.recipeIngredient.create({
        data: {
          recipeId,
          ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        },
      });
    }
  }

  // Update nutrition if available
  if (scraped.calories || scraped.protein || scraped.carbs || scraped.fat) {
    await prisma.recipeNutrition.upsert({
      where: { recipeId },
      create: {
        recipeId,
        calories: scraped.calories,
        protein: scraped.protein,
        carbs: scraped.carbs,
        fat: scraped.fat,
        fiber: scraped.fiber,
        sugar: scraped.sugar,
        sodium: scraped.sodium,
      },
      update: {
        calories: scraped.calories,
        protein: scraped.protein,
        carbs: scraped.carbs,
        fat: scraped.fat,
        fiber: scraped.fiber,
        sugar: scraped.sugar,
        sodium: scraped.sodium,
      },
    });
    console.log(`  Updated nutrition data`);
  }

  // Update recipe fields
  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      description: scraped.description,
      servings: scraped.servings,
      prepTime: scraped.prepTime,
      cookTime: scraped.cookTime,
      imageUrl: scraped.imageUrl,
      instructions: scraped.instructions,
      tags: scraped.tags,
    },
  });

  console.log(`  Recipe updated successfully`);
}

import * as fs from 'fs';
import * as path from 'path';

// Get recipe ID and scraped data file from command line args
const recipeId = process.argv[2];
const scrapedFile = process.argv[3];

if (!recipeId || !scrapedFile) {
  console.error('Usage: tsx update-empty-recipe.ts <recipeId> <scrapedJsonFile>');
  process.exit(1);
}

const scrapedJson = fs.readFileSync(path.resolve(scrapedFile), 'utf-8');
const scraped: ScrapedRecipe = JSON.parse(scrapedJson);

updateRecipe(recipeId, scraped)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
