import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// More comprehensive fixes - mapping vague ingredient to correct one by recipe
const FIXES: Record<string, Record<string, string>> = {
  // POWDER
  "Mexican Vegetable Rice Bowl": { "powder": "chili powder" },
  "Tuna Tartare": { "powder": "cayenne pepper" },
  "Chicken Piccata Meatballs": { "powder": "garlic powder" },
  "Cheesy Chicken Meatballs": { "powder": "onion powder" },
  "Creamy Spiced Coleslaw": { "powder": "onion powder" },
  "Chicken Tacos": { "powder": "chili powder", "sauce": "hot sauce", "oil": "vegetable oil", "juice": "lime juice" },
  "Philly Cheesesteak": { "powder": "onion powder" },
  "One-Pot Ground Beef Stroganoff": { "powder": "onion powder" },
  "Moroccan Chickpea Stew": { "powder": "cayenne pepper", "sauce": "tomato sauce" },
  "Moroccan Carrots": { "powder": "cayenne pepper" },
  "Marrakesh Vegetable Curry": { "powder": "curry powder", "oil": "vegetable oil" },

  // PASTE
  "Shrimp Rice Bowl": { "paste": "chili paste", "sauce": "soy sauce", "oil": "sesame oil" },
  "Rigatoni alla Genovese": { "paste": "tomato paste", "oil": "olive oil" },
  "Ground Beef and Rice Skillet": { "paste": "tomato paste" },
  "Moroccan Harira Soup": { "paste": "tomato paste", "broth": "chicken broth" },
  "Moroccan Shrimp Stew": { "paste": "tomato paste", "oil": "olive oil" },

  // SAUCE
  "Oyakodon (Japanese Chicken and Egg Rice Bowl)": { "sauce": "soy sauce" },
  "Buddha Bowl Recipe": { "sauce": "soy sauce", "oil": "sesame oil", "juice": "lemon juice" },
  "Vegetarian Bibimbap": { "sauce": "gochujang" },
  "Ahi Tuna Poke": { "sauce": "soy sauce" },
  "Do-It-Yourself Salmon Poke Bowls": { "sauce": "soy sauce", "oil": "sesame oil" },
  "Chef John&#39;s Hawaiian-Style Ahi Poke": { "sauce": "soy sauce", "oil": "sesame oil", "juice": "lemon juice" },
  "French Onion Soup Gratinée": { "sauce": "worcestershire sauce" },
  "Classic Goulash": { "sauce": "worcestershire sauce" },
  "Chicken Ramen Bowl": { "sauce": "soy sauce" },
  "Bolognese Sauce": { "sauce": "tomato sauce", "oil": "olive oil" },

  // OIL
  "Tuna Tartare": { "oil": "sesame oil" },
  "Mediterranean Lentil Salad": { "oil": "olive oil" },
  "Chicken Piccata Meatballs": { "oil": "olive oil" },
  "Rich and Simple French Onion Soup": { "oil": "olive oil" },
  "Moroccan Couscous": { "oil": "olive oil", "juice": "orange juice" },
  "Easy Moroccan Chicken Tagine": { "oil": "olive oil" },
  "Uzbek Plov (Lamb and Rice Pilaf)": { "oil": "vegetable oil" },
};

async function fixRemaining() {
  console.log('=== FIXING REMAINING VAGUE INGREDIENTS ===\n');

  const allIngredients = await prisma.ingredient.findMany();
  const ingredientMap = new Map<string, string>();
  for (const ing of allIngredients) {
    ingredientMap.set(ing.name.toLowerCase(), ing.id);
  }

  let fixedCount = 0;

  // Get all recipes
  const allRecipes = await prisma.recipe.findMany({
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  });

  for (const recipe of allRecipes) {
    // Check each fix mapping
    for (const [titlePattern, fixes] of Object.entries(FIXES)) {
      // Match by partial title (handles HTML entities like &#39;)
      const cleanTitle = recipe.title.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      const cleanPattern = titlePattern.replace(/&#39;/g, "'").replace(/&amp;/g, "&");

      if (!cleanTitle.includes(cleanPattern.substring(0, 20))) continue;

      for (const [vagueIngName, correctIngName] of Object.entries(fixes)) {
        // Find the vague ingredient in this recipe
        const vagueRI = recipe.ingredients.find((ri) => ri.ingredient.name === vagueIngName);
        if (!vagueRI) continue;

        // Get or create correct ingredient
        let correctId = ingredientMap.get(correctIngName.toLowerCase());
        if (!correctId) {
          const newIng = await prisma.ingredient.create({
            data: { name: correctIngName.toLowerCase() },
          });
          correctId = newIng.id;
          ingredientMap.set(correctIngName.toLowerCase(), correctId);
          console.log(`Created: "${correctIngName}"`);
        }

        // Check if recipe already has correct ingredient
        const existingCorrect = recipe.ingredients.find((ri) => ri.ingredientId === correctId);

        if (existingCorrect) {
          await prisma.recipeIngredient.delete({ where: { id: vagueRI.id } });
          console.log(`${recipe.title}: Removed duplicate "${vagueIngName}"`);
        } else {
          await prisma.recipeIngredient.update({
            where: { id: vagueRI.id },
            data: { ingredientId: correctId },
          });
          console.log(`${recipe.title}: "${vagueIngName}" -> "${correctIngName}"`);
        }
        fixedCount++;
      }
    }
  }

  // Cleanup unused vague ingredients
  console.log('\n=== CLEANUP ===\n');
  const vagueNames = ['powder', 'paste', 'sauce', 'oil', 'juice', 'broth'];

  for (const name of vagueNames) {
    const ing = await prisma.ingredient.findUnique({ where: { name } });
    if (!ing) continue;

    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
    const shoppingCount = await prisma.shoppingListItem.count({ where: { ingredientId: ing.id } });

    if (recipeCount === 0 && shoppingCount === 0) {
      await prisma.ingredient.delete({ where: { id: ing.id } });
      console.log(`Deleted: "${name}"`);
    } else {
      // List remaining usages
      const remaining = await prisma.recipeIngredient.findMany({
        where: { ingredientId: ing.id },
        include: { recipe: { select: { title: true } } },
      });
      console.log(`"${name}" still has ${recipeCount} usages:`);
      remaining.forEach((r) => console.log(`  - ${r.recipe.title}`));
    }
  }

  console.log(`\nFixed: ${fixedCount}`);
  await prisma.$disconnect();
}

fixRemaining().catch(console.error);
