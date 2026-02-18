import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { useAddRecipeToMealPlan } from '../hooks/useMealPlans';
import type { Recipe } from '../types/recipe';
import type { AddRecipeToMealPlanInput } from '../types/mealPlan';
import { Modal, Input, TextArea, Select, Button } from './ui';
import { ArrowLeft, Clock, Users, ExternalLink, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Previous day"
      >
        <ChevronLeft size={14} />
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        required
      />
      <button
        type="button"
        onClick={() => onChange(shiftDate(value, 1))}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Next day"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

interface AddRecipeModalProps {
  mealPlanId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'browse' | 'details';

interface QuickAddState {
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
}

export default function AddRecipeModal({ mealPlanId, isOpen, onClose }: AddRecipeModalProps) {
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

  const hasComma = searchTerm.includes(',');
  const { data, isLoading } = useRecipes({
    search: !hasComma && searchTerm ? searchTerm : undefined,
    tags: hasComma ? searchTerm : undefined,
  });
  const recipes = data?.recipes || [];

  useEffect(() => {
    if (!isOpen) {
      setStep('browse');
      setSearchTerm('');
      setSelectedRecipe(null);
      setDate(new Date().toISOString().split('T')[0]);
      setMealType('dinner');
      setServings(2);
      setNotes('');
      setQuickAdd(null);
    }
  }, [isOpen]);

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
      { onSuccess: () => onClose() }
    );
  };

  const openQuickAdd = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setQuickAdd({
      recipeId: recipe.id,
      date: new Date().toISOString().split('T')[0],
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
      { onSuccess: () => onClose() }
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
        <Button variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </Button>
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

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading recipes...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No recipes found matching your search.' : 'No recipes available.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => {
                const time = (recipe.prepTime || 0) + (recipe.cookTime || 0);
                const isQuickAdding = quickAdd?.recipeId === recipe.id;
                return (
                  <div
                    key={recipe.id}
                    className={`bg-white rounded-lg shadow transition-all overflow-hidden ${
                      isQuickAdding
                        ? 'ring-2 ring-green-400 shadow-lg'
                        : 'hover:shadow-lg hover:ring-2 hover:ring-blue-400'
                    }`}
                  >
                    {/* Clickable card body → detail view */}
                    <button
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full text-left"
                    >
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-3xl">🍽️</span>
                        </div>
                      )}
                      <div className="p-3 pb-2">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                          {recipe.title}
                        </h3>
                        {recipe.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-400 mb-2">
                          <span>⏱️ {time > 0 ? `${time} min` : 'N/A'}</span>
                          <span>🍴 {recipe.servings} srv</span>
                        </div>
                        {recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {recipe.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
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
                        className="px-3 pb-3 pt-1 border-t border-gray-100 bg-green-50 flex flex-col gap-2"
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
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">Servings</label>
                          <input
                            type="number"
                            value={quickAdd.servings}
                            onChange={(e) =>
                              setQuickAdd({
                                ...quickAdd,
                                servings: parseInt(e.target.value) || 1,
                              })
                            }
                            min={1}
                            className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={addRecipe.isPending}
                            className="flex-1 text-xs bg-green-600 text-white rounded py-1.5 hover:bg-green-700 disabled:opacity-50 font-medium"
                          >
                            {addRecipe.isPending ? 'Adding…' : '✓ Add'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setQuickAdd(null); }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100">
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
              {selectedRecipe.imageUrl ? (
                <img
                  src={selectedRecipe.imageUrl}
                  alt={selectedRecipe.title}
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded-lg">
                  <span className="text-gray-400 text-4xl">🍽️</span>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">
                  {selectedRecipe.title}
                </h3>
                {selectedRecipe.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                    {selectedRecipe.description}
                  </p>
                )}
              </div>

              <div className="flex gap-4 text-sm text-gray-500">
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
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {selectedRecipe.tags.length > 5 && (
                    <span className="text-xs text-gray-400">
                      +{selectedRecipe.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {selectedRecipe.ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Ingredients
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-0.5">
                    {selectedRecipe.ingredients.slice(0, 8).map((ri) => (
                      <li key={ri.id} className="line-clamp-1">
                        <span className="text-gray-400">
                          {ri.quantity} {ri.unit}
                        </span>{' '}
                        {ri.ingredient.name}
                      </li>
                    ))}
                    {selectedRecipe.ingredients.length > 8 && (
                      <li className="text-gray-400 text-xs">
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
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink size={12} />
                  View original recipe
                </a>
              )}

              <Link
                to={`/recipes/${selectedRecipe.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
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
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 self-start"
            >
              <ArrowLeft size={14} />
              Back to recipes
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
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

              <Input
                label="Servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                min={1}
                required
              />

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
