import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ShoppingCart, ChevronDown, PlusCircle, ListPlus, CookingPot, LayoutList, Grid3X3, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useMealPlan, useDeleteMealPlan, useMealPlanNutrition, useRemoveRecipeFromMealPlan, useUpdateMealPlanStatus, useUpdateMealPlan } from '../hooks/useMealPlans';
import { useGenerateShoppingList, useShoppingLists, useAddFromMealPlan } from '../hooks/useShoppingLists';
import { mealPlansService } from '../services/mealPlans.service';
import AddRecipeModal from '../components/AddRecipeModal';
import MealPlanCalendar from '../components/MealPlanCalendar';
import WeekGridView from '../components/WeekGridView';
import { Button, Card, Badge, Modal } from '../components/ui';
import type { CopyState, MealType } from '../types/mealPlan';

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: mealPlan, isLoading, error } = useMealPlan(id);
  const { data: nutrition } = useMealPlanNutrition(id);
  const deleteMealPlan = useDeleteMealPlan();
  const removeRecipe = useRemoveRecipeFromMealPlan();
  const updateStatus = useUpdateMealPlanStatus();
  const generateShoppingList = useGenerateShoppingList();
  const addFromMealPlan = useAddFromMealPlan();
  const { data: existingLists } = useShoppingLists('active');
  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [addRecipeDate, setAddRecipeDate] = useState<string | undefined>(undefined);
  const [shoppingDropdownOpen, setShoppingDropdownOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [showRename, setShowRename] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [preSelectedRecipeId, setPreSelectedRecipeId] = useState<string | undefined>(undefined);
  const updateMealPlan = useUpdateMealPlan();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-open AddRecipeModal when returning from AI recipe creation with a new recipe
  useEffect(() => {
    const addRecipeId = (location.state as any)?.addRecipeId;
    if (addRecipeId) {
      setPreSelectedRecipeId(addRecipeId);
      setIsAddRecipeModalOpen(true);
      // Clear location state so refreshing doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Group meals by date (computed early so callbacks can reference it)
  const mealsByDate: Record<string, any[]> = useMemo(() => {
    const result: Record<string, any[]> = {};
    if (mealPlan?.meals) {
      mealPlan.meals.forEach((meal) => {
        const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!result[dateKey]) {
          result[dateKey] = [];
        }
        result[dateKey].push(meal);
      });
    }
    return result;
  }, [mealPlan?.meals]);

  // Compute per-day nutrition from meals data
  const dailyNutrition = useMemo(() => {
    const days: { date: string; calories: number; protein: number; carbs: number; fat: number; mealsWithData: number; totalMeals: number }[] = [];
    const sortedDates = Object.keys(mealsByDate).sort();
    for (const dateKey of sortedDates) {
      const meals = mealsByDate[dateKey];
      let cal = 0, protein = 0, carbs = 0, fat = 0, mealsWithData = 0;
      for (const meal of meals) {
        const n = meal.recipe?.nutrition;
        if (n) {
          const s = meal.servings || 1;
          cal += (n.calories || 0) * s;
          protein += (n.protein || 0) * s;
          carbs += (n.carbs || 0) * s;
          fat += (n.fat || 0) * s;
          mealsWithData++;
        }
      }
      days.push({ date: dateKey, calories: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), mealsWithData, totalMeals: meals.length });
    }
    return days;
  }, [mealsByDate]);

  // Build calendar data: date -> meal type summary
  const calendarMealsByDate: Record<string, { mealType: string }[]> = useMemo(() => {
    const result: Record<string, { mealType: string }[]> = {};
    if (mealPlan?.meals) {
      mealPlan.meals.forEach((meal) => {
        const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!result[dateKey]) {
          result[dateKey] = [];
        }
        result[dateKey].push({ mealType: meal.mealType });
      });
    }
    return result;
  }, [mealPlan?.meals]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShoppingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateNewList = async () => {
    if (!id) return;
    setShoppingDropdownOpen(false);
    generateShoppingList.mutate(
      { mealPlanIds: [id], name: `${mealPlan?.name || 'Meal Plan'} — Shopping List` },
      {
        onSuccess: (list) => {
          toast(
            (t) => (
              <span className="flex items-center gap-2">
                Shopping list created!
                <a
                  href={`/shopping-lists/${list.id}`}
                  onClick={(e) => { e.preventDefault(); toast.dismiss(t.id); navigate(`/shopping-lists/${list.id}`); }}
                  className="font-semibold text-accent underline whitespace-nowrap"
                >
                  View list →
                </a>
              </span>
            ),
            { duration: 5000, icon: '✅' }
          );
        },
      }
    );
  };

  const handleAddToExistingList = (shoppingListId: string) => {
    if (!id) return;
    setIsAddToListModalOpen(false);
    addFromMealPlan.mutate(
      { shoppingListId, mealPlanId: id },
      {
        onSuccess: () => {
          toast(
            (t) => (
              <span className="flex items-center gap-2">
                Ingredients added to list!
                <a
                  href={`/shopping-lists/${shoppingListId}`}
                  onClick={(e) => { e.preventDefault(); toast.dismiss(t.id); navigate(`/shopping-lists/${shoppingListId}`); }}
                  className="font-semibold text-accent underline whitespace-nowrap"
                >
                  View list →
                </a>
              </span>
            ),
            { duration: 5000, icon: '✅' }
          );
        },
      }
    );
  };

  const handleDateClick = useCallback((dateKey: string) => {
    const el = dateRefs.current[dateKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.classList.add('ring-2', 'ring-accent-ring');
      setTimeout(() => el.classList.remove('ring-2', 'ring-accent-ring'), 1500);
    }
  }, []);

  // Copy meals: extract meal data from the source day
  const handleCopyMeals = useCallback((sourceDate: string, mealTypeFilter: string | 'all') => {
    const mealsOnDay = mealsByDate[sourceDate] || [];

    const mealsToCopy = mealTypeFilter === 'all'
      ? mealsOnDay
      : mealsOnDay.filter((m: any) => m.mealType === mealTypeFilter);

    if (mealsToCopy.length === 0) return;

    const label = mealTypeFilter === 'all'
      ? `all meals from ${format(new Date(sourceDate), 'EEE MMM d')}`
      : `${mealTypeFilter} from ${format(new Date(sourceDate), 'EEE MMM d')}`;

    setCopyState({
      sourceDate,
      meals: mealsToCopy.map((m: any) => ({
        recipeId: m.recipe?.id || m.recipeId,
        mealType: m.mealType as MealType,
        servings: m.servings,
        notes: m.notes,
      })),
      label,
    });
  }, [mealsByDate]);

  // Paste meals: add copied meals to the target day
  const handlePasteMeals = useCallback(async (targetDate: string) => {
    if (!copyState || !id || isPasting) return;

    setIsPasting(true);
    try {
      // Convert yyyy-MM-dd to ISO datetime for backend validator
      const isoDate = new Date(targetDate + 'T00:00:00.000Z').toISOString();
      for (const meal of copyState.meals) {
        await mealPlansService.addRecipe(id, {
          recipeId: meal.recipeId,
          date: isoDate,
          mealType: meal.mealType,
          servings: meal.servings,
          ...(meal.notes ? { notes: meal.notes } : {}),
        });
      }
      // Single invalidation + single toast
      queryClient.invalidateQueries({ queryKey: ['meal-plans', id] });
      toast.success(
        `Pasted ${copyState.meals.length} meal${copyState.meals.length > 1 ? 's' : ''} to ${format(new Date(targetDate), 'EEE MMM d')}`
      );
    } catch (error) {
      toast.error('Failed to paste meals');
      // Still invalidate to show any partial results
      queryClient.invalidateQueries({ queryKey: ['meal-plans', id] });
    } finally {
      setIsPasting(false);
    }
  }, [copyState, id, isPasting, queryClient]);

  // Cancel copy mode
  const handleCancelCopy = useCallback(() => {
    setCopyState(null);
  }, []);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    deleteMealPlan.mutate(id, {
      onSuccess: () => {
        navigate('/meal-plans');
      },
    });
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!id || !confirm('Remove this recipe from the meal plan?')) {
      return;
    }

    removeRecipe.mutate({ mealPlanId: id, recipeId });
  };

  const handleMarkAsCompleted = async () => {
    if (!id) return;

    updateStatus.mutate({
      id,
      input: { status: 'completed' },
    });
  };

  const handleRename = () => {
    if (!mealPlan) return;
    setRenameName(mealPlan.name);
    setShowRename(true);
  };

  const handleSaveRename = async () => {
    if (!id || !renameName.trim()) return;
    await updateMealPlan.mutateAsync({ id, input: { name: renameName.trim() } });
    setShowRename(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x231B;</div>
          <p className="text-text-secondary">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x274C;</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Meal plan not found</h2>
          <Link
            to="/meal-plans"
            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-btn-primary text-white hover:bg-btn-primary-hover"
          >
            Back to Meal Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <Link
          to="/meal-plans"
          className="inline-flex items-center text-accent hover:text-accent-hover mb-6"
        >
          &#x2190; Back to Meal Plans
        </Link>

        {/* Header */}
        <Card className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{mealPlan.name}</h1>
                <button
                  onClick={handleRename}
                  className="p-1.5 rounded-lg hover:bg-page-bg transition-colors text-text-muted hover:text-text-primary"
                  title="Rename meal plan"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {mealPlan.status === 'completed' && (
                  <Badge variant="green" size="md">&#x2713; Completed</Badge>
                )}
              </div>
              <p className="text-text-secondary">
                {format(new Date(mealPlan.startDate), 'MMMM d')} -{' '}
                {format(new Date(mealPlan.endDate), 'MMMM d, yyyy')}
              </p>
              <p className="text-text-muted mt-1">{mealPlan.meals.length} meals planned</p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <Button onClick={() => { setAddRecipeDate(undefined); setIsAddRecipeModalOpen(true); }}>
                Add Recipe
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate(`/cooking-plan/new?planId=${id}`)}
                className="!bg-sec-cooking hover:!opacity-90 !text-white !border-transparent"
              >
                <CookingPot size={16} className="mr-1.5" />
                Cooking Plan
              </Button>

              {/* Shopping List dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="secondary"
                  className="!bg-sec-shopping hover:!opacity-90 !border-transparent !text-white"
                  onClick={() => setShoppingDropdownOpen(o => !o)}
                  loading={generateShoppingList.isPending || addFromMealPlan.isPending}
                >
                  <ShoppingCart size={16} className="mr-1.5" />
                  Shopping List
                  <ChevronDown size={14} className="ml-1.5" />
                </Button>
                {shoppingDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-surface border border-border-default rounded-lg shadow-lg z-20">
                    <button
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-primary hover:bg-page-bg rounded-t-lg"
                      onClick={handleGenerateNewList}
                    >
                      <PlusCircle size={15} className="text-accent" />
                      Generate new list
                    </button>
                    <div className="border-t border-border-default" />
                    <button
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-primary hover:bg-page-bg rounded-b-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => { setShoppingDropdownOpen(false); setIsAddToListModalOpen(true); }}
                      disabled={!existingLists || existingLists.length === 0}
                    >
                      <ListPlus size={15} className="text-btn-success" />
                      Add to existing list
                      {existingLists && existingLists.length > 0 && (
                        <span className="ml-auto text-xs text-text-muted">{existingLists.length}</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {mealPlan.status !== 'completed' && (
                <Button
                  variant="success"
                  onClick={handleMarkAsCompleted}
                  loading={updateStatus.isPending}
                >
                  Mark as Completed
                </Button>
              )}
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleteMealPlan.isPending}
              >
                Delete Plan
              </Button>
            </div>
          </div>
        </Card>

        {/* Nutrition Summary */}
        {nutrition && nutrition.mealsCount > 0 && dailyNutrition.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">Plan Nutrition Summary</h2>
              {nutrition.mealsWithNutrition !== undefined && nutrition.mealsWithNutrition < nutrition.mealsCount && (
                <span className="text-xs text-text-muted">
                  Based on {nutrition.mealsWithNutrition} of {nutrition.mealsCount} meals
                </span>
              )}
            </div>

            {/* Daily average (primary) + plan totals (secondary) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{Math.round(nutrition.totalCalories / dailyNutrition.length)}</div>
                <div className="text-sm text-text-secondary">Calories / day</div>
                <div className="text-xs text-text-muted">{nutrition.totalCalories} plan total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{Math.round(nutrition.totalProtein / dailyNutrition.length)}g</div>
                <div className="text-sm text-text-secondary">Protein / day</div>
                <div className="text-xs text-text-muted">{nutrition.totalProtein}g plan total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{Math.round(nutrition.totalCarbs / dailyNutrition.length)}g</div>
                <div className="text-sm text-text-secondary">Carbs / day</div>
                <div className="text-xs text-text-muted">{nutrition.totalCarbs}g plan total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{Math.round(nutrition.totalFat / dailyNutrition.length)}g</div>
                <div className="text-sm text-text-secondary">Fat / day</div>
                <div className="text-xs text-text-muted">{nutrition.totalFat}g plan total</div>
              </div>
            </div>

            {/* Daily breakdown table */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-secondary">
                      <th className="text-left py-1.5 pr-3 font-medium">Date</th>
                      <th className="text-right py-1.5 px-2 font-medium text-accent">Calories</th>
                      <th className="text-right py-1.5 px-2 font-medium text-green-600">Protein</th>
                      <th className="text-right py-1.5 px-2 font-medium text-yellow-600">Carbs</th>
                      <th className="text-right py-1.5 px-2 font-medium text-orange-600">Fat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyNutrition.map((day) => (
                      <tr key={day.date} className="border-t border-border/50">
                        <td className="py-1.5 pr-3 text-text-primary font-medium">
                          {format(new Date(day.date + 'T12:00:00'), 'EEE, MMM d')}
                          {day.mealsWithData < day.totalMeals && (
                            <span className="text-xs text-text-muted ml-1">({day.mealsWithData}/{day.totalMeals})</span>
                          )}
                        </td>
                        <td className="text-right py-1.5 px-2 text-text-primary font-semibold">{day.calories}</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{day.protein}g</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{day.carbs}g</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{day.fat}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {mealPlan.meals.length === 0 && (
          <Card padding="lg" className="text-center">
            <div className="text-6xl mb-4">&#x1F37D;&#xFE0F;</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No meals planned yet
            </h3>
            <p className="text-text-secondary mb-6">
              Click "Add Recipe" to start planning your meals
            </p>
            <Button size="lg" onClick={() => setIsAddRecipeModalOpen(true)}>
              Add Your First Recipe
            </Button>
          </Card>
        )}

        {/* View Mode Toggle + Meals */}
        {Object.keys(mealsByDate).length > 0 && (
          <>
            {/* View toggle */}
            <div className="flex items-center justify-end gap-1 mb-4">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:bg-hover-bg hover:text-text-secondary'
                }`}
                title="Card view"
              >
                <LayoutList size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:bg-hover-bg hover:text-text-secondary'
                }`}
                title="Week grid view"
              >
                <Grid3X3 size={18} />
              </button>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <Card className="mb-6">
                <WeekGridView
                  mealsByDate={mealsByDate}
                  startDate={mealPlan.startDate}
                  endDate={mealPlan.endDate}
                  onDateClick={handleDateClick}
                />
              </Card>
            )}

            {/* Card View (existing day cards) */}
            {viewMode === 'cards' && (
              <div className="space-y-6">
                {Object.entries(mealsByDate).map(([dateKey, meals]) => (
                  <Card key={dateKey} ref={(el: HTMLDivElement | null) => { dateRefs.current[dateKey] = el; }} className="transition-all duration-300 bg-detail-mealplans border border-detail-mealplans-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {format(new Date(dateKey), 'EEEE, MMMM d')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => { setAddRecipeDate(dateKey); setIsAddRecipeModalOpen(true); }}
                        className="p-1.5 rounded-lg text-accent hover:bg-accent-light transition-colors"
                        title="Add meal to this day"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {meals.map((meal) => (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between p-4 bg-surface rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="blue" className="uppercase">
                                {meal.mealType}
                              </Badge>
                              <Link
                                to={`/recipes/${meal.recipe.id}?servings=${meal.servings}`}
                                className="text-lg font-medium text-text-primary hover:text-accent"
                              >
                                {meal.recipe.title}
                              </Link>
                            </div>
                            <p className="text-sm text-text-secondary mt-1">
                              {meal.servings} serving{meal.servings > 1 ? 's' : ''}
                              {meal.notes && ` \u2022 ${meal.notes}`}
                            </p>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleRemoveRecipe(meal.id)}
                            disabled={removeRecipe.isPending}
                            className="ml-4 text-red-600 hover:text-red-700 no-underline hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Calendar */}
        {mealPlan.meals.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Meal Calendar</h2>
            <MealPlanCalendar
              startDate={mealPlan.startDate}
              endDate={mealPlan.endDate}
              mealsByDate={calendarMealsByDate}
              onDateClick={handleDateClick}
              copyState={copyState}
              onCopyMeals={handleCopyMeals}
              onPasteMeals={handlePasteMeals}
              onCancelCopy={handleCancelCopy}
              isPasting={isPasting}
            />
          </Card>
        )}

        {/* Add Recipe Modal */}
        {id && (
          <AddRecipeModal
            mealPlanId={id}
            isOpen={isAddRecipeModalOpen}
            onClose={() => { setIsAddRecipeModalOpen(false); setAddRecipeDate(undefined); setPreSelectedRecipeId(undefined); }}
            defaultDate={addRecipeDate}
            preSelectedRecipeId={preSelectedRecipeId}
          />
        )}

        {/* Add to Existing Shopping List Modal */}
        <Modal
          isOpen={isAddToListModalOpen}
          onClose={() => setIsAddToListModalOpen(false)}
          title="Add to Existing Shopping List"
          size="sm"
        >
          <p className="text-sm text-text-secondary mb-4">
            Choose a shopping list to add all ingredients from <strong>{mealPlan.name}</strong> to:
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {existingLists && existingLists.length > 0 ? (
              existingLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToExistingList(list.id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border-default hover:border-accent hover:bg-accent-light transition-colors"
                >
                  <div className="font-medium text-text-primary text-sm">{list.name}</div>
                  {list.mealPlan && (
                    <div className="text-xs text-text-muted mt-0.5">Linked to: {list.mealPlan.name}</div>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No active shopping lists found.</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setIsAddToListModalOpen(false)}>Cancel</Button>
          </div>
        </Modal>

        {/* Rename Meal Plan Modal */}
        <Modal
          isOpen={showRename}
          onClose={() => setShowRename(false)}
          title="Rename Meal Plan"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowRename(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveRename}
                disabled={!renameName.trim() || updateMealPlan.isPending}
                loading={updateMealPlan.isPending}
              >
                Save
              </Button>
            </div>
          }
        >
          <input
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
            autoFocus
            maxLength={200}
            onKeyDown={(e) => { if (e.key === 'Enter' && renameName.trim()) handleSaveRename(); }}
          />
        </Modal>
      </div>
    </div>
  );
}
