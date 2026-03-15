import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useRecipe, useCreateRecipe, useUpdateRecipe } from '../hooks/useRecipes';
import type { CreateRecipeInput, Recipe } from '../types/recipe';
import type { ApiError } from '../services/api';
import RecipePicker from '../components/RecipePicker';
import IngredientAutocomplete from '../components/IngredientAutocomplete';
import UnitAutocomplete from '../components/UnitAutocomplete';
import TagAutocomplete from '../components/TagAutocomplete';
import { getCategoryForTag } from '../data/tagDefinitions';
import { Button, Card, Input, TextArea, Badge, Alert } from '../components/ui';
import toast from 'react-hot-toast';

/**
 * Converts a Zod error path like "ingredients.0.unit" into a human-readable label
 * like "Ingredient #1 → Unit"
 */
function formatErrorPath(path: string): string {
  const parts = path.split('.');
  const labels: string[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (part === 'ingredients' && i + 1 < parts.length && /^\d+$/.test(parts[i + 1])) {
      const idx = parseInt(parts[i + 1], 10) + 1;
      labels.push(`Ingredient #${idx}`);
      i += 2;
      // If there's a field name after the index
      if (i < parts.length) {
        const field = parts[i];
        const fieldLabels: Record<string, string> = {
          name: 'Name', quantity: 'Quantity', unit: 'Unit', notes: 'Notes',
        };
        labels.push(fieldLabels[field] || field);
        i++;
      }
    } else if (part === 'instructions' && i + 1 < parts.length && /^\d+$/.test(parts[i + 1])) {
      const idx = parseInt(parts[i + 1], 10) + 1;
      labels.push(`Instruction step #${idx}`);
      i += 2;
    } else if (part === 'nutrition' && i + 1 < parts.length) {
      const field = parts[i + 1];
      labels.push(`Nutrition → ${field.charAt(0).toUpperCase() + field.slice(1)}`);
      i += 2;
    } else {
      labels.push(part.charAt(0).toUpperCase() + part.slice(1));
      i++;
    }
  }

  return labels.join(' → ');
}

// --- Tabbed form ---
type RecipeFormTab = 'details' | 'ingredients' | 'instructions' | 'nutrition';

const FORM_TABS: { id: RecipeFormTab; label: string; mobileLabel: string }[] = [
  { id: 'details', label: 'Details', mobileLabel: 'Details' },
  { id: 'ingredients', label: 'Ingredients', mobileLabel: 'Ingred.' },
  { id: 'instructions', label: 'Instructions', mobileLabel: 'Steps' },
  { id: 'nutrition', label: 'Nutrition', mobileLabel: 'Nutri.' },
];

function getTabForError(errorPath: string): RecipeFormTab | null {
  if (errorPath === '_general') return null;
  if (errorPath.startsWith('ingredients')) return 'ingredients';
  if (errorPath.startsWith('instructions')) return 'instructions';
  if (errorPath.startsWith('nutrition')) return 'nutrition';
  return 'details';
}

