import { useState, useMemo } from 'react';
import { Button, Card, Badge } from '../ui';
import { useSwapMeal } from '../../hooks/useAIMealPlan';
import { useRecipes } from '../../hooks/useRecipes';
import RecipePicker from '../RecipePicker';
import type { Recipe } from '../../types/recipe';
import type { GeneratedPlan, AIRecipeEntry, SwapAlternative, CreatePreferenceInput, PinnedMeal } from '../../types/mealPlanPreference';
import { ChevronLeft, ChevronRight, ArrowLeftRight, Loader2, BookOpen, Sparkles, Clock, Flame, Pin, Library } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

function safeFormatDate(dateStr: string, pattern: string): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, pattern) : dateStr;
  } catch {
    return dateStr;
  }
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800',
  lunch: 'bg-green-100 text-green-800',
  dinner: 'bg-blue-100 text-blue-800',
  snack: 'bg-purple-100 text-purple-800',
};

interface Props {
  plan: GeneratedPlan;
  planDescription: string;
  recipeQueue: AIRecipeEntry[];
  preferenceId: string | null;
  preferences: CreatePreferenceInput;
  pinnedMeals: PinnedMeal[];
  onPlanUpdate: (plan: GeneratedPlan) => void;
  onDescriptionChange: (desc: string) => void;
  onRecipeQueueUpdate: (queue: AIRecipeEntry[]) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Extract per-serving nutrition from a recipe's stored nutrition (already per-serving in DB) */
function getPerServingNutrition(nutrition: { calories?: number; protein?: number; carbs?: number; fat?: number } | undefined) {
  if (!nutrition) return null;
  return {
    calories: nutrition.calories != null ? Math.round(nutrition.calories) : null,
    protein: nutrition.protein != null ? Math.round(nutrition.protein) : null,
    carbs: nutrition.carbs != null ? Math.round(nutrition.carbs) : null,
    fat: nutrition.fat != null ? Math.round(nutrition.fat) : null,
  };
}

/** Calorie bar color class based on target range */
function calColorClass(cal: number, min: number, max: number): string {
  if (cal >= min && cal <= max) return 'text-green-600';
  const dist = cal < min ? min - cal : cal - max;
  const range = max - min || 200;
  if (dist <= range * 0.3) return 'text-amber-500';
  return 'text-red-500';
}

export default function StepReviewPlan({
  plan, planDescription, recipeQueue, preferenceId, preferences, pinnedMeals,
  onPlanUpdate, onDescriptionChange, onRecipeQueueUpdate,
  onBack, onNext,
}: Props) {
  const swapMeal = useSwapMeal();
  const [swapState, setSwapState] = useState<{
    dayIndex: number;
    mealIndex: number;
    alternatives: SwapAlternative[];
  } | null>(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  // Fetch library recipes (for nutrition lookup)
  const { data: recipesData } = useRecipes();
  const recipeMap = useMemo(() => {
    const map = new Map<string, { servings: number; nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number } }>();
    if (!recipesData?.recipes) return map;
    for (const r of recipesData.recipes) {
      map.set(r.id, { servings: r.servings, nutrition: r.nutrition });
    }
    return map;
  }, [recipesData]);

  // Build pinned meal lookup: recipeId+mealType → true
  const pinnedSet = useMemo(() => {
    const set = new Set<string>();
    for (const pin of pinnedMeals) {
      set.add(`${pin.recipeId}:${pin.mealType}`);
    }
    return set;
  }, [pinnedMeals]);

  // Daily calorie targets
  const dailyCalMin = preferences.caloriesMin || 0;
  const dailyCalMax = preferences.caloriesMax || 0;
  const hasDailyTarget = dailyCalMin > 0 || dailyCalMax > 0;

  // Compute per-day nutrition summaries
  const dayNutrition = useMemo(() => {
    return plan.days.map(day => {
      let totalCal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let hasData = false;
      let estimatedCount = 0; // meals using AI estimates (not exact data)

      for (const meal of day.meals) {
        // Try stored nutrition for library recipes first
        if (meal.existingRecipeId) {
          const recipe = recipeMap.get(meal.existingRecipeId);
          if (recipe) {
            const ps = getPerServingNutrition(recipe.nutrition);
            if (ps && ps.calories != null) {
              totalCal += ps.calories;
              totalProtein += ps.protein || 0;
              totalCarbs += ps.carbs || 0;
              totalFat += ps.fat || 0;
              hasData = true;
              continue; // exact data found, skip estimate fallback
            }
          }
        }

        // Fall back to AI-provided estimates (for new recipes or library recipes without nutrition)
        if (meal.estimatedCalories != null) {
          totalCal += meal.estimatedCalories;
          totalProtein += meal.estimatedProtein || 0;
          totalCarbs += meal.estimatedCarbs || 0;
          totalFat += meal.estimatedFat || 0;
          hasData = true;
          estimatedCount++;
        }
      }

      return { totalCal, totalProtein, totalCarbs, totalFat, hasData, estimatedCount };
    });
  }, [plan.days, recipeMap]);

  const handleSwap = async (dayIndex: number, mealIndex: number) => {
    if (!preferenceId) return;
    const day = plan.days[dayIndex];
    const meal = day.meals[mealIndex];
    const title = meal.existingRecipeTitle || meal.newRecipeTitle || '';

    const context = plan.days.map(d =>
      `${d.date}: ${d.meals.map(m => m.existingRecipeTitle || m.newRecipeTitle || '').join(', ')}`
    ).join('\n');

    try {
      const result = await swapMeal.mutateAsync({
        preferenceId,
        date: day.date,
        mealType: meal.mealType,
        currentRecipeTitle: title,
        existingPlanContext: context,
      });
      setSwapState({ dayIndex, mealIndex, alternatives: result.alternatives });
    } catch { /* handled by hook */ }
  };

  const applySwap = (alt: SwapAlternative) => {
    if (!swapState) return;
    const { dayIndex, mealIndex } = swapState;
    const updatedPlan = { ...plan, days: [...plan.days] };
    const day = { ...updatedPlan.days[dayIndex], meals: [...updatedPlan.days[dayIndex].meals] };
    const oldMeal = day.meals[mealIndex];

    day.meals[mealIndex] = {
      ...oldMeal,
      existingRecipeId: alt.existingRecipeId || undefined,
      existingRecipeTitle: alt.existingRecipeTitle || undefined,
      newRecipeTitle: alt.newRecipeTitle || undefined,
      newRecipeDescription: alt.newRecipeDescription || undefined,
      estimatedPrepTime: alt.estimatedPrepTime,
      estimatedCookTime: alt.estimatedCookTime,
      cuisineTag: alt.cuisineTag || undefined,
      estimatedCalories: alt.estimatedCalories,
      estimatedProtein: alt.estimatedProtein,
      estimatedCarbs: alt.estimatedCarbs,
      estimatedFat: alt.estimatedFat,
    };
    updatedPlan.days[dayIndex] = day;
    onPlanUpdate(updatedPlan);

    // Update recipe queue if needed
    if (alt.newRecipeTitle && !recipeQueue.find(r => r.title === alt.newRecipeTitle)) {
      onRecipeQueueUpdate([
        ...recipeQueue,
        {
          tempKey: `new-swap-${Date.now()}`,
          title: alt.newRecipeTitle,
          description: alt.newRecipeDescription || undefined,
          cuisineTag: alt.cuisineTag || undefined,
          estimatedPrepTime: alt.estimatedPrepTime,
          estimatedCookTime: alt.estimatedCookTime,
          status: 'pending',
        },
      ]);
    }

    // Remove old recipe from queue if it was a new recipe no longer in plan
    if (swapState) {
      const oldMealTitle = plan.days[dayIndex].meals[mealIndex].newRecipeTitle;
      if (oldMealTitle) {
        const stillUsed = updatedPlan.days.some(d =>
          d.meals.some(m => m.newRecipeTitle === oldMealTitle)
        );
        if (!stillUsed) {
          onRecipeQueueUpdate(recipeQueue.filter(r => r.title !== oldMealTitle));
        }
      }
    }

    setSwapState(null);
  };

  const applyLibrarySwap = (recipe: Recipe) => {
    if (!swapState) return;
    const alt: SwapAlternative = {
      existingRecipeId: recipe.id,
      existingRecipeTitle: recipe.title,
      newRecipeTitle: null,
      newRecipeDescription: null,
      estimatedPrepTime: recipe.prepTime || undefined,
      estimatedCookTime: recipe.cookTime || undefined,
      estimatedCalories: recipe.nutrition?.calories,
      estimatedProtein: recipe.nutrition?.protein,
      estimatedCarbs: recipe.nutrition?.carbs,
      estimatedFat: recipe.nutrition?.fat,
    };
    applySwap(alt);
    setShowLibraryPicker(false);
  };

  const newRecipeCount = recipeQueue.filter(r => r.status === 'pending').length;

  // Check if any day has estimated (non-exact) nutrition data
  const totalEstimated = dayNutrition.reduce((sum, d) => sum + d.estimatedCount, 0);

  return (
    <div className="space-y-6">
      {/* Plan description */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Plan description
        </label>
        <input
          type="text"
          value={planDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
        />
      </Card>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {plan.stats.uniqueBreakfasts > 0 && (
          <Badge variant="yellow">Breakfasts: {plan.stats.uniqueBreakfasts} unique</Badge>
        )}
        {plan.stats.uniqueLunches > 0 && (
          <Badge variant="green">Lunches: {plan.stats.uniqueLunches} unique</Badge>
        )}
        {plan.stats.uniqueDinners > 0 && (
          <Badge variant="blue">Dinners: {plan.stats.uniqueDinners} unique</Badge>
        )}
        {plan.stats.uniqueSnacks > 0 && (
          <Badge variant="purple">Snacks: {plan.stats.uniqueSnacks} unique</Badge>
        )}
        {newRecipeCount > 0 && (
          <Badge variant="orange">{newRecipeCount} new recipes to create</Badge>
        )}
      </div>

      {/* Estimated nutrition info */}
      {totalEstimated > 0 && (
        <div className="flex items-start gap-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            {totalEstimated} meal{totalEstimated !== 1 ? 's' : ''} {totalEstimated !== 1 ? 'use' : 'uses'} AI-estimated nutrition.
            Exact values will be calculated when recipes are created.
          </p>
        </div>
      )}

      {/* Day-by-day plan */}
      {plan.days.map((day, dayIndex) => {
        const dayNut = dayNutrition[dayIndex];

        return (
          <Card key={day.date} padding="sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">
                {safeFormatDate(day.date, 'EEEE, MMM d')}
              </h3>
              {/* Daily nutrition summary */}
              {dayNut.hasData && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`flex items-center gap-1 font-medium ${
                    hasDailyTarget
                      ? calColorClass(dayNut.totalCal, dailyCalMin, dailyCalMax || 9999)
                      : 'text-text-secondary'
                  }`}>
                    <Flame className="w-3 h-3" />
                    {dayNut.totalCal} cal
                  </span>
                  <span className="text-text-muted">
                    {dayNut.totalProtein}g P · {dayNut.totalCarbs}g C · {dayNut.totalFat}g F
                  </span>
                  {dayNut.estimatedCount > 0 && (
                    <span className="text-blue-400" title={`${dayNut.estimatedCount} meal(s) using AI estimates`}>
                      ~
                    </span>
                  )}
                </div>
              )}
              {!dayNut.hasData && (
                <span className="text-xs text-text-muted italic">No nutrition data</span>
              )}
            </div>
            <div className="space-y-2">
              {day.meals.map((meal, mealIndex) => {
                const title = meal.existingRecipeTitle || meal.newRecipeTitle || 'Unknown';
                const isNew = !!meal.newRecipeTitle && !meal.existingRecipeId;
                const isPinned = meal.existingRecipeId ? pinnedSet.has(`${meal.existingRecipeId}:${meal.mealType}`) : false;
                const isSwapping = swapState?.dayIndex === dayIndex && swapState?.mealIndex === mealIndex;

                // Get per-serving calories for display
                let mealCalDisplay: { value: number; isEstimate: boolean } | null = null;
                if (meal.existingRecipeId) {
                  const recipe = recipeMap.get(meal.existingRecipeId);
                  if (recipe) {
                    const ps = getPerServingNutrition(recipe.nutrition);
                    if (ps && ps.calories != null) {
                      mealCalDisplay = { value: ps.calories, isEstimate: false };
                    }
                  }
                }
                if (!mealCalDisplay && meal.estimatedCalories != null) {
                  mealCalDisplay = { value: meal.estimatedCalories, isEstimate: true };
                }

                return (
                  <div key={`${day.date}-${meal.mealType}-${mealIndex}`}>
                    <div className="p-2 rounded-lg bg-surface-alt space-y-1">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${MEAL_TYPE_COLORS[meal.mealType] || ''}`}>
                          {meal.mealType}
                        </span>
                        <span className="flex-1 text-sm text-text-primary font-medium leading-snug flex items-start gap-1">
                          {isPinned && <Pin className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />}
                          {title}
                        </span>
                        <button
                          onClick={() => handleSwap(dayIndex, mealIndex)}
                          disabled={swapMeal.isPending}
                          className="p-1 hover:bg-purple-100 rounded transition-colors shrink-0"
                          title="Swap this meal"
                        >
                          {swapMeal.isPending && isSwapping ? (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          ) : (
                            <ArrowLeftRight className="w-4 h-4 text-purple-500" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        {isNew ? (
                          <span className="flex items-center gap-1 text-xs text-purple-600">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <BookOpen className="w-3 h-3" /> Library
                          </span>
                        )}
                        {mealCalDisplay && (
                          <span className={`text-xs ${mealCalDisplay.isEstimate ? 'text-text-muted italic' : 'text-text-secondary'}`}
                                title={mealCalDisplay.isEstimate ? 'AI estimate' : 'From recipe data'}>
                            {mealCalDisplay.isEstimate ? '~' : ''}{mealCalDisplay.value} cal
                          </span>
                        )}
                        {(meal.estimatedPrepTime || meal.estimatedCookTime) && (
                          <span className="flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="w-3 h-3" />
                            {(meal.estimatedPrepTime || 0) + (meal.estimatedCookTime || 0)}m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Swap alternatives popover */}
                    {isSwapping && swapState?.alternatives && (
                      <div className="ml-4 mt-1 p-3 border border-purple-200 rounded-lg bg-purple-50 space-y-2">
                        <p className="text-xs font-medium text-purple-700 mb-2">Choose a replacement:</p>
                        {swapState.alternatives.map((alt, i) => (
                          <button
                            key={i}
                            onClick={() => applySwap(alt)}
                            className="w-full text-left p-2 rounded hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex flex-wrap items-start gap-2">
                              <span className="text-sm font-medium text-text-primary">
                                {alt.existingRecipeTitle || alt.newRecipeTitle}
                              </span>
                              {alt.newRecipeTitle && !alt.existingRecipeId && (
                                <Sparkles className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
                              )}
                            </div>
                            {alt.newRecipeDescription && (
                              <p className="text-xs text-text-muted mt-0.5">{alt.newRecipeDescription}</p>
                            )}
                            {alt.estimatedCalories != null && (
                              <p className="text-xs text-text-muted mt-0.5 italic">
                                ~{alt.estimatedCalories} cal · {alt.estimatedProtein || 0}g P · {alt.estimatedCarbs || 0}g C · {alt.estimatedFat || 0}g F
                              </p>
                            )}
                          </button>
                        ))}
                        <div className="border-t border-purple-200 pt-2 mt-1">
                          <button
                            onClick={() => setShowLibraryPicker(true)}
                            className="w-full text-left p-2 rounded hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm text-accent font-medium"
                          >
                            <Library className="w-4 h-4 shrink-0" />
                            Browse full library...
                          </button>
                        </div>
                        <button
                          onClick={() => setSwapState(null)}
                          className="text-xs text-text-muted hover:text-text-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {newRecipeCount > 0 ? (
            <>Next: Create {newRecipeCount} Recipes</>
          ) : (
            <>Next: Create Meal Plan</>
          )}
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Library picker modal for swap */}
      <RecipePicker
        isOpen={showLibraryPicker}
        onClose={() => setShowLibraryPicker(false)}
        onSelectRecipe={applyLibrarySwap}
      />
    </div>
  );
}
