import { useState, useMemo } from 'react';
import { useMealPlans } from '../hooks/useMealPlans';
import { useRecipes } from '../hooks/useRecipes';
import { useIngredients } from '../hooks/useIngredients';
import UnitAutocomplete from './UnitAutocomplete';
import type { CreateShoppingListFromRecipesInput, CreateCustomShoppingListInput, AddItemToListInput, ShoppingTrip } from '../types/shoppingList';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';

const CATEGORIES = ['produce', 'pulses', 'dairy', 'meat', 'seafood', 'pantry', 'grains', 'oils', 'nuts', 'herbs', 'spices'];

type BuilderMode = 'meal-plans' | 'recipes' | 'custom';
type SplitMode = 'single' | 'split';

interface ShoppingListBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFromMealPlans: (mealPlanIds: string[], name?: string) => void;
  onCreateFromRecipes: (input: CreateShoppingListFromRecipesInput) => void;
  onCreateCustom: (input: CreateCustomShoppingListInput) => void;
  onCreateSplit?: (mealPlanIds: string[], trips: ShoppingTrip[]) => void;
  isCreating?: boolean;
}

export default function ShoppingListBuilder({
  isOpen,
  onClose,
  onCreateFromMealPlans,
  onCreateFromRecipes,
  onCreateCustom,
  onCreateSplit,
  isCreating = false,
}: ShoppingListBuilderProps) {
  const [mode, setMode] = useState<BuilderMode>('meal-plans');
  const [selectedMealPlanIds, setSelectedMealPlanIds] = useState<string[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [customIngredients, setCustomIngredients] = useState<AddItemToListInput[]>([]);
  const [listName, setListName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('single');
  const [tripFrequency, setTripFrequency] = useState(3);

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

  // Compute trips from selected meal plans' date range + frequency
  const computedTrips = useMemo((): ShoppingTrip[] => {
    if (splitMode !== 'split' || selectedMealPlanIds.length === 0 || !mealPlans) return [];

    const selected = mealPlans.filter(mp => selectedMealPlanIds.includes(mp.id));
    if (selected.length === 0) return [];

    // Find the overall date range across all selected plans
    const allStarts = selected.map(mp => parseISO(mp.startDate));
    const allEnds = selected.map(mp => parseISO(mp.endDate));
    const overallStart = new Date(Math.min(...allStarts.map(d => d.getTime())));
    const overallEnd = new Date(Math.max(...allEnds.map(d => d.getTime())));

    const totalDays = differenceInDays(overallEnd, overallStart) + 1;
    const trips: ShoppingTrip[] = [];
    let current = overallStart;
    let tripNum = 1;

    while (differenceInDays(overallEnd, current) >= 0) {
      const tripEnd = addDays(current, tripFrequency - 1);
      const clampedEnd = tripEnd > overallEnd ? overallEnd : tripEnd;
      trips.push({
        name: `Shop ${tripNum} (${format(current, 'MMM d')} – ${format(clampedEnd, 'MMM d')})`,
        startDate: format(current, 'yyyy-MM-dd'),
        endDate: format(clampedEnd, 'yyyy-MM-dd'),
      });
      current = addDays(clampedEnd, 1);
      tripNum++;
    }

    return trips;
  }, [splitMode, selectedMealPlanIds, mealPlans, tripFrequency]);

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
      if (splitMode === 'split' && onCreateSplit) {
        if (computedTrips.length === 0) {
          alert('No trips computed — please select meal plans first');
          return;
        }
        onCreateSplit(selectedMealPlanIds, computedTrips);
      } else {
        onCreateFromMealPlans(selectedMealPlanIds, listName || undefined);
      }
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
    setSplitMode('single');
    setTripFrequency(3);
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
      <div className="bg-surface rounded-lg p-4 md:p-6 max-w-2xl w-full mx-4 max-h-[90vh] md:max-h-[90vh] h-full md:h-auto overflow-y-auto">
        <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
          Create Shopping List
        </h2>

        {/* Mode Tabs */}
        <div className="flex gap-1 md:gap-2 mb-6 border-b border-border-default">
          <button
            onClick={() => setMode('meal-plans')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2.5 text-sm md:text-base font-medium transition-colors text-center ${
              mode === 'meal-plans'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary active:text-text-primary'
            }`}
          >
            Meal Plans
          </button>
          <button
            onClick={() => setMode('recipes')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2.5 text-sm md:text-base font-medium transition-colors text-center ${
              mode === 'recipes'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary active:text-text-primary'
            }`}
          >
            Recipes
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2.5 text-sm md:text-base font-medium transition-colors text-center ${
              mode === 'custom'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary active:text-text-primary'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Meal Plans Mode */}
        {mode === 'meal-plans' && (
          <div>
            <p className="text-text-secondary mb-4">
              Select one or more active meal plans to generate a shopping list
            </p>

            {/* List Name Input (only in single mode) */}
            {splitMode === 'single' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Shopping List Name (optional)
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="My Shopping List"
                  className="w-full px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
                />
              </div>
            )}

            {/* Split Mode Toggle — shown when plans are selected */}
            {selectedMealPlanIds.length > 0 && onCreateSplit && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('single')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      splitMode === 'single'
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface text-text-secondary border-border-strong hover:bg-hover-bg'
                    }`}
                  >
                    One list
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('split')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      splitMode === 'split'
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface text-text-secondary border-border-strong hover:bg-hover-bg'
                    }`}
                  >
                    Split by shopping trips
                  </button>
                </div>

                {/* Frequency Picker */}
                {splitMode === 'split' && (
                  <div className="mt-3 space-y-3">
                    <label className="block text-sm font-medium text-text-primary">
                      Shop every...
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[2, 3, 4, 7].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTripFrequency(n)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            tripFrequency === n
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-surface text-text-secondary border-border-strong hover:bg-hover-bg'
                          }`}
                        >
                          {n} days
                        </button>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={tripFrequency}
                          onChange={(e) => setTripFrequency(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                          className="w-16 px-2 py-1.5 text-sm border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-text-muted">days</span>
                      </div>
                    </div>

                    {/* Trip Preview */}
                    {computedTrips.length > 0 && (
                      <div className="bg-page-bg rounded-lg p-3">
                        <p className="text-xs font-medium text-text-secondary mb-2">
                          {computedTrips.length} shopping trip{computedTrips.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {computedTrips.map((trip, i) => (
                            <p key={i} className="text-sm text-text-primary">
                              {trip.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!mealPlans || mealPlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted">No active meal plans found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mealPlans.map((mealPlan) => (
                  <label
                    key={mealPlan.id}
                    className="flex items-center gap-3 p-3 border border-border-default rounded-lg hover:bg-hover-bg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMealPlanIds.includes(mealPlan.id)}
                      onChange={() => handleToggleMealPlan(mealPlan.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{mealPlan.name}</p>
                      <p className="text-sm text-text-muted">
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
            <p className="text-text-secondary mb-4">
              Select recipes to include in your shopping list
            </p>

            {/* List Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Shopping List Name (optional)
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="My Shopping List"
                className="w-full px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
              />
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="w-full px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
              />
            </div>

            {filteredRecipes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted">No recipes found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRecipes.map((recipe) => (
                  <label
                    key={recipe.id}
                    className="flex items-center gap-3 p-3 border border-border-default rounded-lg hover:bg-hover-bg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipeIds.includes(recipe.id)}
                      onChange={() => handleToggleRecipe(recipe.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{recipe.title}</p>
                      <p className="text-sm text-text-muted">
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
            <p className="text-text-secondary mb-4">
              Create a custom shopping list with your own ingredients
            </p>

            {/* List Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Shopping List Name *
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Weekend BBQ Shopping"
                className="w-full px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
              />
            </div>

            {/* Ingredient Search */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Search ingredients by name..."
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring text-sm"
              />
              <select
                value={ingredientCategory}
                onChange={(e) => setIngredientCategory(e.target.value)}
                className="px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-ring bg-surface text-sm text-text-primary min-w-[150px]"
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
            <div className="mb-4 border border-border-default rounded-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-border-default">
                {!ingredients || ingredients.length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-sm">
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
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent-light text-left transition-colors"
                    >
                      <span className="text-sm text-text-primary">{ing.name}</span>
                      {ing.category && (
                        <span className="text-xs text-text-muted bg-hover-bg px-2 py-0.5 rounded-full ml-2 shrink-0">
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
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Added ({customIngredients.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customIngredients.map((item, index) => {
                    const ing = allIngredients?.find((i) => i.id === item.ingredientId);
                    return (
                      <div key={index} className="flex gap-2 items-center bg-page-bg rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-text-primary truncate">
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
                          className="w-20 px-2 py-1 border border-border-strong rounded text-sm text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
                        />
                        <UnitAutocomplete
                          value={item.unit}
                          onChange={(value) => handleUpdateCustomIngredient(index, 'unit', value)}
                          placeholder="unit"
                          className="w-24 px-2 py-1 border border-border-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring"
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
            className="flex-1 px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-hover-bg"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-btn-primary text-white rounded-lg hover:bg-btn-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Shopping List'}
          </button>
        </div>
      </div>
    </div>
  );
}
