import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipes, useBulkDeleteRecipes, useRestoreRecipe, usePermanentDeleteRecipe } from '../hooks/useRecipes';
import { useCollections } from '../hooks/useCollections';
import { Button, Input, Badge, Alert } from '../components/ui';
import { Download, CalendarPlus, Trash2, X, Sparkles, FolderPlus, SlidersHorizontal } from 'lucide-react';
import AddToMealPlanModal from '../components/AddToMealPlanModal';
import AddToCollectionModal from '../components/AddToCollectionModal';

interface RecipeFilters {
  maxCalories: string;
  minProtein: string;
  maxTotalTime: string;
  maxPrepTime: string;
  maxCarbs: string;
  maxFat: string;
}

type TabType = 'active' | 'deleted';

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [addToMealPlan, setAddToMealPlan] = useState<{ id: string; title: string } | null>(null);
  const [addToCollection, setAddToCollection] = useState<{ id: string; title: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    maxCalories: '', minProtein: '', maxTotalTime: '', maxPrepTime: '', maxCarbs: '', maxFat: '',
  });
  const navigate = useNavigate();
  const { data: collections } = useCollections('active');

  // If the search contains commas, treat each part as a tag filter (AND logic)
  // Otherwise, use it as a general search (title, description, or tags)
  const hasComma = search.includes(',');
  const { data, isLoading, error } = useRecipes({
    search: !hasComma && search ? search : undefined,
    tags: hasComma ? search : undefined,
    status: activeTab
  });
  const bulkDelete = useBulkDeleteRecipes();
  const restoreRecipe = useRestoreRecipe();
  const permanentDeleteRecipe = usePermanentDeleteRecipe();

  const allRecipes = data?.recipes || [];

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  // Apply client-side filters to already-fetched recipes
  const recipes = useMemo(() => {
    if (activeFilterCount === 0) return allRecipes;

    return allRecipes.filter((recipe) => {
      const n = recipe.nutrition;
      const maxCal = filters.maxCalories ? Number(filters.maxCalories) : null;
      const minProt = filters.minProtein ? Number(filters.minProtein) : null;
      const maxTime = filters.maxTotalTime ? Number(filters.maxTotalTime) : null;
      const maxPrep = filters.maxPrepTime ? Number(filters.maxPrepTime) : null;
      const maxCarbs = filters.maxCarbs ? Number(filters.maxCarbs) : null;
      const maxFat = filters.maxFat ? Number(filters.maxFat) : null;

      // Nutrition filters: skip recipes without nutrition data when a nutrition filter is active
      if (maxCal !== null) {
        if (!n?.calories || n.calories > maxCal) return false;
      }
      if (minProt !== null) {
        if (!n?.protein || n.protein < minProt) return false;
      }
      if (maxCarbs !== null) {
        if (!n?.carbs || n.carbs > maxCarbs) return false;
      }
      if (maxFat !== null) {
        if (!n?.fat || n.fat > maxFat) return false;
      }

      // Time filters
      if (maxTime !== null) {
        const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
        if (total === 0 || total > maxTime) return false;
      }
      if (maxPrep !== null) {
        if (!recipe.prepTime || recipe.prepTime > maxPrep) return false;
      }

      return true;
    });
  }, [allRecipes, filters, activeFilterCount]);

  const clearFilters = () => {
    setFilters({ maxCalories: '', minProtein: '', maxTotalTime: '', maxPrepTime: '', maxCarbs: '', maxFat: '' });
  };

  const updateFilter = (key: keyof RecipeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedRecipes(new Set());
    setShowBulkActions(false);
  };

  const handleRestoreRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to restore this recipe?')) {
      return;
    }
    restoreRecipe.mutate(recipeId);
  };

  const handlePermanentDelete = async (recipeId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this recipe? This action cannot be undone!')) {
      return;
    }
    permanentDeleteRecipe.mutate(recipeId);
  };

  const handleSelectAll = () => {
    if (selectedRecipes.size === recipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(recipes.map(r => r.id)));
    }
  };

  const handleSelectRecipe = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedRecipes.size === 0) {
      alert('Please select recipes to delete');
      return;
    }

    if (activeTab === 'deleted') {
      if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedRecipes.size} recipe(s)? This action cannot be undone!`)) {
        return;
      }
      // Use the existing bulk-delete endpoint (which does hard delete)
      bulkDelete.mutate(Array.from(selectedRecipes), {
        onSuccess: () => {
          setSelectedRecipes(new Set());
          setShowBulkActions(false);
        },
      });
    } else {
      if (!confirm(`Are you sure you want to delete ${selectedRecipes.size} recipe(s)?`)) {
        return;
      }
      bulkDelete.mutate(Array.from(selectedRecipes), {
        onSuccess: () => {
          setSelectedRecipes(new Set());
          setShowBulkActions(false);
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Recipes</h1>
            <p className="text-text-secondary mt-1">
              {data?.pagination.total || 0} recipes total
              {activeFilterCount > 0 && ` • ${recipes.length} matching filters`}
              {selectedRecipes.size > 0 && ` • ${selectedRecipes.size} selected`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              to="/recipes/new"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-btn-primary text-white hover:bg-btn-primary-hover"
            >
              + Create Recipe
            </Link>
            <Link
              to="/recipes/ai-generate"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI Generate
            </Link>
            {!showBulkActions && (
              <Button
                variant="danger"
                onClick={() => setShowBulkActions(true)}
              >
                <Trash2 className="w-4 h-4 mr-1 inline" />
                {activeTab === 'deleted' ? 'Select to Delete Forever' : 'Select to Delete'}
              </Button>
            )}
            <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
              <Download className="w-4 h-4 mr-1 inline" />
              Export Recipes
            </span>
            <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
              Download Template
            </span>
            <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
              Import Excel
            </span>
            <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
              Import from URLs
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-default">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Active Recipes
          </button>
          <button
            onClick={() => handleTabChange('deleted')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'deleted'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Deleted Recipes
          </button>
        </div>

        {/* Bulk Selection Bar */}
        {showBulkActions && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedRecipes.size === recipes.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-text-primary font-medium">
                  {selectedRecipes.size} of {recipes.length} selected
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="danger"
                  onClick={handleBulkDelete}
                  disabled={selectedRecipes.size === 0}
                  loading={bulkDelete.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1 inline" />
                  {bulkDelete.isPending
                    ? 'Deleting...'
                    : activeTab === 'deleted'
                      ? `Permanently Delete ${selectedRecipes.size} Recipe${selectedRecipes.size !== 1 ? 's' : ''}`
                      : `Delete ${selectedRecipes.size} Recipe${selectedRecipes.size !== 1 ? 's' : ''}`
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBulkActions(false);
                    setSelectedRecipes(new Set());
                  }}
                >
                  <X className="w-4 h-4 mr-1 inline" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar + Filters + Collection Dropdown */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by title, description, tag, or ingredient — use commas for multi-tag filter (e.g. Greek, Main Dishes)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-3"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-h-[44px] ${
              showFilters || activeFilterCount > 0
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-text-primary border-border-default hover:bg-hover-bg'
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
          {collections && collections.length > 0 && (
            <select
              className="px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm min-w-[180px]"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) navigate(`/collections/${e.target.value}`);
                e.target.value = '';
              }}
            >
              <option value="" disabled>Browse Collection...</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.recipeCount})</option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Panel */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
            showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="mb-6 bg-surface border border-border-default rounded-lg p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Max Calories</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={filters.maxCalories}
                    onChange={(e) => updateFilter('maxCalories', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Min Protein (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={filters.minProtein}
                    onChange={(e) => updateFilter('minProtein', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Max Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={filters.maxCarbs}
                    onChange={(e) => updateFilter('maxCarbs', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Max Fat (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={filters.maxFat}
                    onChange={(e) => updateFilter('maxFat', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Max Total Time</label>
                  <input
                    type="number"
                    placeholder="e.g. 30 min"
                    value={filters.maxTotalTime}
                    onChange={(e) => updateFilter('maxTotalTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Max Prep Time</label>
                  <input
                    type="number"
                    placeholder="e.g. 15 min"
                    value={filters.maxPrepTime}
                    onChange={(e) => updateFilter('maxPrepTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-text-primary text-sm"
                    min="0"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-text-secondary">
                    Showing {recipes.length} of {allRecipes.length} recipes
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-accent hover:text-accent-dark font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="error" className="mb-6">
            Failed to load recipes. Please try again.
          </Alert>
        )}

        {/* Recipe List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-text-secondary">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No recipes found
              </h3>
              <p className="text-text-secondary mb-6">
                {search ? 'Try a different search term' : 'Get started by creating your first recipe'}
              </p>
              <Link
                to="/recipes/new"
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-ring px-6 py-3 text-base bg-btn-primary text-white hover:bg-btn-primary-hover"
              >
                Create Recipe
              </Link>
            </div>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`bg-card-recipes border border-card-recipes-border rounded-lg shadow hover:shadow-lg transition-shadow ${
                  showBulkActions ? 'cursor-pointer' : ''
                } ${selectedRecipes.has(recipe.id) ? 'ring-2 ring-accent-ring' : ''}`}
                onClick={() => showBulkActions && handleSelectRecipe(recipe.id)}
              >
                {showBulkActions && (
                  <div className="p-2 border-b border-border-default">
                    <input
                      type="checkbox"
                      checked={selectedRecipes.has(recipe.id)}
                      onChange={() => handleSelectRecipe(recipe.id)}
                      className="w-5 h-5"
                    />
                  </div>
                )}
                <div className="p-6">
                  <Link to={`/recipes/${recipe.id}`} className="block">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      {recipe.title}
                    </h3>
                    {recipe.description && (
                      <p className="text-text-secondary mb-4 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      <span>🍽️ {recipe.servings} servings</span>
                      {(recipe.prepTime ?? 0) > 0 && <span>⏱️ {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>}
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {(() => {
                          // When searching, ensure the matched tag is visible in the first 3 shown
                          const searchLower = search.toLowerCase().trim();
                          if (searchLower && !hasComma) {
                            const matchIdx = recipe.tags.findIndex(t => t.toLowerCase().includes(searchLower));
                            if (matchIdx >= 3) {
                              // Move matched tag into the visible set
                              const reordered = [...recipe.tags];
                              const [matched] = reordered.splice(matchIdx, 1);
                              reordered.splice(2, 0, matched); // Insert at position 3 (index 2)
                              return reordered.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant={tag.toLowerCase().includes(searchLower) ? 'green' : 'blue'}>{tag}</Badge>
                              ));
                            }
                            // Matched tag is already in first 3 — highlight it
                            return recipe.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant={tag.toLowerCase().includes(searchLower) ? 'green' : 'blue'}>{tag}</Badge>
                            ));
                          }
                          return recipe.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="blue">{tag}</Badge>
                          ));
                        })()}
                        {recipe.tags.length > 3 && (
                          <span className="text-xs text-text-muted self-center">+{recipe.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* Action buttons (active recipes only) */}
                  {activeTab === 'active' && !showBulkActions && (
                    <div className="mt-4 pt-4 border-t border-card-recipes-border flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddToMealPlan({ id: recipe.id, title: recipe.title });
                        }}
                      >
                        <CalendarPlus className="w-4 h-4 mr-1 inline" />
                        Meal Plan
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddToCollection({ id: recipe.id, title: recipe.title });
                        }}
                      >
                        <FolderPlus className="w-4 h-4 mr-1 inline" />
                        Collection
                      </Button>
                    </div>
                  )}

                  {/* Deleted Recipe Actions */}
                  {activeTab === 'deleted' && !showBulkActions && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border-default">
                      <Button
                        variant="success"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreRecipe(recipe.id);
                        }}
                        loading={restoreRecipe.isPending}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="danger"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentDelete(recipe.id);
                        }}
                        loading={permanentDeleteRecipe.isPending}
                      >
                        Delete Forever
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add to Meal Plan Modal */}
        {addToMealPlan && (
          <AddToMealPlanModal
            recipeId={addToMealPlan.id}
            recipeName={addToMealPlan.title}
            isOpen={true}
            onClose={() => setAddToMealPlan(null)}
          />
        )}

        {/* Add to Collection Modal */}
        {addToCollection && (
          <AddToCollectionModal
            recipeId={addToCollection.id}
            recipeName={addToCollection.title}
            isOpen={true}
            onClose={() => setAddToCollection(null)}
          />
        )}
      </div>
    </div>
  );
}
