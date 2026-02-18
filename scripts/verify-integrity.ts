import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for recipes with zero ingredients
  const recipes = await prisma.recipe.findMany({
    where: { status: 'active' },
    include: { ingredients: true }
  });

  const noIngredients = recipes.filter(r => r.ingredients.length === 0);
  console.log(`Total active recipes: ${recipes.length}`);
  console.log(`Recipes with 0 ingredients: ${noIngredients.length}`);
  if (noIngredients.length > 0) {
    noIngredients.forEach(r => console.log(`  - ${r.title} (${r.id})`));
  }

  // Check for orphaned RecipeIngredient rows (ingredient doesn't exist)
  const orphanedRI = await prisma.$queryRawUnsafe(`
    SELECT ri.id, ri.recipeId, ri.ingredientId
    FROM recipe_ingredients ri
    LEFT JOIN ingredients i ON ri.ingredientId = i.id
    WHERE i.id IS NULL
  `) as any[];
  console.log(`\nOrphaned RecipeIngredient rows: ${orphanedRI.length}`);

  // Check for orphaned ShoppingListItem rows
  const orphanedSI = await prisma.$queryRawUnsafe(`
    SELECT si.id, si.shoppingListId, si.ingredientId
    FROM shopping_list_items si
    LEFT JOIN ingredients i ON si.ingredientId = i.id
    WHERE i.id IS NULL
  `) as any[];
  console.log(`Orphaned ShoppingListItem rows: ${orphanedSI.length}`);

  // Count remaining problematic-looking ingredient names
  const allIngs = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  const suspicious = allIngs.filter(i => {
    const n = i.name;
    return n.startsWith('(') || n.startsWith('-') || n.startsWith('ounce)') ||
           n.startsWith('inch)') || n.startsWith('pound)') ||
           n.length <= 2;
  });
  console.log(`\nRemaining suspicious ingredient names: ${suspicious.length}`);
  suspicious.forEach(i => console.log(`  - "${i.name}"`));
}

main().then(() => prisma.$disconnect());
