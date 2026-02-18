import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Greek to English mapping
const GREEK_TO_ENGLISH: Record<string, string> = {
  'αλάτι': 'salt',
  'αλεύρι γ.ό.χ.': 'all-purpose flour',
  'αυγά': 'egg',
  'ελαιόλαδο': 'olive oil',
  'κίτρινη πιπεριά': 'yellow bell pepper',
  'καρότα': 'carrot',
  'κολοκυθάκι': 'zucchini',
  'κολοκύθα': 'pumpkin',
  'κρεμμύδι': 'onion',
  'κόκκινη πιπεριά': 'red bell pepper',
  'κόλιανδρο': 'cilantro',
  'κύβο κότας': 'chicken bouillon cube',
  'λεμόνι': 'lemon',
  'λευκό κρασί': 'white wine',
  'μανιτάρια πλευρώτους': 'oyster mushroom',
  'μπρόκολο': 'broccoli',
  'νερό': 'water',
  'ξίδι βαλσάμικο': 'balsamic vinegar',
  'πατάτες': 'potato',
  'πιπέρι': 'pepper',
  'πράσινη πιπεριά': 'green bell pepper',
  'πράσο': 'leek',
  'ρίγανη': 'oregano',
  'σέλερι': 'celery',
  'σέλινο': 'celery',
  'σκόρδο': 'garlic',
  'φύλλο δάφνης': 'bay leaf',
};

// Direct fixes - map old name to new name
const INGREDIENT_FIXES: Record<string, string> = {
  'pinch of cayenne pepper': 'cayenne pepper',
  'radishes': 'radish',
  'shredded kale': 'kale',
  'vegetable stock pot': 'vegetable stock',
  'water to cover': 'water',
};

// Context-specific fixes - need to look at the recipe to determine correct ingredient
const CONTEXT_FIXES: Record<string, Record<string, string>> = {
  'seasoning': {
    'Cheesy Chicken Meatballs': 'italian seasoning', // 1 tbsp seasoning -> italian seasoning
  },
  'shredded': {
    'Bolognese Sauce': 'carrot', // 2 piece shredded -> likely shredded carrot
  },
  'threads': {
    'Vegetarian Moroccan Harira': 'saffron', // 1 pinch threads -> saffron threads
  },
  'to taste': {
    'Vegetarian Bibimbap': 'DELETE', // this is just "to taste" garbage, recipe likely has salt already
  },
};

async function mergeIngredient(oldIngId: string, newIngId: string, oldName: string, newName: string) {
  // Get all usages of the old ingredient
  const usages = await prisma.recipeIngredient.findMany({
    where: { ingredientId: oldIngId },
  });

  for (const usage of usages) {
    // Check if recipe already has the new ingredient
    const existingUsage = await prisma.recipeIngredient.findFirst({
      where: { recipeId: usage.recipeId, ingredientId: newIngId },
    });

    if (existingUsage) {
      // Combine quantities if same unit
      if (existingUsage.unit === usage.unit) {
        await prisma.recipeIngredient.update({
          where: { id: existingUsage.id },
          data: { quantity: existingUsage.quantity + usage.quantity },
        });
      }
      await prisma.recipeIngredient.delete({ where: { id: usage.id } });
    } else {
      // Update to point to the new ingredient
      await prisma.recipeIngredient.update({
        where: { id: usage.id },
        data: { ingredientId: newIngId },
      });
    }
  }

  // Also update shopping list items
  const shoppingUsages = await prisma.shoppingListItem.findMany({
    where: { ingredientId: oldIngId },
  });

  for (const item of shoppingUsages) {
    const existingItem = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId: item.shoppingListId, ingredientId: newIngId, unit: item.unit },
    });

    if (existingItem) {
      await prisma.shoppingListItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + item.quantity },
      });
      await prisma.shoppingListItem.delete({ where: { id: item.id } });
    } else {
      await prisma.shoppingListItem.update({
        where: { id: item.id },
        data: { ingredientId: newIngId },
      });
    }
  }
}

