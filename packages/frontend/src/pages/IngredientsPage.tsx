import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIngredients, useIngredientRecipes, useUpdateIngredient, useDeleteIngredient, useBulkDeleteIngredients } from '../hooks/useIngredients';
import type { Ingredient } from '../types/recipe';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import ReplaceIngredientModal from '../components/ReplaceIngredientModal';
import Modal from '../components/ui/Modal';

export default function IngredientsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [replaceModalState, setReplaceModalState] = useState<{
    ingredientId: string;
    ingredientName: string;
    recipeCount: number;
    shoppingListCount: number;
  } | null>(null);
  const [selectedIngredientForRecipes, setSelectedIngredientForRecipes] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: ingredients, isLoading, error } = useIngredients(search || undefined, categoryFilter || undefined);
  const { data: ingredientRecipes, isLoading: recipesLoading } = useIngredientRecipes(selectedIngredientForRecipes?.id);
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const bulkDelete = useBulkDeleteIngredients();

  const handleSelectAll = () => {
    if (ingredients && selectedIngredients.size === ingredients.length) {
      setSelectedIngredients(new Set());
    } else if (ingredients) {
      setSelectedIngredients(new Set(ingredients.map(i => i.id)));
    }
  };

  const handleSelectIngredient = (id: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIngredients(newSelected);
  };

  const handleStartEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setEditName(ingredient.name);
    setEditCategory(ingredient.category || '');
    setEditTags(ingredient.tags || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
    setEditTags('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    updateIngredient.mutate(
      {
        id,
        input: {
          name: editName.trim(),
          category: editCategory.trim() || undefined,
          tags: editTags.trim() || ''
        }
      },
      {
        onSuccess: () => {
          handleCancelEdit();
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    const ingredient = ingredients?.find(i => i.id === id);

    deleteIngredient.mutate(id, {
      onError: (error: any) => {
        const responseData = error.response?.data;

        if (responseData?.code === 'INGREDIENT_IN_USE') {
          setReplaceModalState({
            ingredientId: id,
            ingredientName: ingredient?.name || 'Unknown',
            recipeCount: responseData.data?.recipeCount || 0,
            shoppingListCount: responseData.data?.shoppingListCount || 0,
          });
        } else {
          const message = responseData?.message || error.message || 'Failed to delete ingredient';
          toast.error(message);
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIngredients.size === 0) {
      alert('Please select ingredients to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIngredients.size} ingredient(s)?`)) {
      return;
    }

    bulkDelete.mutate(Array.from(selectedIngredients), {
      onSuccess: () => {
        setSelectedIngredients(new Set());
        setShowBulkActions(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Ingredients</h1>
            <p className="text-text-secondary mt-1">
              {ingredients?.length || 0} ingredients total
              {selectedIngredients.size > 0 && ` • ${selectedIngredients.size} selected`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <span className="px-4 py-2 rounded-lg bg-border-default text-text-muted cursor-default">
              Bulk Actions
            </span>
            <span className="px-4 py-2 rounded-lg bg-border-default text-text-muted cursor-default flex items-center">
              <Download className="w-4 h-4 mr-1" />
              Export Ingredients
            </span>
            <span className="px-4 py-2 rounded-lg bg-border-default text-text-muted cursor-default">
              Download Template
            </span>
            <span className="px-4 py-2 rounded-lg bg-border-default text-text-muted cursor-default">
              Import Excel
            </span>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-accent-light border border-accent rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-btn-primary text-white rounded-lg hover:bg-btn-primary-hover"
                >
                  {ingredients && selectedIngredients.size === ingredients.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIngredients.size === 0 || bulkDelete.isPending}
                  className="px-4 py-2 bg-btn-danger text-white rounded-lg hover:bg-btn-danger-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDelete.isPending ? 'Deleting...' : `Delete Selected (${selectedIngredients.size})`}
                </button>
              </div>
              <p className="text-sm text-text-secondary">
                Click on ingredients to select them for bulk operations
              </p>
            </div>
          </div>
        )}

        {/* Search Bar + Category Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search ingredients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-ring bg-surface text-text-primary sm:min-w-[180px]"
          >
            <option value="">All categories</option>
            <option value="dairy">Dairy</option>
            <option value="grains">Grains</option>
            <option value="herbs">Herbs</option>
            <option value="meat">Meat</option>
            <option value="nuts">Nuts</option>
            <option value="oils">Oils</option>
            <option value="pantry">Pantry</option>
            <option value="produce">Produce</option>
            <option value="pulses">Pulses</option>
            <option value="seafood">Seafood</option>
            <option value="spices">Spices</option>
            <option value="uncategorized">Uncategorized</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Failed to load ingredients. Please try again.
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-text-secondary">Loading ingredients...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!ingredients || ingredients.length === 0) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🥕</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No ingredients found
            </h3>
            <p className="text-text-secondary mb-6">
              {search ? 'Try a different search term' : 'Import ingredients using the Excel template'}
            </p>
          </div>
        )}

        {/* Ingredients Table */}
        {!isLoading && ingredients && ingredients.length > 0 && (
          <div className="bg-surface rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-border-default">
              <thead className="bg-page-bg">
                <tr>
                  {showBulkActions && (
                    <th scope="col" className="w-12 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIngredients.size === ingredients.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border-default">
                {ingredients.map((ingredient) => {
                  const isEditing = editingId === ingredient.id;

                  return (
                    <tr
                      key={ingredient.id}
                      className={`hover:bg-page-bg cursor-pointer ${
                        selectedIngredients.has(ingredient.id) ? 'bg-accent-light' : ''
                      }`}
                      onClick={() => {
                        if (showBulkActions) {
                          handleSelectIngredient(ingredient.id);
                        } else if (!editingId) {
                          setSelectedIngredientForRecipes({ id: ingredient.id, name: ingredient.name });
                        }
                      }}
                    >
                      {showBulkActions && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIngredients.has(ingredient.id)}
                            onChange={() => handleSelectIngredient(ingredient.id)}
                            className="w-4 h-4"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-border-strong rounded focus:outline-none focus:ring-2 focus:ring-accent-ring"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!showBulkActions) {
                                setSelectedIngredientForRecipes({ id: ingredient.id, name: ingredient.name });
                              }
                            }}
                            className={`text-left ${!showBulkActions ? 'text-accent hover:text-accent-hover hover:underline cursor-pointer' : ''}`}
                            disabled={showBulkActions}
                          >
                            {ingredient.name}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Category"
                            className="w-full px-2 py-1 border border-border-strong rounded focus:outline-none focus:ring-2 focus:ring-accent-ring"
                          />
                        ) : ingredient.category ? (
                          <span className="px-2 py-1 bg-hover-bg text-text-primary rounded-full text-xs">
                            {ingredient.category}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Tags (comma-separated)"
                            className="w-full px-2 py-1 border border-border-strong rounded focus:outline-none focus:ring-2 focus:ring-accent-ring"
                          />
                        ) : ingredient.tags && ingredient.tags.trim() ? (
                          <div className="flex flex-wrap gap-1">
                            {ingredient.tags.split(',').filter(t => t.trim()).map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 bg-accent-light text-accent rounded-full text-xs">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-mono">
                        {ingredient.id.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(ingredient.id);
                              }}
                              className="text-green-600 hover:text-green-900"
                              disabled={updateIngredient.isPending}
                            >
                              Save
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="text-text-secondary hover:text-text-primary"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(ingredient);
                              }}
                              className="text-accent hover:text-accent-hover"
                              disabled={showBulkActions}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ingredient.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              disabled={deleteIngredient.isPending || showBulkActions}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {replaceModalState && (
        <ReplaceIngredientModal
          ingredientId={replaceModalState.ingredientId}
          ingredientName={replaceModalState.ingredientName}
          usageCount={replaceModalState.recipeCount}
          shoppingListCount={replaceModalState.shoppingListCount}
          isOpen={true}
          onClose={() => setReplaceModalState(null)}
        />
      )}

      {/* Recipes Modal */}
      {selectedIngredientForRecipes && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedIngredientForRecipes(null)}
          title={`Recipes using "${selectedIngredientForRecipes.name}"`}
          size="lg"
        >
          {recipesLoading ? (
            <div className="text-center py-8">
              <p className="text-text-muted">Loading recipes...</p>
            </div>
          ) : !ingredientRecipes || ingredientRecipes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-text-muted">No recipes use this ingredient</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-muted mb-4">
                Found in {ingredientRecipes.length} recipe{ingredientRecipes.length !== 1 ? 's' : ''}
              </p>
              <div className="divide-y divide-border-default">
                {ingredientRecipes.map((recipe) => (
                  <div key={recipe.recipeId} className="py-3 flex items-center justify-between">
                    <div>
                      <Link
                        to={`/recipes/${recipe.recipeId}`}
                        className="text-accent hover:text-accent-hover hover:underline font-medium"
                        onClick={() => setSelectedIngredientForRecipes(null)}
                      >
                        {recipe.recipeTitle}
                      </Link>
                      <p className="text-sm text-text-muted mt-0.5">
                        {recipe.quantity} {recipe.unit}
                        {recipe.notes ? ` — ${recipe.notes}` : ''}
                        {recipe.servings ? ` (${recipe.servings} servings)` : ''}
                      </p>
                    </div>
                    {recipe.tags && (
                      <div className="flex flex-wrap gap-1 ml-4">
                        {recipe.tags.split(',').filter(t => t.trim()).slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-hover-bg text-text-secondary rounded-full text-xs">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
