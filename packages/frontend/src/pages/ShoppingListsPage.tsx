import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useShoppingLists,
  useGenerateShoppingList,
  useDeleteShoppingList,
  useCompleteShoppingList,
  useRestoreShoppingList,
  usePermanentDeleteShoppingList,
  useGenerateFromRecipes,
  useCreateCustomShoppingList,
} from '../hooks/useShoppingLists';
import { useMealPlans } from '../hooks/useMealPlans';
import ShoppingListBuilder from '../components/ShoppingListBuilder';
import type { CreateShoppingListFromRecipesInput, CreateCustomShoppingListInput } from '../types/shoppingList';
import { Trash2, X } from 'lucide-react';

type ShoppingListStatus = 'active' | 'completed' | 'deleted';

export default function ShoppingListsPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<ShoppingListStatus>('active');
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: shoppingLists, isLoading, error } = useShoppingLists(activeTab);
  const generateShoppingList = useGenerateShoppingList();
  const deleteShoppingList = useDeleteShoppingList();
  const completeShoppingList = useCompleteShoppingList();
  const restoreShoppingList = useRestoreShoppingList();
  const permanentDeleteShoppingList = usePermanentDeleteShoppingList();
  const generateFromRecipes = useGenerateFromRecipes();
  const createCustomShoppingList = useCreateCustomShoppingList();

  const handleCreateFromMealPlans = (mealPlanIds: string[], name?: string) => {
    generateShoppingList.mutate(
      { mealPlanIds, name },
      {
        onSuccess: () => {
          setShowBuilder(false);
        },
      }
    );
  };

  const handleCreateFromRecipes = (input: CreateShoppingListFromRecipesInput) => {
    generateFromRecipes.mutate(input, {
      onSuccess: () => {
        setShowBuilder(false);
      },
    });
  };

  const handleCreateCustom = (input: CreateCustomShoppingListInput) => {
    createCustomShoppingList.mutate(input, {
      onSuccess: () => {
        setShowBuilder(false);
      },
    });
  };

  const handleDelete = (id: string, listName?: string) => {
    const confirmMsg = listName
      ? `Delete shopping list "${listName}"?`
      : 'Delete this shopping list?';

    if (confirm(confirmMsg)) {
      deleteShoppingList.mutate(id);
    }
  };

  const handleComplete = (id: string, listName?: string) => {
    const confirmMsg = listName
      ? `Mark "${listName}" as completed?`
      : 'Mark this shopping list as completed?';

    if (confirm(confirmMsg)) {
      completeShoppingList.mutate(id);
    }
  };

  const handleRestore = (id: string, listName?: string) => {
    const confirmMsg = listName
      ? `Restore "${listName}" to active?`
      : 'Restore this shopping list to active?';

    if (confirm(confirmMsg)) {
      restoreShoppingList.mutate(id);
    }
  };

  const handlePermanentDelete = (id: string, listName?: string) => {
    const confirmMsg = listName
      ? `Permanently delete "${listName}"? This action cannot be undone.`
      : 'Permanently delete this shopping list? This action cannot be undone.';

    if (confirm(confirmMsg)) {
      permanentDeleteShoppingList.mutate(id);
    }
  };

  const handleTabChange = (tab: ShoppingListStatus) => {
    setActiveTab(tab);
    setSelectedLists(new Set());
    setShowBulkActions(false);
  };

  const handleSelectAll = () => {
    if (shoppingLists && selectedLists.size === shoppingLists.length) {
      setSelectedLists(new Set());
    } else if (shoppingLists) {
      setSelectedLists(new Set(shoppingLists.map(l => l.id)));
    }
  };

  const handleSelectList = (id: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLists(newSelected);
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedLists.size === 0) return;

    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedLists.size} shopping list(s)? This action cannot be undone!`)) {
      return;
    }

    setIsBulkDeleting(true);
    const ids = Array.from(selectedLists);
    let deleted = 0;

    for (const id of ids) {
      try {
        await permanentDeleteShoppingList.mutateAsync(id);
        deleted++;
      } catch {
        // continue with remaining
      }
    }

    setIsBulkDeleting(false);
    setSelectedLists(new Set());
    setShowBulkActions(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Lists</h1>
            <p className="text-gray-600 mt-1">
              {shoppingLists?.length || 0} shopping list(s)
              {selectedLists.size > 0 && ` • ${selectedLists.size} selected`}
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'deleted' && !showBulkActions && (
              <button
                onClick={() => setShowBulkActions(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Select to Delete Forever
              </button>
            )}
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Shopping List
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => handleTabChange('active')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'completed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => handleTabChange('deleted')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'deleted'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Deleted
            </button>
          </nav>
        </div>

        {/* Bulk Selection Bar */}
        {showBulkActions && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {shoppingLists && selectedLists.size === shoppingLists.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-700 font-medium">
                  {selectedLists.size} of {shoppingLists?.length || 0} selected
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkPermanentDelete}
                  disabled={selectedLists.size === 0 || isBulkDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {isBulkDeleting
                    ? 'Deleting...'
                    : `Permanently Delete ${selectedLists.size} List${selectedLists.size !== 1 ? 's' : ''}`
                  }
                </button>
                <button
                  onClick={() => {
                    setShowBulkActions(false);
                    setSelectedLists(new Set());
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shopping List Builder Modal */}
        <ShoppingListBuilder
          isOpen={showBuilder}
          onClose={() => setShowBuilder(false)}
          onCreateFromMealPlans={handleCreateFromMealPlans}
          onCreateFromRecipes={handleCreateFromRecipes}
          onCreateCustom={handleCreateCustom}
          isCreating={
            generateShoppingList.isPending ||
            generateFromRecipes.isPending ||
            createCustomShoppingList.isPending
          }
        />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Failed to load shopping lists. Please try again.
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading shopping lists...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!shoppingLists || shoppingLists.length === 0) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab} shopping lists
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'active'
                ? 'Create a shopping list from meal plans, recipes, or custom ingredients'
                : activeTab === 'completed'
                ? 'Completed shopping lists will appear here'
                : 'Deleted shopping lists will appear here'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setShowBuilder(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Shopping List
              </button>
            )}
          </div>
        )}

        {/* Shopping Lists Grid */}
        {!isLoading && shoppingLists && shoppingLists.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shoppingLists.map((list) => {
              const totalItems = list.items.length;
              const checkedItems = list.items.filter(item => item.checked).length;
              const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

              return (
                <div
                  key={list.id}
                  className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${
                    showBulkActions ? 'cursor-pointer' : ''
                  } ${selectedLists.has(list.id) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => showBulkActions && handleSelectList(list.id)}
                >
                  {showBulkActions && (
                    <div className="pb-2 mb-2 border-b border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedLists.has(list.id)}
                        onChange={() => handleSelectList(list.id)}
                        className="w-5 h-5"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {list.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Created {formatDate(list.createdAt)}
                      </p>
                      {list.mealPlan && (
                        <p className="text-xs text-gray-400 mt-1">
                          From: {list.mealPlan.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{checkedItems}/{totalItems} items</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Summary */}
                  {list.itemsByCategory && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(list.itemsByCategory).map((category) => (
                          <span
                            key={category}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {category} ({list.itemsByCategory![category].length})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/shopping-lists/${list.id}`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                    >
                      View
                    </Link>

                    {activeTab === 'active' && (
                      <>
                        <button
                          onClick={() => handleComplete(list.id, list.name)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          disabled={completeShoppingList.isPending}
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleDelete(list.id, list.name)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                          disabled={deleteShoppingList.isPending}
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {activeTab === 'completed' && (
                      <>
                        <button
                          onClick={() => handleRestore(list.id, list.name)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          disabled={restoreShoppingList.isPending}
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(list.id, list.name)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                          disabled={deleteShoppingList.isPending}
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {activeTab === 'deleted' && !showBulkActions && (
                      <>
                        <button
                          onClick={() => handleRestore(list.id, list.name)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          disabled={restoreShoppingList.isPending}
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(list.id, list.name)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          disabled={permanentDeleteShoppingList.isPending}
                        >
                          Permanent Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
