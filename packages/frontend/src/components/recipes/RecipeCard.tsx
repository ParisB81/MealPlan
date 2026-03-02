import { Link } from 'react-router-dom';
import type { Recipe } from '../../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block bg-surface rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-hover-bg flex items-center justify-center">
          <span className="text-text-muted text-4xl">🍽️</span>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-text-secondary text-sm mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-text-muted mb-3">
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span>{totalTime > 0 ? `${totalTime} min` : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🍴</span>
            <span>{recipe.servings} servings</span>
          </div>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-accent-light text-accent text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="px-2 py-1 bg-hover-bg text-text-muted text-xs rounded-full">
                +{recipe.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
