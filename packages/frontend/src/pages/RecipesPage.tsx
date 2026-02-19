import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes, useBulkImportRecipes, useBulkDeleteRecipes, useRestoreRecipe, usePermanentDeleteRecipe } from '../hooks/useRecipes';
import * as XLSX from 'xlsx';
import type { CreateRecipeInput } from '../types/recipe';
import { Button, Input, Badge, Alert } from '../components/ui';
import { recipesService } from '../services/recipes.service';
import { Download, CalendarPlus, Trash2, X } from 'lucide-react';
import AddToMealPlanModal from '../components/AddToMealPlanModal';

type TabType = 'active' | 'deleted';

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [addToMealPlan, setAddToMealPlan] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If the search contains commas, treat each part as a tag filter (AND logic)
  // Otherwise, use it as a general search (title, description, or tags)
  const hasComma = search.includes(',');
  const { data, isLoading, error } = useRecipes({
    search: !hasComma && search ? search : undefined,
    tags: hasComma ? search : undefined,
    status: activeTab
  });
  const bulkImport = useBulkImportRecipes();
  const bulkDelete = useBulkDeleteRecipes();
  const restoreRecipe = useRestoreRecipe();
  const permanentDeleteRecipe = usePermanentDeleteRecipe();

  const recipes = data?.recipes || [];

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Look for 'Recipes' sheet, fallback to first sheet if not found
      const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'recipes') || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Filter out instruction rows and empty rows
      const validRows = jsonData.filter((row: any) => {
        const title = row.Title || row.title || '';
        return title &&
               !title.includes('INSTRUCTIONS') &&
               !title.includes('READ THIS FIRST') &&
               typeof (row.Servings || row.servings) !== 'string';
      });

      if (validRows.length === 0) {
        alert('No valid recipes found in the file. Please check the format.');
        return;
      }

      const recipes: CreateRecipeInput[] = validRows.map((row: any) => {
        // Parse nutrition fields
        const nutrition = parseNutrition(row);

        return {
          title: row.Title || row.title || '',
          description: row.Description || row.description || '',
          servings: parseInt(row.Servings || row.servings) || 4,
          prepTime: parseInt(row.PrepTime || row.prepTime || row['Prep Time']) || 0,
          cookTime: parseInt(row.CookTime || row.cookTime || row['Cook Time']) || 0,
          imageUrl: row.ImageUrl || row.imageUrl || row['Image URL'] || undefined,
          instructions: (row.Instructions || row.instructions || '').split('\n').filter((i: string) => i.trim()),
          tags: (row.Tags || row.tags || '').split(',').map((t: string) => t.trim()).filter((t: string) => t),
          ingredients: parseIngredients(row.Ingredients || row.ingredients || ''),
          nutrition: nutrition,
        };
      });

      bulkImport.mutate(recipes, {
        onSuccess: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      });
    } catch (error) {
      alert('Failed to parse Excel file. Please check the format and ensure all required fields are filled.');
      console.error(error);
    }
  };

  const parseIngredients = (ingredientsStr: string) => {
    // Expected format: "2 cups flour; 1 tsp salt; 3 eggs"
    if (!ingredientsStr) return [];

    return ingredientsStr.split(';').map((ing: string) => {
      const parts = ing.trim().split(' ');
      if (parts.length < 3) return null;

      const quantity = parseFloat(parts[0]) || 1;
      const unit = parts[1];
      const name = parts.slice(2).join(' ');

      return { name, quantity, unit, notes: '' };
    }).filter((item): item is { name: string; quantity: number; unit: string; notes: string } => item !== null);
  };

  const parseNutrition = (row: any) => {
    const calories = parseFloat(row.Calories || row.calories || '');
    const protein = parseFloat(row.Protein || row.protein || '');
    const carbs = parseFloat(row.Carbs || row.carbs || '');
    const fat = parseFloat(row.Fat || row.fat || '');
    const fiber = parseFloat(row.Fiber || row.fiber || '');
    const sugar = parseFloat(row.Sugar || row.sugar || '');
    const sodium = parseFloat(row.Sodium || row.sodium || '');

    // Only return nutrition object if at least one field has a valid value
    const hasNutrition = !isNaN(calories) || !isNaN(protein) || !isNaN(carbs) ||
                         !isNaN(fat) || !isNaN(fiber) || !isNaN(sugar) || !isNaN(sodium);

    if (!hasNutrition) return undefined;

    return {
      calories: !isNaN(calories) ? calories : undefined,
      protein: !isNaN(protein) ? protein : undefined,
      carbs: !isNaN(carbs) ? carbs : undefined,
      fat: !isNaN(fat) ? fat : undefined,
      fiber: !isNaN(fiber) ? fiber : undefined,
      sugar: !isNaN(sugar) ? sugar : undefined,
      sodium: !isNaN(sodium) ? sodium : undefined,
    };
  };

  const handleExportRecipes = async () => {
    try {
      // Fetch all active recipes by paginating (backend caps limit at 100)
      const allRecipes: typeof recipes = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const result = await recipesService.list({ status: 'active', limit, offset });
        allRecipes.push(...result.recipes);
        if (allRecipes.length >= result.pagination.total) break;
        offset += limit;
      }

      if (allRecipes.length === 0) {
        alert('No recipes to export.');
        return;
      }

      // Map to the same format as the import template
      const exportData = allRecipes.map((recipe) => ({
        Title: recipe.title,
        Description: recipe.description || '',
        Servings: recipe.servings,
        PrepTime: recipe.prepTime || 0,
        CookTime: recipe.cookTime || 0,
        ImageUrl: recipe.imageUrl || '',
        Instructions: Array.isArray(recipe.instructions)
          ? recipe.instructions.join('\n')
          : (recipe.instructions || ''),
        Tags: recipe.tags.join(', '),
        Ingredients: (recipe.ingredients || [])
          .map((ri) => `${ri.quantity} ${ri.unit} ${ri.ingredient.name}`)
          .join('; '),
        Calories: recipe.nutrition?.calories ?? '',
        Protein: recipe.nutrition?.protein ?? '',
        Carbs: recipe.nutrition?.carbs ?? '',
        Fat: recipe.nutrition?.fat ?? '',
        Fiber: recipe.nutrition?.fiber ?? '',
        Sugar: recipe.nutrition?.sugar ?? '',
        Sodium: recipe.nutrition?.sodium ?? '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 25 },  // Title
        { wch: 40 },  // Description
        { wch: 10 },  // Servings
        { wch: 10 },  // PrepTime
        { wch: 10 },  // CookTime
        { wch: 40 },  // ImageUrl
        { wch: 50 },  // Instructions
        { wch: 30 },  // Tags
        { wch: 80 },  // Ingredients
        { wch: 10 },  // Calories
        { wch: 10 },  // Protein
        { wch: 10 },  // Carbs
        { wch: 10 },  // Fat
        { wch: 10 },  // Fiber
        { wch: 10 },  // Sugar
        { wch: 10 },  // Sodium
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Recipes');

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `recipes_export_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export recipes. Please try again.');
    }
  };

  const downloadTemplate = () => {
    // Recipe data sheet
    const template = [
      {
        Title: 'Spaghetti Carbonara',
        Description: 'Classic Italian pasta dish with eggs, cheese, and bacon',
        Servings: 4,
        PrepTime: 10,
        CookTime: 20,
        ImageUrl: '',
        Instructions: 'Step 1: Cook pasta in salted boiling water\nStep 2: Fry bacon until crispy\nStep 3: Mix eggs and cheese\nStep 4: Combine all ingredients off heat',
        Tags: 'Italian, pasta, dinner, quick',
        Ingredients: '400 grams spaghetti; 200 grams bacon; 4 large eggs; 100 grams parmesan cheese; 2 cloves garlic; 1 pinch black pepper',
        Calories: 650,
        Protein: 25,
        Carbs: 75,
        Fat: 28,
        Fiber: 3,
        Sugar: 2,
        Sodium: 890
      },
      {
        Title: 'Chocolate Chip Cookies',
        Description: 'Soft and chewy homemade cookies',
        Servings: 24,
        PrepTime: 15,
        CookTime: 12,
        ImageUrl: '',
        Instructions: 'Step 1: Mix butter and sugars\nStep 2: Add eggs and vanilla\nStep 3: Combine dry ingredients\nStep 4: Fold in chocolate chips\nStep 5: Bake at 180C',
        Tags: 'dessert, baking, cookies, sweet',
        Ingredients: '2 cups flour; 1 tsp baking soda; 1 cup butter; 1 cup sugar; 2 large eggs; 2 cups chocolate chips; 1 pinch salt',
        Calories: 150,
        Protein: 2,
        Carbs: 20,
        Fat: 7,
        Fiber: 1,
        Sugar: 12,
        Sodium: 95
      }
    ];

    // Instructions sheet
    const instructions = [
      {
        Section: 'GENERAL INSTRUCTIONS',
        Details: 'Fill in the Recipes sheet with your recipe data. Delete the example recipes before importing.'
      },
      { Section: '', Details: '' },
      {
        Section: 'BASIC FIELDS',
        Details: ''
      },
      {
        Section: 'Title',
        Details: 'Text (Required) - Name of the recipe (e.g., "Spaghetti Carbonara")'
      },
      {
        Section: 'Description',
        Details: 'Text - Brief description of the recipe (e.g., "Classic Italian pasta dish")'
      },
      {
        Section: 'Servings',
        Details: 'Number - How many servings the recipe makes (e.g., 4). Defaults to 4 if not specified.'
      },
      {
        Section: 'PrepTime',
        Details: 'Number - Preparation time in minutes (e.g., 15)'
      },
      {
        Section: 'CookTime',
        Details: 'Number - Cooking time in minutes (e.g., 30)'
      },
      {
        Section: 'ImageUrl',
        Details: 'Text - URL to an image of the recipe (e.g., "https://example.com/pasta.jpg"). Leave empty if no image.'
      },
      {
        Section: 'Instructions',
        Details: 'Text - Separate each step with \\n (e.g., "Step 1: Do this\\nStep 2: Do that")'
      },
      {
        Section: 'Tags',
        Details: 'Text - Comma-separated tags (e.g., "dinner, easy, quick")'
      },
      { Section: '', Details: '' },
      {
        Section: 'NUTRITION FIELDS (per serving)',
        Details: 'All nutrition fields are optional. Leave empty if unknown.'
      },
      {
        Section: 'Calories',
        Details: 'Number - Calories per serving (e.g., 650)'
      },
      {
        Section: 'Protein',
        Details: 'Number - Protein in grams per serving (e.g., 25)'
      },
      {
        Section: 'Carbs',
        Details: 'Number - Carbohydrates in grams per serving (e.g., 75)'
      },
      {
        Section: 'Fat',
        Details: 'Number - Fat in grams per serving (e.g., 28)'
      },
      {
        Section: 'Fiber',
        Details: 'Number - Fiber in grams per serving (e.g., 3)'
      },
      {
        Section: 'Sugar',
        Details: 'Number - Sugar in grams per serving (e.g., 2)'
      },
      {
        Section: 'Sodium',
        Details: 'Number - Sodium in milligrams per serving (e.g., 890)'
      },
      { Section: '', Details: '' },
      {
        Section: 'INGREDIENTS FORMAT - IMPORTANT!',
        Details: ''
      },
      {
        Section: 'Pattern',
        Details: '[quantity] [unit] [name]; [quantity] [unit] [name]; ...'
      },
      {
        Section: 'Separator',
        Details: 'Use semicolon (;) to separate each ingredient'
      },
      {
        Section: 'Quantity',
        Details: 'Number - Can be whole (2) or decimal (1.5, 0.25). Limited to 2 decimal places.'
      },
      {
        Section: 'Unit',
        Details: 'Text - Measurement unit (cups, tbsp, tsp, grams, kg, large, medium, small, pinch, dash, etc.)'
      },
      {
        Section: 'Name',
        Details: 'Text - The ingredient name, including any descriptors (e.g., "all-purpose flour", "extra virgin olive oil", "boneless chicken breast")'
      },
      { Section: '', Details: '' },
      {
        Section: 'INGREDIENT EXAMPLES',
        Details: ''
      },
      {
        Section: 'Example 1',
        Details: '2 cups all-purpose flour; 1.5 tsp salt; 200 grams chicken breast'
      },
      {
        Section: 'Example 2',
        Details: '3 large eggs; 1 pinch black pepper; 0.5 cup olive oil'
      },
      {
        Section: 'Example 3',
        Details: '400 grams spaghetti; 100 grams parmesan cheese; 2 cloves garlic'
      },
      { Section: '', Details: '' },
      {
        Section: 'COMMON MISTAKES',
        Details: ''
      },
      {
        Section: '❌ Wrong',
        Details: 'flour (missing quantity and unit)'
      },
      {
        Section: '❌ Wrong',
        Details: '2 flour (missing unit)'
      },
      {
        Section: '❌ Wrong',
        Details: 'cups flour (missing quantity)'
      },
      {
        Section: '✓ Correct',
        Details: '2 cups flour'
      }
    ];

    const wb = XLSX.utils.book_new();

    // Add Instructions sheet first
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [
      { wch: 30 }, // Section
      { wch: 100 } // Details
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Add Recipes sheet
    const wsRecipes = XLSX.utils.json_to_sheet(template);
    wsRecipes['!cols'] = [
      { wch: 25 }, // Title
      { wch: 40 }, // Description
      { wch: 10 }, // Servings
      { wch: 10 }, // PrepTime
      { wch: 10 }, // CookTime
      { wch: 40 }, // ImageUrl
      { wch: 50 }, // Instructions
      { wch: 30 }, // Tags
      { wch: 80 }, // Ingredients
      { wch: 10 }, // Calories
      { wch: 10 }, // Protein
      { wch: 10 }, // Carbs
      { wch: 10 }, // Fat
      { wch: 10 }, // Fiber
      { wch: 10 }, // Sugar
      { wch: 10 }  // Sodium
    ];
    XLSX.utils.book_append_sheet(wb, wsRecipes, 'Recipes');

    XLSX.writeFile(wb, 'recipe_import_template.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Recipes</h1>
            <p className="text-gray-600 mt-1">
              {data?.pagination.total || 0} recipes total
              {selectedRecipes.size > 0 && ` • ${selectedRecipes.size} selected`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {!showBulkActions && (
              <Button
                variant="danger"
                onClick={() => setShowBulkActions(true)}
              >
                <Trash2 className="w-4 h-4 mr-1 inline" />
                {activeTab === 'deleted' ? 'Select to Delete Forever' : 'Select to Delete'}
              </Button>
            )}
            <Button variant="secondary" onClick={handleExportRecipes}>
              <Download className="w-4 h-4 mr-1 inline" />
              Export Recipes
            </Button>
            <Button variant="success" onClick={downloadTemplate}>
              Download Template
            </Button>
            <label className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 cursor-pointer">
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
            <Link
              to="/recipes/import-urls"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700"
            >
              Import from URLs
            </Link>
            <Link
              to="/recipes/new"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              + Create Recipe
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Recipes
          </button>
          <button
            onClick={() => handleTabChange('deleted')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'deleted'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
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
                <span className="text-sm text-gray-700 font-medium">
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

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search by title, description, tag, or ingredient — use commas for multi-tag filter (e.g. Greek, Main Dishes)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3"
          />
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
              <p className="text-gray-600">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No recipes found
              </h3>
              <p className="text-gray-600 mb-6">
                {search ? 'Try a different search term' : 'Get started by creating your first recipe'}
              </p>
              <Link
                to="/recipes/new"
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-6 py-3 text-base bg-blue-600 text-white hover:bg-blue-700"
              >
                Create Recipe
              </Link>
            </div>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
                  showBulkActions ? 'cursor-pointer' : ''
                } ${selectedRecipes.has(recipe.id) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => showBulkActions && handleSelectRecipe(recipe.id)}
              >
                {showBulkActions && (
                  <div className="p-2 border-b border-gray-200">
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {recipe.title}
                    </h3>
                    {recipe.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>🍽️ {recipe.servings} servings</span>
                      {(recipe.prepTime ?? 0) > 0 && <span>⏱️ {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>}
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="blue">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </Link>

                  {/* Add to Meal Plan button (active recipes only) */}
                  {activeTab === 'active' && !showBulkActions && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddToMealPlan({ id: recipe.id, title: recipe.title });
                        }}
                      >
                        <CalendarPlus className="w-4 h-4 mr-1 inline" />
                        Add to Meal Plan
                      </Button>
                    </div>
                  )}

                  {/* Deleted Recipe Actions */}
                  {activeTab === 'deleted' && !showBulkActions && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
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
      </div>
    </div>
  );
}
