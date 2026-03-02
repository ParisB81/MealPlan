import RecipeCard from './RecipeCard';
import type { Recipe } from '../../types/recipe';

interface RecipeListProps {
  recipes: Recipe[];
  isLoading?: boolean;
}

export default function RecipeList({ recipes, isLoading }: RecipeListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-surface rounded-lg shadow animate-pulse">
            <div className="w-full h-48 bg-hover-bg" />
            <div className="p-4">
              <div className="h-6 bg-hover-bg rounded mb-2" />
              <div className="h-4 bg-hover-bg rounded w-3/4 mb-3" />
              <div className="flex gap-4 mb-3">
                <div className="h-4 bg-hover-bg rounded w-20" />
                <div className="h-4 bg-hover-bg rounded w-20" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 bg-hover-bg rounded w-16" />
                <div className="h-6 bg-hover-bg rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍽️</div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No recipes found
        </h3>
        <p className="text-text-secondary mb-6">
          Start by creating your first recipe!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
