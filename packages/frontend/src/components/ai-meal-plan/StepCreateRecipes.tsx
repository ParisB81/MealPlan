import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '../ui';
import { useGenerateRecipeDetails } from '../../hooks/useAIMealPlan';
import { useRecipes } from '../../hooks/useRecipes';
import type { AIRecipeEntry, CreatePreferenceInput } from '../../types/mealPlanPreference';
import type { Recipe } from '../../types/recipe';
import RecipePicker from '../RecipePicker';
import {
  ChevronLeft, ChevronRight, FileEdit, BookOpen, Trash2,
  Loader2, CheckCircle, XCircle, Clock, Sparkles, Search,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Nutrition helpers ────────────────────────────

/** Compute per-meal nutrition targets from daily preferences */
function computePerMealTargets(prefs: CreatePreferenceInput) {
  const mealsPerDay = prefs.includedMeals?.length || 3;
  const hasCals = prefs.caloriesMin != null || prefs.caloriesMax != null;
  if (!hasCals) return null;

  const calMin = (prefs.caloriesMin || 0) / mealsPerDay;
  const calMax = (prefs.caloriesMax || 3000) / mealsPerDay;
  const calMid = (calMin + calMax) / 2;

  return {
    calMin: Math.round(calMin),
    calMax: Math.round(calMax),
    proteinG: prefs.proteinPercent ? Math.round((calMid * prefs.proteinPercent / 100) / 4) : null,
    carbsG: prefs.carbsPercent ? Math.round((calMid * prefs.carbsPercent / 100) / 4) : null,
    fatG: prefs.fatPercent ? Math.round((calMid * prefs.fatPercent / 100) / 9) : null,
  };
}

/** Get per-serving nutrition from a recipe (already stored per-serving in DB) */
function getPerServing(recipe: Recipe) {
  const n = recipe.nutrition;
  if (!n) return null;
  return {
    calories: n.calories != null ? Math.round(n.calories) : null,
    protein: n.protein != null ? Math.round(n.protein) : null,
    carbs: n.carbs != null ? Math.round(n.carbs) : null,
    fat: n.fat != null ? Math.round(n.fat) : null,
  };
}

/** Score how well a recipe's nutrition matches per-meal targets (0-20 range) */
function scoreNutrition(
  recipe: Recipe,
  targets: ReturnType<typeof computePerMealTargets>,
): number {
  if (!targets) return 0;
  const ps = getPerServing(recipe);
  if (!ps || ps.calories == null) return 0;

  let score = 0;

  // Calorie range match: +10 if within range, partial credit if close
  if (ps.calories >= targets.calMin && ps.calories <= targets.calMax) {
    score += 10;
  } else {
    const dist = ps.calories < targets.calMin
      ? targets.calMin - ps.calories
      : ps.calories - targets.calMax;
    const range = targets.calMax - targets.calMin || 200;
    // Partial credit: decays linearly, 0 at 2x range distance
    score += Math.max(0, 10 - Math.round((dist / range) * 10));
  }

  // Macro match: +3 each if within ~30% of target
  if (targets.proteinG && ps.protein != null) {
    const ratio = ps.protein / targets.proteinG;
    if (ratio >= 0.7 && ratio <= 1.3) score += 3;
  }
  if (targets.carbsG && ps.carbs != null) {
    const ratio = ps.carbs / targets.carbsG;
    if (ratio >= 0.7 && ratio <= 1.3) score += 3;
  }
  if (targets.fatG && ps.fat != null) {
    const ratio = ps.fat / targets.fatG;
    if (ratio >= 0.7 && ratio <= 1.3) score += 3;
  }

  return score; // max ~19
}

// ── Tag matching helpers ─────────────────────────

const MEAL_TYPE_TAGS: Record<string, string[]> = {
  breakfast: ['Breakfast'],
  lunch: ['Main Dishes', 'Salads', 'Soups'],
  dinner: ['Main Dishes'],
  snack: ['Appetizers', 'Desserts'],
};

const STOP_WORDS = new Set([
  'with', 'and', 'the', 'from', 'style', 'easy', 'quick',
  'simple', 'classic', 'homemade', 'best', 'fresh',
]);

/** Score how well a library recipe matches an AI-suggested entry */
function scoreAlternative(
  recipe: Recipe,
  entry: AIRecipeEntry,
  nutritionTargets: ReturnType<typeof computePerMealTargets>,
): number {
  let score = 0;
  const recipeTags = recipe.tags.map(t => t.toLowerCase());

  // Cuisine tag match
  if (entry.cuisineTag && recipeTags.includes(entry.cuisineTag.toLowerCase())) {
    score += 10;
  }

  // Meal type tag match
  if (entry.mealTypes?.length) {
    for (const mt of entry.mealTypes) {
      const matchTags = MEAL_TYPE_TAGS[mt] || [];
      for (const tag of matchTags) {
        if (recipeTags.includes(tag.toLowerCase())) {
          score += 8;
          break;
        }
      }
    }
  }

  // Title keyword overlap
  const entryWords = entry.title
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const recipeTitle = recipe.title.toLowerCase();
  for (const word of entryWords) {
    if (recipeTitle.includes(word)) score += 5;
  }

  // Nutrition match (0-19 range)
  score += scoreNutrition(recipe, nutritionTargets);

  return score;
}

// ── Compact nutrition display ────────────────────

function NutritionLine({ recipe }: { recipe: Recipe }) {
  const ps = getPerServing(recipe);
  if (!ps || ps.calories == null) {
    return <span className="text-xs text-text-muted italic">No nutrition data</span>;
  }
  return (
    <span className="text-xs text-text-muted flex items-center gap-1 flex-wrap">
      <Flame className="w-3 h-3 text-orange-400" />
      {ps.calories} cal
      {ps.protein != null && <span>· {ps.protein}g P</span>}
      {ps.carbs != null && <span>· {ps.carbs}g C</span>}
      {ps.fat != null && <span>· {ps.fat}g F</span>}
    </span>
  );
}

// ── Component ────────────────────────────────────

interface Props {
  recipeQueue: AIRecipeEntry[];
  createdRecipeIds: Record<string, string>;
  preferences: CreatePreferenceInput;
  onQueueUpdate: (queue: AIRecipeEntry[]) => void;
  onCreatedIdsUpdate: (ids: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepCreateRecipes({
  recipeQueue,
  preferences,
  onQueueUpdate,
  onBack, onNext,
}: Props) {
  const navigate = useNavigate();
  const generateDetails = useGenerateRecipeDetails();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTempKey, setPickerTempKey] = useState<string | null>(null);

  // Fetch all library recipes for alternative suggestions
  const { data: recipesData } = useRecipes();
  const allRecipes = recipesData?.recipes || [];

  const pendingCount = recipeQueue.filter(r => r.status === 'pending').length;
  const createdCount = recipeQueue.filter(r => r.status === 'created').length;
  const skippedCount = recipeQueue.filter(r => r.status === 'skipped').length;
  const totalCount = recipeQueue.length;
  const allDone = pendingCount === 0;

  // Compute per-meal nutrition targets
  const nutritionTargets = useMemo(() => computePerMealTargets(preferences), [preferences]);

  // Compute top 2 library alternatives for each pending AI entry
  const alternativesMap = useMemo(() => {
    const map = new Map<string, Recipe[]>();
    if (allRecipes.length === 0) return map;

    for (const entry of recipeQueue) {
      if (entry.status !== 'pending') continue;

      const scored = allRecipes
        .map(recipe => ({ recipe, score: scoreAlternative(recipe, entry, nutritionTargets) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ recipe }) => recipe);

      map.set(entry.tempKey, scored);
    }
    return map;
  }, [recipeQueue, allRecipes, nutritionTargets]);

  const handleReviewAndCreate = async (entry: AIRecipeEntry) => {
    onQueueUpdate(recipeQueue.map(r =>
      r.tempKey === entry.tempKey ? { ...r, status: 'creating' as const } : r
    ));

    try {
      const recipeData = await generateDetails.mutateAsync({
        title: entry.title,
        description: entry.description,
        servings: preferences.numberOfPersons || 1,
        cuisineHint: entry.cuisineTag,
      });

      navigate('/recipes/new', {
        state: {
          prefill: recipeData,
          returnTo: '/ai-meal-plan',
          tempKey: entry.tempKey,
        },
      });
    } catch {
      onQueueUpdate(recipeQueue.map(r =>
        r.tempKey === entry.tempKey ? { ...r, status: 'pending' as const } : r
      ));
    }
  };

  const handleUseLibraryRecipe = (entry: AIRecipeEntry, recipe: Recipe) => {
    onQueueUpdate(recipeQueue.map(r =>
      r.tempKey === entry.tempKey
        ? { ...r, status: 'created' as const, createdRecipeId: recipe.id }
        : r
    ));
    toast.success(`Using "${recipe.title}" from your library`);
  };

  const handleBrowseAll = (entry: AIRecipeEntry) => {
    setPickerTempKey(entry.tempKey);
    setPickerOpen(true);
  };

  const handlePickerSelect = (recipe: Recipe) => {
    if (!pickerTempKey) return;
    onQueueUpdate(recipeQueue.map(r =>
      r.tempKey === pickerTempKey
        ? { ...r, status: 'created' as const, createdRecipeId: recipe.id }
        : r
    ));
    setPickerOpen(false);
    setPickerTempKey(null);
    toast.success(`Using "${recipe.title}" from your library`);
  };

  const handleRemove = (entry: AIRecipeEntry) => {
    onQueueUpdate(recipeQueue.map(r =>
      r.tempKey === entry.tempKey ? { ...r, status: 'skipped' as const } : r
    ));
    toast('Meal removed from plan', { icon: '🗑️' });
  };

  return (
    <div className="space-y-6">
      {/* Progress + per-meal targets */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Recipe selection progress
          </span>
          <span className="text-sm text-text-muted">
            {createdCount + skippedCount} of {totalCount} done
          </span>
        </div>
        <div className="w-full bg-surface-alt rounded-full h-2 mb-3">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? ((createdCount + skippedCount) / totalCount) * 100 : 0}%` }}
          />
        </div>
        {nutritionTargets && (
          <div className="text-xs text-text-muted flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-border-default">
            <span className="font-medium text-text-secondary">Per-meal target:</span>
            <span>{nutritionTargets.calMin}–{nutritionTargets.calMax} cal</span>
            {nutritionTargets.proteinG && <span>~{nutritionTargets.proteinG}g protein</span>}
            {nutritionTargets.carbsG && <span>~{nutritionTargets.carbsG}g carbs</span>}
            {nutritionTargets.fatG && <span>~{nutritionTargets.fatG}g fat</span>}
          </div>
        )}
      </Card>

      {/* Recipe entries */}
      {recipeQueue.map(entry => {
        const alternatives = alternativesMap.get(entry.tempKey) || [];

        return (
          <Card key={entry.tempKey} padding="sm">
            {/* === PENDING: Show choices === */}
            {entry.status === 'pending' && (
              <div className="space-y-4">
                {/* AI suggestion */}
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                    AI Suggestion
                  </p>
                  <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-text-primary">{entry.title}</h3>
                          <Badge variant="purple" size="sm">AI New</Badge>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-text-secondary mt-0.5">{entry.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {entry.cuisineTag && <Badge variant="gray" size="sm">{entry.cuisineTag}</Badge>}
                          {(entry.estimatedPrepTime || entry.estimatedCookTime) && (
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~{(entry.estimatedPrepTime || 0) + (entry.estimatedCookTime || 0)} min
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted italic mt-1">
                          Nutrition will be set after creation
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReviewAndCreate(entry)}
                        disabled={generateDetails.isPending}
                        className="bg-purple-600 hover:bg-purple-700 shrink-0"
                        title="Generate full recipe with AI and review before saving"
                      >
                        {generateDetails.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <FileEdit className="w-3.5 h-3.5 mr-1" />
                            <span className="hidden sm:inline">Create</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Library alternatives */}
                {alternatives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                      Alternatives from your library
                    </p>
                    <div className="space-y-2">
                      {alternatives.map(recipe => (
                        <div
                          key={recipe.id}
                          className="border border-border-default rounded-lg p-3 hover:border-accent transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <BookOpen className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-text-primary text-sm">{recipe.title}</h4>
                                <Badge variant="green" size="sm">In Library</Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                                <span>{recipe.servings} servings</span>
                                {recipe.prepTime && <span>{recipe.prepTime} min prep</span>}
                                {recipe.cookTime && <span>{recipe.cookTime} min cook</span>}
                              </div>
                              <div className="mt-1">
                                <NutritionLine recipe={recipe} />
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUseLibraryRecipe(entry, recipe)}
                              className="shrink-0"
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Browse all + Remove */}
                <div className="flex items-center justify-between pt-1 border-t border-border-default">
                  <button
                    onClick={() => handleBrowseAll(entry)}
                    className="text-sm text-accent hover:text-accent-dark flex items-center gap-1.5 py-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Browse all recipes...
                  </button>
                  <button
                    onClick={() => handleRemove(entry)}
                    className="text-sm text-text-muted hover:text-red-500 flex items-center gap-1.5 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove meal
                  </button>
                </div>
              </div>
            )}

            {/* === CREATING: Show spinner === */}
            {entry.status === 'creating' && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{entry.title}</h3>
                  <p className="text-sm text-purple-500">Generating recipe details...</p>
                </div>
              </div>
            )}

            {/* === CREATED: Show linked recipe === */}
            {entry.status === 'created' && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-text-primary">{entry.title}</h3>
                    {entry.createdRecipeId && (
                      <Badge variant="green" size="sm">
                        <BookOpen className="w-3 h-3 mr-0.5 inline" />
                        Linked
                      </Badge>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-sm text-text-secondary mt-0.5">{entry.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* === SKIPPED: Show removed === */}
            {entry.status === 'skipped' && (
              <div className="flex items-center gap-3">
                <XCircle className="w-4 h-4 text-text-muted" />
                <div className="flex-1">
                  <h3 className="font-medium text-text-muted line-through">{entry.title}</h3>
                  <p className="text-xs text-text-muted">Removed from plan</p>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {recipeQueue.length === 0 && (
        <Card>
          <p className="text-center text-text-muted py-4">
            All meals use existing recipes from your library. No new recipes to create!
          </p>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!allDone}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next: Create Meal Plan
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Full recipe picker modal for "Browse all" */}
      <RecipePicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerTempKey(null); }}
        onSelectRecipe={handlePickerSelect}
      />
    </div>
  );
}
