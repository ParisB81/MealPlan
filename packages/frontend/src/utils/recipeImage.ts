/**
 * Resolves the image URL for a recipe.
 *
 * Priority:
 * 1. If the recipe has an `imageUrl` (from scraping), use it directly.
 * 2. Otherwise, return a local path: `/recipe-images/{recipeId}.jpg`
 *    The image will display if you place a .jpg file with that name
 *    in `packages/frontend/public/recipe-images/`.
 *
 * Usage:
 *   <img src={getRecipeImageUrl(recipe)} ... />
 *   or conditionally hide if no image desired:
 *   const imgUrl = getRecipeImageUrl(recipe);
 */
export function getRecipeImageUrl(recipe: { id: string; imageUrl?: string | null }): string {
  if (recipe.imageUrl && recipe.imageUrl.length > 0) {
    return recipe.imageUrl;
  }
  return `/recipe-images/${recipe.id}.jpg`;
}
