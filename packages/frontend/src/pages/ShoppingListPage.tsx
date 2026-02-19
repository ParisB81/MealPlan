import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  useShoppingList,
  useShoppingListById,
  useToggleShoppingListItem,
  useAddItemToList,
  useRemoveItemFromList,
  useUpdateShoppingList,
} from '../hooks/useShoppingLists';
import { useIngredients } from '../hooks/useIngredients';
import { shoppingListsService } from '../services/shoppingLists.service';
import RecipePicker from '../components/RecipePicker';
import MealPlanPicker from '../components/MealPlanPicker';
import UnitAutocomplete from '../components/UnitAutocomplete';
import type { AddItemToListInput } from '../types/shoppingList';
import type { Recipe } from '../types/recipe';
import type { MealPlan } from '../types/mealPlan';

import toast from 'react-hot-toast';

export default function ShoppingListPage() {
  const { id, mealPlanId } = useParams<{ id?: string; mealPlanId?: string }>();

  // Support both routes: /shopping-lists/:id and /meal-plans/:mealPlanId/shopping
  const { data: shoppingListById, isLoading: isLoadingById, error: errorById } = useShoppingListById(id);
  const { data: shoppingListByMealPlan, isLoading: isLoadingByMealPlan, error: errorByMealPlan } = useShoppingList(mealPlanId);

  const shoppingList = id ? shoppingListById : shoppingListByMealPlan;
  const isLoading = id ? isLoadingById : isLoadingByMealPlan;
  const error = id ? errorById : errorByMealPlan;

  const queryClient = useQueryClient();
  const { data: ingredients } = useIngredients();
  const toggleItem = useToggleShoppingListItem();
  const addItem = useAddItemToList();
  const removeItem = useRemoveItemFromList();
  const updateShoppingList = useUpdateShoppingList();

  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('unit');
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showMealPlanPicker, setShowMealPlanPicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleToggleItem = (itemId: string) => {
    if (!shoppingList) return;
    toggleItem.mutate({ shoppingListId: shoppingList.id, itemId });
  };

  const handleToggleAll = () => {
    if (!shoppingList) return;

    // Determine if we should check all or uncheck all
    // If all items are checked, uncheck all. Otherwise, check all.
    const allChecked = shoppingList.items.every(item => item.checked);
    const shouldCheck = !allChecked;

    // Toggle each item that needs to be changed
    shoppingList.items.forEach(item => {
      if (item.checked !== shouldCheck) {
        toggleItem.mutate({ shoppingListId: shoppingList.id, itemId: item.id });
      }
    });
  };

  const handleAddIngredient = () => {
    if (!shoppingList || !selectedIngredientId) {
      alert('Please select an ingredient');
      return;
    }

    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const item: AddItemToListInput = {
      ingredientId: selectedIngredientId,
      quantity: Math.round(quantity * 100) / 100,
      unit,
    };

    addItem.mutate(
      { shoppingListId: shoppingList.id, item },
      {
        onSuccess: () => {
          setShowAddIngredient(false);
          setSelectedIngredientId(ingredients?.[0]?.id || '');
          setQuantity(1);
          setUnit('unit');
        },
      }
    );
  };

  const handleRemoveIngredient = (itemId: string, ingredientName: string) => {
    if (!shoppingList || !confirm(`Remove "${ingredientName}" from shopping list?`)) {
      return;
    }

    removeItem.mutate({ shoppingListId: shoppingList.id, itemId });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartEditingName = () => {
    if (shoppingList) {
      setEditedName(shoppingList.name);
      setIsEditingName(true);
    }
  };

  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = () => {
    if (!shoppingList || !editedName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    updateShoppingList.mutate(
      { shoppingListId: shoppingList.id, name: editedName.trim() },
      {
        onSuccess: () => {
          setIsEditingName(false);
          setEditedName('');
        },
      }
    );
  };

  const handleAddFromRecipe = async (recipe: Recipe) => {
    if (!shoppingList) return;

    setShowRecipePicker(false);

    // Add all ingredients from the recipe to the shopping list
    const ingredientsToAdd = recipe.ingredients || [];

    if (ingredientsToAdd.length === 0) {
      toast.error('This recipe has no ingredients to add');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const recipeIngredient of ingredientsToAdd) {
      try {
        const item: AddItemToListInput = {
          ingredientId: recipeIngredient.ingredient.id,
          quantity: Math.round(recipeIngredient.quantity * 100) / 100,
          unit: recipeIngredient.unit,
        };

        await addItem.mutateAsync({ shoppingListId: shoppingList.id, item });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Failed to add ingredient:', error);
      }
    }

    if (successCount > 0) {
      toast.success(`Added ${successCount} ingredient(s) from "${recipe.title}"`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} ingredient(s)`);
    }
  };

  const handleAddFromMealPlan = async (mealPlan: MealPlan) => {
    if (!shoppingList) return;

    setShowMealPlanPicker(false);

    try {
      const result = await shoppingListsService.addFromMealPlan(shoppingList.id, mealPlan.id);

      if (result.added === 0) {
        toast.error('This meal plan has no ingredients to add');
      } else {
        toast.success(`Added ${result.added} ingredient(s) from "${mealPlan.name}"`);
        // Refresh the shopping list
        queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      }
    } catch (error: any) {
      console.error('Failed to add from meal plan:', error);
      toast.error(error?.response?.data?.message || 'Failed to add ingredients from meal plan');
    }
  };

  // Set default ingredient when ingredients load
  useEffect(() => {
    if (ingredients && ingredients.length > 0 && !selectedIngredientId) {
      setSelectedIngredientId(ingredients[0].id);
    }
  }, [ingredients, selectedIngredientId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading shopping list...</p>
        </div>
      </div>
    );
  }

  if (error || !shoppingList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load shopping list</h2>
          <Link
            to={mealPlanId ? `/meal-plans/${mealPlanId}` : '/shopping-lists'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            {mealPlanId ? 'Back to Meal Plan' : 'Back to Shopping Lists'}
          </Link>
        </div>
      </div>
    );
  }

  const backUrl = mealPlanId ? `/meal-plans/${mealPlanId}` : '/shopping-lists';
  const backText = mealPlanId ? '← Back to Meal Plan' : '← Back to Shopping Lists';

  const totalItems = shoppingList.items.length;
  const checkedItems = shoppingList.items.filter((item) => item.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        {/* Back Button & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 print:hidden">
          <Link to={backUrl} className="text-blue-600 hover:text-blue-700">
            {backText}
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddIngredient(true)}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800"
            >
              Add Ingredient
            </button>
            <button
              onClick={() => setShowRecipePicker(true)}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800"
            >
              Add from Recipe
            </button>
            <button
              onClick={() => setShowMealPlanPicker(true)}
              className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800"
            >
              Add from Meal Plan
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800"
            >
              Print
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Shopping List Name with Edit */}
          <div className="mb-4">
            {isEditingName ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditingName();
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={updateShoppingList.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEditingName}
                  disabled={updateShoppingList.isPending}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{shoppingList.name}</h1>
                <button
                  onClick={handleStartEditingName}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg print:hidden"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {checkedItems} / {totalItems} items
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {totalItems > 0 && (
              <button
                onClick={handleToggleAll}
                disabled={toggleItem.isPending}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 print:hidden"
              >
                {shoppingList.items.every(item => item.checked) ? 'Uncheck All' : 'Check All'}
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {totalItems === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No items in shopping list
            </h3>
            <p className="text-gray-600 mb-6">
              Click "Add Ingredient" to start adding items to your list
            </p>
            <button
              onClick={() => setShowAddIngredient(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Your First Ingredient
            </button>
          </div>
        )}

        {/* Shopping List by Category */}
        {shoppingList.itemsByCategory &&
          Object.keys(shoppingList.itemsByCategory).length > 0 && (
            <div className="space-y-6">
              {Object.entries(shoppingList.itemsByCategory).map(
                ([category, items]) => (
                  <div key={category} className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                      {category}
                    </h2>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 min-h-[48px] hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleToggleItem(item.id)}
                            className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                          />
                          <span
                            className={`flex-1 ${
                              item.checked
                                ? 'line-through text-gray-400'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.ingredient.name}
                          </span>
                          <span
                            className={`text-sm whitespace-nowrap ${
                              item.checked ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            onClick={() => handleRemoveIngredient(item.id, item.ingredient.name)}
                            className="px-2 py-1.5 min-h-[36px] text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded print:hidden"
                            disabled={removeItem.isPending}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

        {/* Add Ingredient Modal */}
        {showAddIngredient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Add Ingredient
              </h2>

              {!ingredients || ingredients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No ingredients available</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    {/* Ingredient Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingredient
                      </label>
                      <select
                        value={selectedIngredientId}
                        onChange={(e) => setSelectedIngredientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={quantity}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          const rounded = Math.round(value * 100) / 100;
                          setQuantity(rounded);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Unit Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <UnitAutocomplete
                        value={unit}
                        onChange={(value) => setUnit(value)}
                        placeholder="e.g., grams, cups, pieces"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddIngredient(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={addItem.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIngredient}
                  disabled={addItem.isPending || !ingredients || ingredients.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addItem.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Picker Modal */}
        <RecipePicker
          isOpen={showRecipePicker}
          onClose={() => setShowRecipePicker(false)}
          onSelectRecipe={handleAddFromRecipe}
        />

        {/* Meal Plan Picker Modal */}
        <MealPlanPicker
          isOpen={showMealPlanPicker}
          onClose={() => setShowMealPlanPicker(false)}
          onSelectMealPlan={handleAddFromMealPlan}
        />

        {/* Print-only styles */}
        <style>{`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            body {
              background: white;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
