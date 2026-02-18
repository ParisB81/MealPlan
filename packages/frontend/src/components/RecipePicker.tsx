import { useState } from 'react';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types/recipe';
import { Modal, Input, Button, Badge } from './ui';

interface RecipePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export default function RecipePicker({ isOpen, onClose, onSelectRecipe }: RecipePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: recipesData, isLoading } = useRecipes({ search: searchTerm });

  const recipes = recipesData?.recipes || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select a Recipe"
      footer={
        <Button variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {/* Search Bar */}
      <Input
        type="text"
        placeholder="Search recipes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />

      {/* Recipe List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No recipes found matching your search.' : 'No recipes available.'}
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{recipe.title}</h3>
              {recipe.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{recipe.servings} servings</span>
                {recipe.prepTime && <span>{recipe.prepTime} min prep</span>}
                {recipe.cookTime && <span>{recipe.cookTime} min cook</span>}
              </div>
              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="gray">{tag}</Badge>
                  ))}
                  {recipe.tags.length > 3 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{recipe.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
