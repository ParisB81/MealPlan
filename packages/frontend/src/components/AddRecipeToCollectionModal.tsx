import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useRecipes } from '../hooks/useRecipes';
import { useCollections, useCollection } from '../hooks/useCollections';
import type { Recipe } from '../types/recipe';
import { Modal, Input, Button } from './ui';
import { SlidersHorizontal, X, Check, CheckCircle } from 'lucide-react';
import { getRecipeImageUrl } from '../utils/recipeImage';

interface AddRecipeToCollectionModalProps {
  collectionId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Recipe IDs already in the collection — shown with a badge */
  existingRecipeIds: Set<string>;
  onAddRecipe: (recipe: Recipe) => void;
}

export default function AddRecipeToCollectionModal({
  collectionId,
  isOpen,
  onClose,
  existingRecipeIds,
  onAddRecipe,
}: AddRecipeToCollectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  // Track recipes added during this session (before parent refetches)
  const [sessionAdded, setSessionAdded] = useState<Set<string>>(new Set());

  // Collection filter (to browse from another collection)
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

  // Collections for the filter dropdown
  const { data: collections } = useCollections('active');
  const { data: selectedCollection } = useCollection(selectedCollectionId || undefined);

  const collectionRecipeIds = useMemo(() => {
    if (!selectedCollectionId || !selectedCollection) return null;
    return new Set(selectedCollection.recipes.map((r) => r.id));
  }, [selectedCollectionId, selectedCollection]);

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // Collection filter
    if (collectionRecipeIds) {
      result = result.filter(r => collectionRecipeIds.has(r.id));
    }

    // Nutrition + time filters
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
    if (!isOpen) {
      setSearchTerm('');
      setAddedCount(0);
      setSessionAdded(new Set());
      setSelectedCollectionId('');
      setShowFilters(false);
      setFilters({ maxCalories: '', minProtein: '', maxCarbs: '', maxFat: '', maxTotalTime: '', maxPrepTime: '' });
    }
  }, [isOpen]);

  const handleSelectRecipe = (recipe: Recipe) => {
    const alreadyIn = existingRecipeIds.has(recipe.id) || sessionAdded.has(recipe.id);
    if (alreadyIn) {
      toast('This recipe is already in the collection', { icon: 'ℹ️' });
      return;
    }
    onAddRecipe(recipe);
    setAddedCount((c) => c + 1);
    setSessionAdded(prev => new Set(prev).add(recipe.id));
    toast.success(`Added "${recipe.title}"`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Recipes to Collection"
      size="xl"
      footer={
        <div className="flex flex-col gap-2 w-full">
          {addedCount > 0 && (
            <p className="text-sm text-center text-accent font-medium">
              {addedCount} recipe{addedCount !== 1 ? 's' : ''} added
            </p>
          )}
          <Button variant="ghost" fullWidth onClick={onClose}>
            {addedCount > 0 ? 'Done' : 'Cancel'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Search by name or tags (use commas for AND filter)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Collection dropdown + Filter toggle */}
        <div className="flex gap-2">
          {collections && collections.length > 0 && (
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-strong bg-surface text-text-primary text-sm"
            >
              <option value="">All Recipes</option>
              {collections
                .filter(c => c.id !== collectionId) // exclude the target collection
                .map((c) => (
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

        {/* Result counter */}
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
              const alreadyIn = existingRecipeIds.has(recipe.id) || sessionAdded.has(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className={`bg-surface rounded-lg shadow transition-all overflow-hidden ${
                    alreadyIn
                      ? 'ring-2 ring-green-400 opacity-70'
                      : 'hover:shadow-lg hover:ring-2 hover:ring-accent-ring cursor-pointer'
                  }`}
                >
                  <button
                    onClick={() => handleSelectRecipe(recipe)}
                    className="w-full text-left"
                    disabled={alreadyIn}
                  >
                    <div className="relative">
                      <img
                        src={getRecipeImageUrl(recipe)}
                        alt={recipe.title}
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-36 bg-hover-bg flex items-center justify-center';
                          placeholder.innerHTML = '<span class="text-text-muted text-3xl">&#x1F37D;&#xFE0F;</span>';
                          img.replaceWith(placeholder);
                        }}
                      />
                      {alreadyIn && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>
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
                        <span>&#x23F1;&#xFE0F; {time > 0 ? `${time} min` : 'N/A'}</span>
                        <span>&#x1F374; {recipe.servings} srv</span>
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
                  {/* Bottom bar */}
                  <div className="px-3 pb-3 pt-1 border-t border-border-default">
                    {alreadyIn ? (
                      <div className="w-full flex items-center justify-center gap-1 text-xs text-green-700 bg-green-50 rounded py-1.5 font-medium">
                        <Check size={12} />
                        In collection
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectRecipe(recipe)}
                        className="w-full flex items-center justify-center gap-1 text-xs text-accent bg-accent-light hover:opacity-80 rounded py-1.5 transition-colors font-medium active:scale-95"
                      >
                        + Add to collection
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
