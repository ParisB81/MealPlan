import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Based on analysis of recipe contexts and typical ingredients, here are the fixes:
// Format: { recipeTitle: { vagueIngredient: correctIngredient } }

const RECIPE_FIXES: Record<string, Record<string, string>> = {
  // POWDER fixes - most are likely onion powder or garlic powder based on qty and context
  "Creamy Spiced Coleslaw": { "powder": "onion powder" },
  "Mexican Vegetable Rice Bowl": { "powder": "chili powder" },
  "Tuna Tartare": { "powder": "cayenne pepper" },
  "Chicken Piccata Meatballs": { "powder": "garlic powder" },
  "Cheesy Chicken Meatballs": { "powder": "onion powder" },
  "Turkish Doner Kebab": { "powder": "onion powder" },
  "Egg Soufflé": { "powder": "onion powder" },
  "Chicken Tacos": { "powder": "chili powder" },
  "Philly Cheesesteak": { "powder": "onion powder" },
  "One-Pot Ground Beef Stroganoff": { "powder": "onion powder" },
  "Make-Ahead Vegetarian Moroccan Stew": { "powder": "cayenne pepper" },
  "Moroccan Chickpea Stew": { "powder": "cayenne pepper" },
  "Moroccan Carrots": { "powder": "cayenne pepper" },
  "Marrakesh Vegetable Curry": { "powder": "curry powder" },

  // PASTE fixes - mostly tomato paste in savory dishes, wasabi paste in sushi
  "Shrimp Rice Bowl": { "paste": "chili paste" },
  "Rigatoni alla Genovese": { "paste": "tomato paste" },
  "Ground Beef and Rice Skillet": { "paste": "tomato paste" },
  "Moroccan Harira Soup": { "paste": "tomato paste" },
  "Moroccan Shrimp Stew": { "paste": "tomato paste" },
  "Smoked Salmon Sushi Roll": { "paste": "wasabi paste" },

  // SAUCE fixes - soy sauce for Asian, Worcestershire for Western, hot sauce, etc.
  "Oyakodon (Japanese Chicken and Egg Rice Bowl)": { "sauce": "soy sauce" },
  "Buddha Bowl Recipe": { "sauce": "soy sauce" },
  "Shrimp Rice Bowl": { "sauce": "soy sauce" },
  "Vegetarian Bibimbap": { "sauce": "gochujang" },
  "Original Steak Tartare": { "sauce": "worcestershire sauce" },
  "Avocado Shrimp Ceviche ": { "sauce": "hot sauce" },
  "Ahi Tuna Poke": { "sauce": "soy sauce" },
  "Do-It-Yourself Salmon Poke Bowls": { "sauce": "soy sauce" },
  "Chef John's Hawaiian-Style Ahi Poke": { "sauce": "soy sauce" },
  "Traditional Gyros": { "sauce": "tzatziki" },
  "Chicken Tacos": { "sauce": "hot sauce" },
  "French Onion Soup Gratinée": { "sauce": "worcestershire sauce" },
  "Ground Beef and Rice Skillet": { "sauce": "worcestershire sauce" },
  "Classic Goulash": { "sauce": "worcestershire sauce" },
  "Moroccan Chickpea Stew": { "sauce": "tomato sauce" },
  "Chicken Ramen Bowl": { "sauce": "soy sauce" },
  "Bolognese Sauce": { "sauce": "tomato sauce" },

  // OIL fixes - mostly vegetable oil or sesame oil for Asian dishes
  "Kerala Chicken Curry": { "oil": "vegetable oil" },
  "Oyakodon (Japanese Chicken and Egg Rice Bowl)": { "oil": "vegetable oil" },
  "Buddha Bowl Recipe": { "oil": "sesame oil" },
  "Baja-Style Chicken Bowl": { "oil": "vegetable oil" },
  "Shrimp Rice Bowl": { "oil": "sesame oil" },
  "Black Bean Breakfast Bowl": { "oil": "vegetable oil" },
  "Vegetarian Bibimbap": { "oil": "sesame oil" },
  "Mexican Vegetable Rice Bowl": { "oil": "vegetable oil" },
  "Tuna Tartare": { "oil": "sesame oil" },
  "Ahi Tuna Poke": { "oil": "sesame oil" },
  "Do-It-Yourself Salmon Poke Bowls": { "oil": "sesame oil" },
  "Chef John's Hawaiian-Style Ahi Poke": { "oil": "sesame oil" },
  "Mediterranean Lentil Salad": { "oil": "olive oil" },
  "Tyropita (Greek Cheese Pie)": { "oil": "olive oil" },
  "Spanakopita (Greek Spinach Pie)": { "oil": "olive oil" },
  "Chicken Piccata Meatballs": { "oil": "olive oil" },
  "Cheesy Chicken Meatballs": { "oil": "vegetable oil" },
  "Lahmacun Turkish Pizza": { "oil": "olive oil" },
  "Easy Doner-Style Kebab": { "oil": "olive oil" },
  "Rigatoni alla Genovese": { "oil": "olive oil" },
  "Chicken Tacos": { "oil": "vegetable oil" },
  "Philly Cheesesteak": { "oil": "vegetable oil" },
  "Rich and Simple French Onion Soup": { "oil": "olive oil" },
  "Creamy Tomato Chicken and White Beans": { "oil": "olive oil" },
  "Classic Goulash": { "oil": "vegetable oil" },
  "Moroccan Couscous": { "oil": "olive oil" },
  "Easy Moroccan Chicken Tagine": { "oil": "olive oil" },
  "Vegetarian Moroccan Harira": { "oil": "olive oil" },
  "Moroccan Shrimp Stew": { "oil": "olive oil" },
  "Moroccan Chickpea Stew": { "oil": "olive oil" },
  "Moroccan Carrots": { "oil": "olive oil" },
  "Marrakesh Vegetable Curry": { "oil": "vegetable oil" },
  "Chicken Ramen Bowl": { "oil": "sesame oil" },
  "Uzbek Plov (Lamb and Rice Pilaf)": { "oil": "vegetable oil" },
  "Bolognese Sauce": { "oil": "olive oil" },

  // JUICE fixes - lemon juice, lime juice, or orange juice based on recipe type
  "Southern Coleslaw": { "juice": "lemon juice" },
  "Restaurant-Style Coleslaw": { "juice": "lemon juice" },
  "Buddha Bowl Recipe": { "juice": "lemon juice" },
  "Basic Ceviche": { "juice": "lime juice" },
  "Chef John's Hawaiian-Style Ahi Poke": { "juice": "lemon juice" },
  "Mediterranean Lentil Salad": { "juice": "lemon juice" },
  "Chicken Tacos": { "juice": "lime juice" },
  "Moroccan Couscous": { "juice": "orange juice" },
  "Easy Moroccan Chicken Tagine": { "juice": "lemon juice" },
  "Moroccan Carrots": { "juice": "lemon juice" },
  "Marrakesh Vegetable Curry": { "juice": "tomato juice" },
  "Salmon Wraps": { "juice": "lemon juice" },

  // SEEDS fixes - sesame seeds for Asian dishes, cumin seeds for Moroccan
  "Shrimp Rice Bowl": { "seeds": "sesame seeds" },
  "Tuna Tartare": { "seeds": "sesame seeds" },
  "Do-It-Yourself Salmon Poke Bowls": { "seeds": "sesame seeds" },
  "Uzbek Plov (Lamb and Rice Pilaf)": { "seeds": "cumin seed" },

  // WINE fixes
  "Chicken Piccata Meatballs": { "wine": "white wine" },
  "Rigatoni alla Genovese": { "wine": "white wine" },
  "French Onion Soup Gratinée": { "wine": "white wine" },

  // BROTH fixes
  "Buddha Bowl Recipe": { "broth": "vegetable broth" },
  "Rich and Simple French Onion Soup": { "broth": "beef broth" },
  "Moroccan Couscous": { "broth": "chicken broth" },
  "Moroccan Harira Soup": { "broth": "chicken broth" },

  // STOCK fixes
  "One-Pot Ground Beef Stroganoff": { "stock": "beef broth" },
  "Moroccan Shrimp Stew": { "stock": "chicken broth" },
  "Bolognese Sauce": { "stock": "beef broth" },
};

