import { useState } from 'react';
import { useMealPlans } from '../hooks/useMealPlans';
import { useRecipes } from '../hooks/useRecipes';
import { useIngredients } from '../hooks/useIngredients';
import UnitAutocomplete from './UnitAutocomplete';
import type { CreateShoppingListFromRecipesInput, CreateCustomShoppingListInput, AddItemToListInput } from '../types/shoppingList';

const CATEGORIES = ['produce', 'pulses', 'dairy', 'meat', 'seafood', 'pantry', 'grains', 'oils', 'nuts', 'herbs', 'spices'];

type BuilderMode = 'meal-plans' | 'recipes' | 'custom';

interface ShoppingListBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFromMealPlans: (mealPlanIds: string[], name?: string) => void;
  onCreateFromRecipes: (input: CreateShoppingListFromRecipesInput) => void;
  onCreateCustom: (input: CreateCustomShoppingListInput) => void;
  isCreating?: boolean;
}

export default function ShoppingListBuilder({
  isOpen,
  onClose,
  onCreateFromMealPlans,
  onCreateFromRecipes,
  onCreateCustom,
  isCreating = false,
}: ShoppingListBuilderProps) {
  const [mode, setMode] = useState<BuilderMode>('meal-plans');
  const [selectedMealPlanIds, setSelectedMealPlanIds] = useState<string[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [customIngredients, setCustomIngredients] = useState<AddItemToListInput[]>([]);
  const [listName, setListName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ingredient search state for custom list
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientCategory, setIngredientCategory] = useState('');

  const { data: mealPlans } = useMealPlans('active');
  const { data: recipesData } = useRecipes();
  const { data: ingredients } = useIngredients(
    ingredientSearch || undefined,
    ingredientCategory || undefined
  );
  // Unfiltered list used for name lookups in the "Added" section
  const { data: allIngredients } = useIngredients();

  // Extract recipes array from the response
  const recipes = recipesData?.recipes || [];

  const handleToggleMealPlan = (id: string) => {
    setSelectedMealPlanIds(prev =>
      prev.includes(id) ? prev.filter(mpId => mpId !== id) : [...prev, id]
    );
  };

  const handleToggleRecipe = (id: string) => {
    setSelectedRecipeIds(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleAddCustomIngredient = () => {
    if (ingredients && ingredients.length > 0) {
      setCustomIngredients(prev => [
        ...prev,
        { ingredientId: ingredients[0].id, quantity: 1, unit: 'unit' },
      ]);
    }
  };

  const handleRemoveCustomIngredient = (index: number) => {
    setCustomIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCustomIngredient = (
    index: number,
    field: keyof AddItemToListInput,
    value: string | number
  ) => {
    setCustomIngredients(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleCreate = () => {
    if (mode === 'meal-plans') {
      if (selectedMealPlanIds.length === 0) {
        alert('Please select at least one meal plan');
        return;
      }
      onCreateFromMealPlans(selectedMealPlanIds, listName || undefined);
    } else if (mode === 'recipes') {
      if (selectedRecipeIds.length === 0) {
        alert('Please select at least one recipe');
        return;
      }
      onCreateFromRecipes({
        recipeIds: selectedRecipeIds,
        name: listName || undefined,
      });
    } else {
      if (customIngredients.length === 0) {
        alert('Please add at least one ingredient');
        return;
      }
      if (!listName.trim()) {
        alert('Please enter a name for your shopping list');
        return;
      }
      onCreateCustom({
        name: listName,
        ingredients: customIngredients,
      });
    }
  };

  const handleReset = () => {
    setSelectedMealPlanIds([]);
    setSelectedRecipeIds([]);
    setCustomIngredients([]);
    setListName('');
    setSearchQuery('');
    setIngredientSearch('');
    setIngredientCategory('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Create Shopping List
        </h2>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setMode('meal-plans')}
            className={`px-4 py-2 font-medium transition-colors ${
              mode === 'meal-plans'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            From Meal Plans
          </button>
          <button
            onClick={() => setMode('recipes')}
            className={`px-4 py-2 font-medium transition-colors ${
              mode === 'recipes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            From Recipes
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 font-medium transition-colors ${
              mode === 'custom'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom List
          </button>
        </div>

        {/* Meal Plans Mode */}
        {mode === 'meal-plans' && (
          <div>
            <p className="text-gray-600 mb-4">
              Select one or more active meal plans to generate a shopping list
            </p>

            {/* List Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shopping List Name (optional)
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="My Shopping List"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!mealPlans || mealPlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No active meal plans found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mealPlans.map((mealPlan) => (
                  <label
                    key={mealPlan.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMealPlanIds.includes(mealPlan.id)}
                      onChange={() => handleToggleMealPlan(mealPlan.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{mealPlan.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(mealPlan.startDate)} - {formatDate(mealPlan.endDate)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recipes Mode */}
        {mode === 'recipes' && (
          <div>
            <p className="text-gray-600 mb-4">
              Select recipes to include in your shopping list
            </p>

            {/* List Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shopping List Name (optional)
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="My Shopping List"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {filteredRecipes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recipes found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRecipes.map((recipe) => (
                  <label
                    key={recipe.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipeIds.includes(recipe.id)}
                      onChange={() => handleToggleRecipe(recipe.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{recipe.title}</p>
                      <p className="text-sm text-gray-500">
                        {recipe.servings} servings • {recipe.cookTime} min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Mode */}
        {mode === 'custom' && (
          <div>
            <p className="text-gray-600 mb-4">
              Create a custom shopping list with your own ingredients
            </p>

            {/* List Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shopping List Name *
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Weekend BBQ Shopping"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Ingredient Search */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Search ingredients by name..."
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={ingredientCategory}
                onChange={(e) => setIngredientCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-700 min-w-[150px]"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient List (click to add) */}
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                {!ingredients || ingredients.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {ingredientSearch || ingredientCategory ? 'No ingredients match your search.' : 'No ingredients found.'}
                  </div>
                ) : (
                  ingredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() =>
                        setCustomIngredients((prev) => [
                          ...prev,
                          { ingredientId: ing.id, quantity: 1, unit: 'unit' },
                        ])
                      }
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                    >
                      <span className="text-sm text-gray-800">{ing.name}</span>
                      {ing.category && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                          {ing.category}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Added Ingredients */}
            {customIngredients.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Added ({customIngredients.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customIngredients.map((item, index) => {
                    const ing = allIngredients?.find((i) => i.id === item.ingredientId);
                    return (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-800 truncate">
                          {ing?.name ?? 'Unknown'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const rounded = Math.round(value * 100) / 100;
                            handleUpdateCustomIngredient(index, 'quantity', rounded);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <UnitAutocomplete
                          value={item.unit}
                          onChange={(value) => handleUpdateCustomIngredient(index, 'unit', value)}
                          placeholder="unit"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRemoveCustomIngredient(index)}
                          className="text-red-500 hover:text-red-700 text-sm px-1"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Shopping List'}
          </button>
        </div>
      </div>
    </div>
  );
}
