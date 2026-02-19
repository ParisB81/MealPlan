import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useIngredients, useIngredientRecipes, useUpdateIngredient, useDeleteIngredient, useBulkImportIngredients, useBulkDeleteIngredients } from '../hooks/useIngredients';
import * as XLSX from 'xlsx';
import type { CreateIngredientInput } from '../services/ingredients.service';
import { ingredientsService } from '../services/ingredients.service';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const bulkImport = useBulkImportIngredients();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Look for 'Ingredients' sheet, fallback to first sheet
      const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'ingredients') || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Filter out instruction rows and empty rows
      const validRows = jsonData.filter((row: any) => {
        const name = row.Name || row.name || '';
        return name && !name.includes('INSTRUCTIONS') && !name.includes('READ THIS FIRST');
      });

      if (validRows.length === 0) {
        alert('No valid ingredients found in the file. Please check the format.');
        return;
      }

      const ingredientsData: CreateIngredientInput[] = validRows.map((row: any) => ({
        name: (row.Name || row.name || '').toLowerCase(),
        category: row.Category || row.category || undefined,
        tags: row.Tags || row.tags || '',
      }));

      bulkImport.mutate(ingredientsData, {
        onSuccess: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      });
    } catch (error) {
      alert('Failed to parse Excel file. Please check the format.');
      console.error(error);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        Name: 'tomato',
        Category: 'produce',
        Tags: 'fresh,seasonal'
      },
      {
        Name: 'chicken breast',
        Category: 'meat',
        Tags: 'protein,main'
      },
      {
        Name: 'olive oil',
        Category: 'pantry',
        Tags: 'cooking,essential'
      },
      {
        Name: 'garlic',
        Category: 'produce',
        Tags: 'fresh,aromatic'
      },
      {
        Name: 'parmesan cheese',
        Category: 'dairy',
        Tags: 'cheese,italian'
      }
    ];

    const instructions = [
      {
        Name: 'INSTRUCTIONS - READ THIS FIRST',
        Category: 'Column formats and examples',
        Tags: 'Important information'
      },
      {
        Name: 'INGREDIENT NAME FORMAT',
        Category: 'Use lowercase, singular form (e.g., "tomato", "chicken breast", "olive oil")',
        Tags: 'Required field'
      },
      {
        Name: 'CATEGORY OPTIONS',
        Category: 'produce, meat, dairy, pantry, spices, beverages, frozen, bakery, or leave blank',
        Tags: 'Optional field'
      },
      {
        Name: 'TAGS FORMAT',
        Category: 'Comma-separated tags (e.g., "fresh,seasonal" or "protein,main")',
        Tags: 'Optional, no spaces after commas'
      },
      {
        Name: '',
        Category: '',
        Tags: ''
      }
    ];

    const wb = XLSX.utils.book_new();

    // Add Instructions sheet
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [
      { wch: 40 },
      { wch: 80 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Add Ingredients sheet
    const wsIngredients = XLSX.utils.json_to_sheet(template);
    wsIngredients['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsIngredients, 'Ingredients');

    XLSX.writeFile(wb, 'ingredients_import_template.xlsx');
  };

  const handleExportIngredients = async () => {
    try {
      // Fetch all ingredients (no search filter)
      const allIngredients = await ingredientsService.list();

      if (allIngredients.length === 0) {
        alert('No ingredients to export.');
        return;
      }

      // Map to the same format as the import template
      const exportData = allIngredients.map((ingredient) => ({
        Name: ingredient.name,
        Category: ingredient.category || '',
        Tags: ingredient.tags || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 30 },  // Name
        { wch: 20 },  // Category
        { wch: 30 },  // Tags
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `ingredients_export_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export ingredients. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Ingredients</h1>
            <p className="text-gray-600 mt-1">
              {ingredients?.length || 0} ingredients total
              {selectedIngredients.size > 0 && ` • ${selectedIngredients.size} selected`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showBulkActions
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showBulkActions ? 'Cancel Selection' : 'Bulk Actions'}
            </button>
            <button
              onClick={handleExportIngredients}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Export Ingredients
            </button>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Download Template
            </button>
            <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
              Import Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={bulkImport.isPending}
              />
            </label>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {ingredients && selectedIngredients.size === ingredients.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIngredients.size === 0 || bulkDelete.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDelete.isPending ? 'Deleting...' : `Delete Selected (${selectedIngredients.size})`}
                </button>
              </div>
              <p className="text-sm text-gray-600">
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 sm:min-w-[180px]"
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
            <p className="text-gray-600">Loading ingredients...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!ingredients || ingredients.length === 0) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🥕</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No ingredients found
            </h3>
            <p className="text-gray-600 mb-6">
              {search ? 'Try a different search term' : 'Import ingredients using the Excel template'}
            </p>
          </div>
        )}

        {/* Ingredients Table */}
        {!isLoading && ingredients && ingredients.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingredients.map((ingredient) => {
                  const isEditing = editingId === ingredient.id;

                  return (
                    <tr
                      key={ingredient.id}
                      className={`hover:bg-gray-50 ${
                        showBulkActions ? 'cursor-pointer' : ''
                      } ${selectedIngredients.has(ingredient.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => showBulkActions && handleSelectIngredient(ingredient.id)}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className={`text-left ${!showBulkActions ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : ''}`}
                            disabled={showBulkActions}
                          >
                            {ingredient.name}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Category"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : ingredient.category ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {ingredient.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Tags (comma-separated)"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : ingredient.tags && ingredient.tags.trim() ? (
                          <div className="flex flex-wrap gap-1">
                            {ingredient.tags.split(',').filter(t => t.trim()).map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
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
                              className="text-gray-600 hover:text-gray-900"
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
                              className="text-blue-600 hover:text-blue-900"
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
              <p className="text-gray-500">Loading recipes...</p>
            </div>
          ) : !ingredientRecipes || ingredientRecipes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">No recipes use this ingredient</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Found in {ingredientRecipes.length} recipe{ingredientRecipes.length !== 1 ? 's' : ''}
              </p>
              <div className="divide-y divide-gray-200">
                {ingredientRecipes.map((recipe) => (
                  <div key={recipe.recipeId} className="py-3 flex items-center justify-between">
                    <div>
                      <Link
                        to={`/recipes/${recipe.recipeId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        onClick={() => setSelectedIngredientForRecipes(null)}
                      >
                        {recipe.recipeTitle}
                      </Link>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {recipe.quantity} {recipe.unit}
                        {recipe.notes ? ` — ${recipe.notes}` : ''}
                        {recipe.servings ? ` (${recipe.servings} servings)` : ''}
                      </p>
                    </div>
                    {recipe.tags && (
                      <div className="flex flex-wrap gap-1 ml-4">
                        {recipe.tags.split(',').filter(t => t.trim()).slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
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
