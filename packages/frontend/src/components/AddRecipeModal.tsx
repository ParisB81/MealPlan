import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRecipes } from '../hooks/useRecipes';
import { useAddRecipeToMealPlan } from '../hooks/useMealPlans';
import { useCollections, useCollection } from '../hooks/useCollections';
import type { Recipe } from '../types/recipe';
import type { AddRecipeToMealPlanInput } from '../types/mealPlan';
import { Modal, Input, TextArea, Select, Button } from './ui';
import { ArrowLeft, Clock, Users, ExternalLink, Plus, Minus, X, ChevronLeft, ChevronRight, Check, SlidersHorizontal, Sparkles } from 'lucide-react';
import { getRecipeImageUrl } from '../utils/recipeImage';

/** Shift a YYYY-MM-DD string by ±1 day */
function shiftDate(dateStr: string, delta: 1 | -1): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

/** Date input with ‹ › arrow buttons on either side */
function DateStepper({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(shiftDate(value, -1))}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-hover-bg text-text-muted hover:text-text-primary transition-colors active:scale-95"
        title="Previous day"
      >
        <ChevronLeft size={18} />
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 border border-border-strong rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent-ring text-sm text-text-primary bg-surface"
        required
      />
      <button
        type="button"
        onClick={() => onChange(shiftDate(value, 1))}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-hover-bg text-text-muted hover:text-text-primary transition-colors active:scale-95"
        title="Next day"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/** Servings input with − / + stepper buttons for easy mobile use */
function ServingsStepper({
  value,
  onChange,
  className = '',
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 14 : 18;
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className={`${btnSize} flex items-center justify-center rounded-lg border border-border-strong bg-surface hover:bg-hover-bg text-text-primary transition-colors active:scale-95`}
        aria-label="Decrease servings"
      >
        <Minus size={iconSize} />
      </button>
      <span className={`${textSize} font-semibold text-text-primary min-w-[2.5rem] text-center tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={`${btnSize} flex items-center justify-center rounded-lg border border-border-strong bg-surface hover:bg-hover-bg text-text-primary transition-colors active:scale-95`}
        aria-label="Increase servings"
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}

interface AddRecipeModalProps {
  mealPlanId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill the date picker with this date (YYYY-MM-DD) */
  defaultDate?: string;
  /** Auto-select this recipe and jump to details step (e.g., after AI creation) */
  preSelectedRecipeId?: string;
}

type Step = 'browse' | 'details';

interface QuickAddState {
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
}

export default function AddRecipeModal({ mealPlanId, isOpen, onClose, defaultDate, preSelectedRecipeId }: AddRecipeModalProps) {
  const navigate = useNavigate();
  const addRecipe = useAddRecipeToMealPlan();

  const [step, setStep] = useState<Step>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Detail form state (Step 2)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');

  // Quick-add inline form state (Step 1)
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);

  // Keep-open toggle: when enabled, modal stays open after adding a recipe
  const [keepOpen, setKeepOpen] = useState(false);
  // Track total added count for user feedback
  const [addedCount, setAddedCount] = useState(0);

  // Collection filter
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxCalories: '', minProtein: '', maxCarbs: '',
    maxFat: '', maxTotalTime: '', maxPrepTime: '',
  });

  const hasComma = searchTerm.includes(',');
  const { data, isLoading } = useRecipes({
    search: !hasComma && searchTerm ? searchTerm : undefined,
    tags: hasComma ? searchTerm : undefined,
  });
  const recipes = data?.recipes || [];

  // Collection data for dropdown + filtering
  const { data: collections } = useCollections('active');
  const { data: selectedCollection } = useCollection(selectedCollectionId || undefined);

  // Build Set of recipe IDs in the selected collection for fast lookup
  const collectionRecipeIds = useMemo(() => {
    if (!selectedCollectionId || !selectedCollection) return null;
    return new Set(selectedCollection.recipes.map((r) => r.id));
  }, [selectedCollectionId, selectedCollection]);

  // Count active advanced filters
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  // Apply all filters: collection → nutrition → time
  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // 1. Collection filter
    if (collectionRecipeIds) {
      result = result.filter(r => collectionRecipeIds.has(r.id));
    }

    // 2. Nutrition + time filters (same logic as RecipesPage)
    if (activeFilterCount > 0) {
      result = result.filter((recipe) => {
        const n = recipe.nutrition;
        const maxCal = filters.maxCalories ? Number(filters.maxCalories) : null;
        const minProt = filters.minProtein ? Number(filters.minProtein) : null;
        const maxCarbs = filters.maxCarbs ? Number(filters.maxCarbs) : null;
        const maxFat = filters.maxFat ? Number(filters.maxFat) : null;
        const maxTime = filters.maxTotalTime ? Number(filters.maxTotalTime) : null;
        const maxPrep = filters.maxPrepTime ? Number(filters.maxPrepTime) : null;

        if (maxCal !== null && (!n?.calories || n.calories > maxCal)) return false;
        if (minProt !== null && (!n?.protein || n.protein < minProt)) return false;
        if (maxCarbs !== null && (!n?.carbs || n.carbs > maxCarbs)) return false;
        if (maxFat !== null && (!n?.fat || n.fat > maxFat)) return false;
        if (maxTime !== null) {
          const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
          if (total === 0 || total > maxTime) return false;
        }
        if (maxPrep !== null && (!recipe.prepTime || recipe.prepTime > maxPrep)) return false;

        return true;
      });
    }

    return result;
  }, [recipes, collectionRecipeIds, filters, activeFilterCount]);

  const hasAnyFilter = activeFilterCount > 0 || !!selectedCollectionId;

  const clearFilters = () => {
    setFilters({ maxCalories: '', minProtein: '', maxCarbs: '', maxFat: '', maxTotalTime: '', maxPrepTime: '' });
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (isOpen) {
      // When opening, apply defaultDate if provided
      if (defaultDate) {
        setDate(defaultDate);
      }
    } else {
      // When closing, reset all state
      setStep('browse');
      setSearchTerm('');
      setSelectedRecipe(null);
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setMealType('dinner');
      setServings(2);
      setNotes('');
      setQuickAdd(null);
      setAddedCount(0);
      // Reset collection & filter state
      setSelectedCollectionId('');
      setShowFilters(false);
      setFilters({ maxCalories: '', minProtein: '', maxCarbs: '', maxFat: '', maxTotalTime: '', maxPrepTime: '' });
    }
  }, [isOpen, defaultDate]);

  // Auto-select a recipe when preSelectedRecipeId is provided (e.g., after AI creation)
  useEffect(() => {
    if (isOpen && preSelectedRecipeId && recipes.length > 0 && step === 'browse') {
      const match = recipes.find(r => r.id === preSelectedRecipeId);
      if (match) {
        handleSelectRecipe(match);
      }
    }
  }, [isOpen, preSelectedRecipeId, recipes]);

  /** Reset to browse step for the next add — preserves mealType, advances date by 1 day */
  const resetForNextAdd = (addedDate: string) => {
    setStep('browse');
    setSelectedRecipe(null);
    setNotes('');
    setQuickAdd(null);
    setDate(shiftDate(addedDate, 1));
    setAddedCount((c) => c + 1);
    toast.success('Recipe added! Pick another');
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setServings(recipe.servings);
    setStep('details');
  };

  const handleBack = () => {
    setStep('browse');
    setSelectedRecipe(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    const input: AddRecipeToMealPlanInput = {
      recipeId: selectedRecipe.id,
      date: new Date(date).toISOString(),
      mealType,
      servings,
      notes: notes || undefined,
    };

    addRecipe.mutate(
      { mealPlanId, input },
      { onSuccess: () => keepOpen ? resetForNextAdd(date) : onClose() }
    );
  };

  const openQuickAdd = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setQuickAdd({
      recipeId: recipe.id,
      date: defaultDate || new Date().toISOString().split('T')[0],
      mealType: 'dinner',
      servings: recipe.servings,
    });
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd) return;

    const input: AddRecipeToMealPlanInput = {
      recipeId: quickAdd.recipeId,
      date: new Date(quickAdd.date).toISOString(),
      mealType: quickAdd.mealType,
      servings: quickAdd.servings,
    };

    addRecipe.mutate(
      { mealPlanId, input },
      { onSuccess: () => keepOpen ? resetForNextAdd(quickAdd.date) : onClose() }
    );
  };

  const totalTime = selectedRecipe
    ? (selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'browse' ? 'Add Recipe to Meal Plan' : 'Recipe Details'}
      size="xl"
      footer={
        <div className="flex flex-col gap-3 w-full">
          <label className="flex items-center gap-2 cursor-pointer justify-center select-none">
            <div
              role="checkbox"
              aria-checked={keepOpen}
              tabIndex={0}
              onClick={() => setKeepOpen(!keepOpen)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setKeepOpen(!keepOpen); } }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                keepOpen ? 'bg-accent border-accent' : 'border-border-strong bg-surface'
              }`}
            >
              {keepOpen && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm text-text-secondary">
              Keep open to add more
              {addedCount > 0 && (
                <span className="text-accent font-medium ml-1">({addedCount} added)</span>
              )}
            </span>
          </label>
          <Button variant="ghost" fullWidth onClick={onClose}>
            {addedCount > 0 ? 'Done' : 'Cancel'}
          </Button>
        </div>
      }
    >
      {step === 'browse' ? (
        /* ── Step 1: Browse & Search ── */
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Search by name or tags (use commas for AND filter)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Collection dropdown + Filter toggle + AI generate */}
          <div className="flex gap-2">
            {collections && collections.length > 0 && (
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-strong bg-surface text-text-primary text-sm"
              >
                <option value="">All Recipes</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.recipeCount})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                showFilters || activeFilterCount > 0
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-text-primary border-border-strong hover:bg-hover-bg'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-accent text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { onClose(); navigate(`/recipes/ai-generate?mealPlanId=${mealPlanId}`); }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Create</span>
            </button>
          </div>

          {/* Collapsible filter panel */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
              showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="bg-surface-alt border border-border-default rounded-lg p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Max Calories</label>
                    <input
                      type="number" placeholder="e.g. 500"
                      value={filters.maxCalories}
                      onChange={(e) => updateFilter('maxCalories', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Min Protein (g)</label>
                    <input
                      type="number" placeholder="e.g. 10"
                      value={filters.minProtein}
                      onChange={(e) => updateFilter('minProtein', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Max Carbs (g)</label>
                    <input
                      type="number" placeholder="e.g. 50"
                      value={filters.maxCarbs}
                      onChange={(e) => updateFilter('maxCarbs', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Max Fat (g)</label>
                    <input
                      type="number" placeholder="e.g. 20"
                      value={filters.maxFat}
                      onChange={(e) => updateFilter('maxFat', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Max Total Time</label>
                    <input
                      type="number" placeholder="min"
                      value={filters.maxTotalTime}
                      onChange={(e) => updateFilter('maxTotalTime', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Max Prep Time</label>
                    <input
                      type="number" placeholder="min"
                      value={filters.maxPrepTime}
                      onChange={(e) => updateFilter('maxPrepTime', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border-default bg-surface text-text-primary text-sm"
                      min="0"
                    />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1"
                    >
                      <X size={12} />
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result counter when any filter is active */}
          {hasAnyFilter && (
            <p className="text-xs text-text-muted">
              Showing {filteredRecipes.length} of {recipes.length} recipes
              {selectedCollectionId && selectedCollection && (
                <span> in <span className="font-medium text-text-secondary">{selectedCollection.name}</span></span>
              )}
            </p>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Loading recipes...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              {searchTerm || hasAnyFilter
                ? 'No recipes found matching your criteria.'
                : 'No recipes available.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes.map((recipe) => {
                const time = (recipe.prepTime || 0) + (recipe.cookTime || 0);
                const isQuickAdding = quickAdd?.recipeId === recipe.id;
                return (
                  <div
                    key={recipe.id}
                    className={`bg-surface rounded-lg shadow transition-all overflow-hidden ${
                      isQuickAdding
                        ? 'ring-2 ring-green-400 shadow-lg'
                        : 'hover:shadow-lg hover:ring-2 hover:ring-accent-ring'
                    }`}
                  >
                    {/* Clickable card body → detail view */}
                    <button
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full text-left"
                    >
                      <img
                        src={getRecipeImageUrl(recipe)}
                        alt={recipe.title}
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-36 bg-hover-bg flex items-center justify-center';
                          placeholder.innerHTML = '<span class="text-text-muted text-3xl">🍽️</span>';
                          img.replaceWith(placeholder);
                        }}
                      />
                      <div className="p-3 pb-2">
                        <h3 className="font-semibold text-text-primary text-sm mb-1 line-clamp-1">
                          {recipe.title}
                        </h3>
                        {recipe.description && (
                          <p className="text-xs text-text-muted line-clamp-2 mb-2">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex gap-3 text-xs text-text-muted mb-2">
                          <span>⏱️ {time > 0 ? `${time} min` : 'N/A'}</span>
                          <span>🍴 {recipe.servings} srv</span>
                        </div>
                        {recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-accent-light text-accent text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {recipe.tags.length > 2 && (
                              <span className="text-xs text-text-muted">
                                +{recipe.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Quick-add bar */}
                    {isQuickAdding ? (
                      <form
                        onSubmit={handleQuickAddSubmit}
                        className="px-3 pb-3 pt-2 border-t border-border-default bg-surface-alt flex flex-col gap-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DateStepper
                          value={quickAdd.date}
                          onChange={(v) => setQuickAdd({ ...quickAdd, date: v })}
                        />
                        <select
                          value={quickAdd.mealType}
                          onChange={(e) =>
                            setQuickAdd({
                              ...quickAdd,
                              mealType: e.target.value as QuickAddState['mealType'],
                            })
                          }
                          className="w-full text-sm border border-border-strong rounded-lg px-3 py-2 min-h-[44px] text-text-primary bg-surface"
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-text-muted whitespace-nowrap">Servings</label>
                          <ServingsStepper
                            value={quickAdd.servings}
                            onChange={(v) => setQuickAdd({ ...quickAdd, servings: v })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={addRecipe.isPending}
                            className="flex-1 text-sm bg-btn-success text-white rounded-lg py-2.5 min-h-[44px] hover:bg-btn-success-hover disabled:opacity-50 font-medium active:scale-95 transition-transform"
                          >
                            {addRecipe.isPending ? 'Adding…' : '✓ Add'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setQuickAdd(null); }}
                            className="text-sm text-text-muted hover:text-text-primary px-3 py-2 min-h-[44px] flex items-center active:scale-95 transition-transform"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="px-3 pb-3 pt-1 border-t border-border-default">
                        <button
                          onClick={(e) => openQuickAdd(e, recipe)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded py-1.5 transition-colors font-medium"
                        >
                          <Plus size={12} />
                          Quick Add
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* ── Step 2: Preview + Details Form ── */
        <div className="flex gap-6">
          {/* Left: Recipe Preview */}
          {selectedRecipe && (
            <div className="w-2/5 flex-shrink-0 flex flex-col gap-3">
              <img
                src={getRecipeImageUrl(selectedRecipe)}
                alt={selectedRecipe.title}
                className="w-full h-40 object-cover rounded-lg"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-40 bg-hover-bg flex items-center justify-center rounded-lg';
                  placeholder.innerHTML = '<span class="text-text-muted text-4xl">🍽️</span>';
                  img.replaceWith(placeholder);
                }}
              />

              <div>
                <h3 className="font-bold text-text-primary text-lg leading-tight">
                  {selectedRecipe.title}
                </h3>
                {selectedRecipe.description && (
                  <p className="text-sm text-text-muted mt-1 line-clamp-3">
                    {selectedRecipe.description}
                  </p>
                )}
              </div>

              <div className="flex gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {totalTime > 0 ? `${totalTime} min` : 'N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {selectedRecipe.servings} servings
                </span>
              </div>

              {selectedRecipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedRecipe.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-accent-light text-accent text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {selectedRecipe.tags.length > 5 && (
                    <span className="text-xs text-text-muted">
                      +{selectedRecipe.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {selectedRecipe.ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-1">
                    Ingredients
                  </h4>
                  <ul className="text-sm text-text-secondary space-y-0.5">
                    {selectedRecipe.ingredients.slice(0, 8).map((ri) => (
                      <li key={ri.id} className="line-clamp-1">
                        <span className="text-text-muted">
                          {ri.quantity} {ri.unit}
                        </span>{' '}
                        {ri.ingredient.name}
                      </li>
                    ))}
                    {selectedRecipe.ingredients.length > 8 && (
                      <li className="text-text-muted text-xs">
                        +{selectedRecipe.ingredients.length - 8} more ingredients
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {selectedRecipe.sourceUrl && (
                <a
                  href={selectedRecipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink size={12} />
                  View original recipe
                </a>
              )}

              <Link
                to={`/recipes/${selectedRecipe.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
              >
                <ExternalLink size={12} />
                Open recipe page
              </Link>
            </div>
          )}

          {/* Right: Details Form */}
          <div className="flex-1 flex flex-col gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover self-start"
            >
              <ArrowLeft size={14} />
              Back to recipes
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
                <DateStepper value={date} onChange={setDate} />
              </div>

              <Select
                label="Meal Type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </Select>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Servings</label>
                <ServingsStepper value={servings} onChange={setServings} />
              </div>

              <TextArea
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special notes..."
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={addRecipe.isPending}
              >
                {addRecipe.isPending ? 'Adding...' : 'Add Recipe'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}