function getTabsWithErrors(errors: Record<string, string>): Set<RecipeFormTab> {
  const tabs = new Set<RecipeFormTab>();
  for (const path of Object.keys(errors)) {
    const tab = getTabForError(path);
    if (tab) tabs.add(tab);
  }
  return tabs;
}

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = id !== 'new' && !!id;

  const { data: recipe } = useRecipe(isEditing ? id : undefined);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  const [formData, setFormData] = useState<CreateRecipeInput>({
    title: '',
    description: '',
    servings: 4,
    prepTime: 0,
    cookTime: 0,
    instructions: [''],
    tags: [],
    ingredients: [{ name: '', quantity: 1, unit: '', notes: '' }],
    nutrition: undefined,
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [activeTab, setActiveTab] = useState<RecipeFormTab>('details');

  const tabsWithErrors = getTabsWithErrors(errors);

  // Store returnTo info from location state (for AI wizard round-trip)
  const [returnTo] = useState(() => location.state?.returnTo as string | undefined);
  const [returnTempKey] = useState(() => location.state?.tempKey as string | undefined);

  // Store source info from location state (for URL import round-trip)
  const [importSource] = useState(() => location.state?.source as string | undefined);
  const [importIndex] = useState(() => location.state?.importIndex as number | undefined);

  // Prefill form from URL import or AI wizard (via React Router location state)
  useEffect(() => {
    if (!isEditing && location.state?.prefill) {
      const prefill = location.state.prefill as CreateRecipeInput;
      setFormData(prefill);
      setIsPrefilled(true);
      // Clear location state to prevent re-fill on refresh
      window.history.replaceState({}, document.title);
    }
  }, [isEditing, location.state]);

  // Load recipe data when editing
  useEffect(() => {
    if (recipe && isEditing) {
      setFormData({
        title: recipe.title,
        description: recipe.description || '',
        servings: recipe.servings,
        prepTime: recipe.prepTime || 0,
        cookTime: recipe.cookTime || 0,
        instructions: recipe.instructions,
        tags: recipe.tags,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.ingredient.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || '',
        })),
        nutrition: recipe.nutrition ? {
          calories: recipe.nutrition.calories,
          protein: recipe.nutrition.protein,
          carbs: recipe.nutrition.carbs,
          fat: recipe.nutrition.fat,
          fiber: recipe.nutrition.fiber,
          sugar: recipe.nutrition.sugar,
          sodium: recipe.nutrition.sodium,
        } : undefined,
      });
    }
  }, [recipe, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors

    // Filter out empty instructions and ingredients
    const cleanedData = {
      ...formData,
      instructions: formData.instructions.filter((i) => i.trim()),
      ingredients: formData.ingredients.filter(
        (i) => i.name.trim() && i.unit.trim()
      ),
      // Only include nutrition if at least one field has a value, and remove undefined fields
      nutrition: formData.nutrition && Object.values(formData.nutrition).some(v => v !== undefined && v !== null)
        ? Object.fromEntries(
            Object.entries(formData.nutrition).filter(([_, v]) => v !== undefined && v !== null)
          )
        : undefined,
    };

    // Validate before submission
    const validationErrors: Record<string, string> = {};

    if (cleanedData.instructions.length === 0) {
      validationErrors.instructions = 'At least one instruction is required';
    }

    if (cleanedData.ingredients.length === 0) {
      validationErrors.ingredients = 'At least one ingredient is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Auto-switch to first tab with errors
      const errorTabs = getTabsWithErrors(validationErrors);
      if (errorTabs.size > 0 && !errorTabs.has(activeTab)) {
        const firstErrorTab = FORM_TABS.find(t => errorTabs.has(t.id));
        if (firstErrorTab) setActiveTab(firstErrorTab.id);
      }
      return;
    }

    const onError = (error: Error) => {
      const apiErr = error as ApiError;
      const backendFieldErrors = apiErr.response?.data?.errors;

      if (Array.isArray(backendFieldErrors) && backendFieldErrors.length > 0) {
        // Store both the raw path (for row highlighting) and human-readable version
        const newErrors: Record<string, string> = {};
        backendFieldErrors.forEach((err: { path: string; message: string }) => {
          // Use raw path as key, with human-readable label as value
          newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        // Auto-switch to first tab with errors
        const errorTabs = getTabsWithErrors(newErrors);
        if (errorTabs.size > 0 && !errorTabs.has(activeTab)) {
          const firstErrorTab = FORM_TABS.find(t => errorTabs.has(t.id));
          if (firstErrorTab) setActiveTab(firstErrorTab.id);
        }
      } else {
        // Generic error (non-validation)
        setErrors({ _general: apiErr.message || 'An unexpected error occurred' });
      }
    };

    if (isEditing && id) {
      updateRecipe.mutate(
        { id, input: cleanedData },
        {
          onSuccess: () => {
            navigate(`/recipes/${id}`);
          },
          onError,
        }
      );
    } else {
      createRecipe.mutate(cleanedData, {
        onSuccess: (data) => {
          if (returnTo) {
            // Navigate back to AI wizard with created recipe info
            navigate(returnTo, {
              state: {
                createdRecipeId: data.id,
                tempKey: returnTempKey,
              },
            });
          } else if (importSource === 'urlImport') {
            // Navigate back to URL import page with imported index
            toast.success('Recipe saved! Returning to import page...');
            navigate('/recipes/import-urls', {
              state: { importedIndex: importIndex },
            });
          } else {
            navigate(`/recipes/${data.id}`);
          }
        },
        onError,
      });
    }
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ''],
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index),
    });
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { name: '', quantity: 1, unit: '', notes: '' },
      ],
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSelectExistingRecipe = (selectedRecipe: Recipe) => {
    setFormData({
      title: selectedRecipe.title + '*',
      description: selectedRecipe.description || '',
      servings: selectedRecipe.servings,
      prepTime: selectedRecipe.prepTime || 0,
      cookTime: selectedRecipe.cookTime || 0,
      instructions: selectedRecipe.instructions,
      tags: selectedRecipe.tags,
      ingredients: selectedRecipe.ingredients.map((ing) => ({
        name: ing.ingredient.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || '',
      })),
      nutrition: selectedRecipe.nutrition ? {
        calories: selectedRecipe.nutrition.calories,
        protein: selectedRecipe.nutrition.protein,
        carbs: selectedRecipe.nutrition.carbs,
        fat: selectedRecipe.nutrition.fat,
        fiber: selectedRecipe.nutrition.fiber,
        sugar: selectedRecipe.nutrition.sugar,
        sodium: selectedRecipe.nutrition.sodium,
      } : undefined,
    });
    setShowRecipePicker(false);
    setErrors({}); // Clear any errors
  };

  const updateNutrition = (field: string, value: number | undefined) => {
    const currentNutrition = formData.nutrition || {};
    const updatedNutrition = {
      ...currentNutrition,
      [field]: value,
    };

    setFormData({
      ...formData,
      nutrition: updatedNutrition,
    });
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        <Link
          to="/recipes"
          className="inline-flex items-center text-accent hover:text-accent-hover mb-6"
        >
          ← Back to Recipes
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            {isEditing ? 'Edit Recipe' : 'Create New Recipe'}
          </h1>
          {!isEditing && (
            <Button
              variant="success"
              onClick={() => setShowRecipePicker(true)}
            >
              Start from existing recipe
            </Button>
          )}
        </div>

        {/* Prefill info banner */}
        {isPrefilled && (
          <Alert variant="info" className="mb-6" onDismiss={() => setIsPrefilled(false)}>
            Imported from URL — review and edit before saving.
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* General Error Message */}
          {Object.keys(errors).length > 0 && (() => {
            // Backend field errors (excluding client-side "at least one" checks which display inline)
            const backendErrors = Object.entries(errors).filter(
              ([k]) => k !== 'ingredients' && k !== 'instructions' && k !== '_general'
            );
            const generalError = errors._general;
            const hasBackendErrors = backendErrors.length > 0;

            // Only show the top alert for backend field errors or general errors
            if (!hasBackendErrors && !generalError) return null;

            return (
              <Alert variant="error" title="Validation Errors:">
                {generalError && <p>{generalError}</p>}
                {hasBackendErrors && (
                  <ul className="list-disc list-inside space-y-1">
                    {backendErrors.map(([path, message]) => (
                      <li key={path}>
                        <span className="font-medium">{formatErrorPath(path)}:</span> {message}
                      </li>
                    ))}
                  </ul>
                )}
              </Alert>
            );
          })()}

          {/* Tab Bar */}
          <div className="sticky top-14 z-30 bg-page-bg pt-2 -mx-4 px-4">
            <div className="flex border-b border-border-default">
              {FORM_TABS.map((tab) => {
                const hasError = tabsWithErrors.has(tab.id);
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 md:flex-none px-3 md:px-5 py-2.5 text-sm font-medium transition-colors text-center relative ${
                      isActive
                        ? 'text-accent border-b-2 border-accent'
                        : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
                    }`}
                  >
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.mobileLabel}</span>
                    {hasError && (
                      <span className="absolute -top-0.5 right-0.5 md:relative md:top-auto md:right-auto md:ml-1.5 w-2 h-2 bg-red-500 rounded-full inline-block" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">Basic Information</h2>

            <Input
              label="Title *"
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />

            <TextArea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Servings"
                type="number"
                min={1}
                value={formData.servings}
                onChange={(e) =>
                  setFormData({ ...formData, servings: parseInt(e.target.value) })
                }
              />
              <Input
                label="Prep Time (min)"
                type="number"
                min={0}
                value={formData.prepTime}
                onChange={(e) =>
                  setFormData({ ...formData, prepTime: parseInt(e.target.value) || 0 })
                }
              />
              <Input
                label="Cook Time (min)"
                type="number"
                min={0}
                value={formData.cookTime}
                onChange={(e) =>
                  setFormData({ ...formData, cookTime: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <TagAutocomplete
                  value={tagInput}
                  onChange={setTagInput}
                  onSelectTag={(tag) => {
                    if (!formData.tags.includes(tag)) {
                      setFormData({ ...formData, tags: [...formData.tags, tag] });
                    }
                    setTagInput('');
                  }}
                  onAddCustomTag={addTag}
                  existingTags={formData.tags}
                  placeholder="Add a tag..."
                  className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-ring"
                />
                <Button variant="secondary" onClick={addTag} type="button">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => {
                  const category = getCategoryForTag(tag);
                  return (
                    <Badge key={tag} variant={category?.color || 'blue'} size="md" removable onRemove={() => removeTag(tag)}>
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </Card>
          )}

          {activeTab === 'ingredients' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Ingredients</h2>
              <Button variant="secondary" onClick={addIngredient} type="button">
                + Add Ingredient
              </Button>
            </div>
            {errors.ingredients && (
              <Alert variant="error" className="mb-3">
                {errors.ingredients}
              </Alert>
            )}

            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => {
                // Find any errors for this ingredient row
                const rowErrors = Object.entries(errors).filter(
                  ([path]) => path.startsWith(`ingredients.${index}.`)
                );
                const hasRowError = rowErrors.length > 0;
                const fieldWithError = (field: string) =>
                  errors[`ingredients.${index}.${field}`];

                return (
                  <div key={index}>
                    <div className={`flex flex-col sm:flex-row gap-2 ${hasRowError ? 'ring-2 ring-red-300 rounded-lg p-2 bg-red-50' : ''}`}>
                      <IngredientAutocomplete
                        value={ingredient.name}
                        onChange={(value) => updateIngredient(index, 'name', value)}
                        placeholder="Ingredient name *"
                        required
                        className={`w-full sm:flex-1 px-3 py-2 border rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring ${
                          fieldWithError('name') ? 'border-red-500 bg-red-50' : 'border-border-strong'
                        }`}
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qty *"
                          value={ingredient.quantity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const rounded = Math.round(value * 100) / 100;
                            updateIngredient(index, 'quantity', rounded);
                          }}
                          required
                          min="0.01"
                          className={`w-20 px-3 py-2 border rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring ${
                            fieldWithError('quantity') ? 'border-red-500 bg-red-50' : 'border-border-strong'
                          }`}
                        />
                        <UnitAutocomplete
                          value={ingredient.unit}
                          onChange={(value) => updateIngredient(index, 'unit', value)}
                          placeholder="Unit *"
                          required
                          className={`w-24 px-3 py-2 border rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring ${
                            fieldWithError('unit') ? 'border-red-500 bg-red-50' : 'border-border-strong'
                          }`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Notes"
                          value={ingredient.notes}
                          onChange={(e) =>
                            updateIngredient(index, 'notes', e.target.value)
                          }
                          className="flex-1 sm:w-32 px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                          type="button"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                    {hasRowError && (
                      <div className="ml-1 mt-1 space-y-0.5">
                        {rowErrors.map(([path, message]) => (
                          <p key={path} className="text-xs text-red-600">
                            {formatErrorPath(path)}: {message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          )}

          {activeTab === 'instructions' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Instructions</h2>
              <Button variant="secondary" onClick={addInstruction} type="button">
                + Add Step
              </Button>
            </div>
            {errors.instructions && (
              <Alert variant="error" className="mb-3">
                {errors.instructions}
              </Alert>
            )}

            <div className="space-y-3">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-btn-primary text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-border-strong rounded-lg text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeInstruction(index)}
                    type="button"
                    className="h-fit"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          )}

          {activeTab === 'nutrition' && (
          <Card>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Nutrition Information (per serving)
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Optional - Fill in nutritional values if known
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Calories"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 250"
                value={formData.nutrition?.calories ?? ''}
                onChange={(e) =>
                  updateNutrition('calories', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Protein (g)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 20"
                value={formData.nutrition?.protein ?? ''}
                onChange={(e) =>
                  updateNutrition('protein', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Carbs (g)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 30"
                value={formData.nutrition?.carbs ?? ''}
                onChange={(e) =>
                  updateNutrition('carbs', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Fat (g)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 15"
                value={formData.nutrition?.fat ?? ''}
                onChange={(e) =>
                  updateNutrition('fat', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Fiber (g)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 5"
                value={formData.nutrition?.fiber ?? ''}
                onChange={(e) =>
                  updateNutrition('fiber', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Sugar (g)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 8"
                value={formData.nutrition?.sugar ?? ''}
                onChange={(e) =>
                  updateNutrition('sugar', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <Input
                label="Sodium (mg)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g., 500"
                value={formData.nutrition?.sodium ?? ''}
                onChange={(e) =>
                  updateNutrition('sodium', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </div>
          </Card>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link
              to="/recipes"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-6 py-2 text-sm border border-border-strong text-text-primary hover:bg-page-bg"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={createRecipe.isPending || updateRecipe.isPending}
            >
              {isEditing ? 'Update Recipe' : 'Create Recipe'}
            </Button>
          </div>
        </form>

        {/* Recipe Picker Modal */}
        <RecipePicker
          isOpen={showRecipePicker}
          onClose={() => setShowRecipePicker(false)}
          onSelectRecipe={handleSelectExistingRecipe}
        />
      </div>
    </div>
  );
}
