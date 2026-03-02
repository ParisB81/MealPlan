import { useState } from 'react';
import { useRecipes } from '../hooks/useRecipes';

interface RecipeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipeId: string, recipeName: string) => void;
  isAdding?: boolean;
}

export default function RecipeSelector({
  isOpen,
  onClose,
  onSelectRecipe,
  isAdding = false,
}: RecipeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const { data: recipesData, isLoading } = useRecipes();
  const recipes = recipesData?.recipes || [];

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const handleAdd = () => {
    if (selectedRecipeId && selectedRecipe) {
      onSelectRecipe(selectedRecipeId, selectedRecipe.title);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Add from Recipe</h2>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto mb-4 border border-border-default rounded-lg">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-text-muted">Loading recipes...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">No recipes found</p>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedRecipeId === recipe.id
                      ? 'bg-accent-light border-l-4 border-accent'
                      : 'hover:bg-hover-bg'
                  }`}
                >
                  <h3 className="font-semibold text-text-primary">{recipe.title}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Servings: {recipe.servings} • Prep: {recipe.prepTime} min • Cook: {recipe.cookTime} min
                  </p>
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-hover-bg"
            disabled={isAdding}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedRecipeId || isAdding}
            className="flex-1 px-4 py-2 bg-btn-success text-white rounded-lg hover:bg-btn-success-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add Ingredients'}
          </button>
        </div>
      </div>
    </div>
  );
}