async function fixVagueIngredients() {
  console.log('=== FIXING VAGUE INGREDIENTS ===\n');

  // Get all existing ingredients for lookup
  const allIngredients = await prisma.ingredient.findMany();
  const ingredientMap = new Map<string, string>();
  for (const ing of allIngredients) {
    ingredientMap.set(ing.name.toLowerCase(), ing.id);
  }

  let fixedCount = 0;
  let createdCount = 0;
  let errorCount = 0;

  for (const [recipeTitle, fixes] of Object.entries(RECIPE_FIXES)) {
    // Find the recipe
    const recipe = await prisma.recipe.findFirst({
      where: { title: { contains: recipeTitle.substring(0, 30) } },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!recipe) {
      console.log(`Recipe not found: "${recipeTitle}"`);
      continue;
    }

    for (const [vagueIngName, correctIngName] of Object.entries(fixes)) {
      // Find the recipe ingredient with the vague name
      const vagueRecipeIng = recipe.ingredients.find(
        (ri) => ri.ingredient.name === vagueIngName
      );

      if (!vagueRecipeIng) {
        // Already fixed or doesn't exist
        continue;
      }

      // Find or create the correct ingredient
      let correctIngId = ingredientMap.get(correctIngName.toLowerCase());

      if (!correctIngId) {
        // Create the correct ingredient
        const newIng = await prisma.ingredient.create({
          data: { name: correctIngName.toLowerCase() },
        });
        correctIngId = newIng.id;
        ingredientMap.set(correctIngName.toLowerCase(), correctIngId);
        console.log(`Created ingredient: "${correctIngName}"`);
        createdCount++;
      }

      // Check if recipe already has the correct ingredient
      const existingCorrect = recipe.ingredients.find(
        (ri) => ri.ingredientId === correctIngId
      );

      if (existingCorrect) {
        // Recipe already has this ingredient - just delete the vague one
        await prisma.recipeIngredient.delete({ where: { id: vagueRecipeIng.id } });
        console.log(`  ${recipeTitle}: Removed duplicate "${vagueIngName}" (already has "${correctIngName}")`);
      } else {
        // Update the recipe ingredient to point to the correct ingredient
        await prisma.recipeIngredient.update({
          where: { id: vagueRecipeIng.id },
          data: { ingredientId: correctIngId },
        });
        console.log(`  ${recipeTitle}: "${vagueIngName}" -> "${correctIngName}"`);
      }

      fixedCount++;
    }
  }

  // Now clean up the vague ingredients if they have no more usages
  const vagueNames = ['powder', 'paste', 'sauce', 'oil', 'juice', 'seeds', 'wine', 'broth', 'stock'];

  console.log('\n=== CLEANING UP UNUSED VAGUE INGREDIENTS ===\n');

  for (const name of vagueNames) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name } });
    if (!ingredient) continue;

    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ingredient.id } });
    const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ingredient.id } });

    if (recipeCount === 0 && shoppingCount === 0) {
      await prisma.ingredient.delete({ where: { id: ingredient.id } });
      console.log(`Deleted unused vague ingredient: "${name}"`);
    } else {
      console.log(`Kept "${name}" - still has ${recipeCount} recipe usages, ${shoppingCount} shopping usages`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Fixed: ${fixedCount}`);
  console.log(`Created new ingredients: ${createdCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

fixVagueIngredients().catch(console.error);