async function fixIngredients() {
  console.log('=== FIXING ADDITIONAL INGREDIENTS ===\n');

  // 1. Fix Greek ingredients
  console.log('--- Fixing Greek ingredients ---\n');
  for (const [greekName, englishName] of Object.entries(GREEK_TO_ENGLISH)) {
    const greekIng = await prisma.ingredient.findUnique({ where: { name: greekName } });
    if (!greekIng) continue;

    let englishIng = await prisma.ingredient.findUnique({ where: { name: englishName } });

    if (englishIng) {
      // Merge into existing English ingredient
      console.log(`  Merging "${greekName}" -> "${englishName}" (existing)`);
      await mergeIngredient(greekIng.id, englishIng.id, greekName, englishName);
      await prisma.ingredient.delete({ where: { id: greekIng.id } });
    } else {
      // Rename Greek to English
      console.log(`  Renaming "${greekName}" -> "${englishName}"`);
      await prisma.ingredient.update({
        where: { id: greekIng.id },
        data: { name: englishName },
      });
    }
  }

  // 2. Fix direct mappings
  console.log('\n--- Fixing direct mappings ---\n');
  for (const [oldName, newName] of Object.entries(INGREDIENT_FIXES)) {
    const oldIng = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!oldIng) {
      console.log(`  Skipping "${oldName}" - not found`);
      continue;
    }

    let newIng = await prisma.ingredient.findUnique({ where: { name: newName } });

    if (newIng) {
      console.log(`  Merging "${oldName}" -> "${newName}" (existing)`);
      await mergeIngredient(oldIng.id, newIng.id, oldName, newName);
      await prisma.ingredient.delete({ where: { id: oldIng.id } });
    } else {
      console.log(`  Renaming "${oldName}" -> "${newName}"`);
      await prisma.ingredient.update({
        where: { id: oldIng.id },
        data: { name: newName },
      });
    }
  }

  // 3. Fix context-specific ingredients
  console.log('\n--- Fixing context-specific ingredients ---\n');
  for (const [oldName, recipeFixes] of Object.entries(CONTEXT_FIXES)) {
    const oldIng = await prisma.ingredient.findUnique({ where: { name: oldName } });
    if (!oldIng) {
      console.log(`  Skipping "${oldName}" - not found`);
      continue;
    }

    // Get all usages
    const usages = await prisma.recipeIngredient.findMany({
      where: { ingredientId: oldIng.id },
      include: { recipe: { select: { id: true, title: true } } },
    });

    for (const usage of usages) {
      const newName = recipeFixes[usage.recipe.title];
      if (!newName) {
        console.log(`  WARNING: No fix defined for "${oldName}" in "${usage.recipe.title}"`);
        continue;
      }

      if (newName === 'DELETE') {
        // Just delete this usage
        console.log(`  Deleting "${oldName}" from "${usage.recipe.title}"`);
        await prisma.recipeIngredient.delete({ where: { id: usage.id } });
      } else {
        // Get or create the new ingredient
        let newIng = await prisma.ingredient.findUnique({ where: { name: newName } });
        if (!newIng) {
          newIng = await prisma.ingredient.create({ data: { name: newName } });
          console.log(`  Created ingredient: "${newName}"`);
        }

        // Check if recipe already has this ingredient
        const existing = await prisma.recipeIngredient.findFirst({
          where: { recipeId: usage.recipeId, ingredientId: newIng.id },
        });

        if (existing) {
          // Combine quantities
          if (existing.unit === usage.unit) {
            await prisma.recipeIngredient.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + usage.quantity },
            });
          }
          await prisma.recipeIngredient.delete({ where: { id: usage.id } });
          console.log(`  Merged "${oldName}" into existing "${newName}" in "${usage.recipe.title}"`);
        } else {
          await prisma.recipeIngredient.update({
            where: { id: usage.id },
            data: { ingredientId: newIng.id },
          });
          console.log(`  Updated "${oldName}" -> "${newName}" in "${usage.recipe.title}"`);
        }
      }
    }

    // Check if ingredient is now unused
    const remainingUsages = await prisma.recipeIngredient.count({ where: { ingredientId: oldIng.id } });
    const shoppingUsages = await prisma.shoppingListItem.count({ where: { ingredientId: oldIng.id } });

    if (remainingUsages === 0 && shoppingUsages === 0) {
      await prisma.ingredient.delete({ where: { id: oldIng.id } });
      console.log(`  Deleted unused ingredient: "${oldName}"`);
    }
  }

  console.log('\n=== DONE ===');
  await prisma.$disconnect();
}

fixIngredients().catch(console.error);
