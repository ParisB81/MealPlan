import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { ShoppingCart, ChevronDown, PlusCircle, ListPlus, CookingPot, LayoutList, Grid3X3, Pencil, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useMealPlan, useDeleteMealPlan, useMealPlanNutrition, useRemoveRecipeFromMealPlan, useUpdateMealPlanStatus, useUpdateMealPlan } from '../hooks/useMealPlans';
import { useGenerateShoppingList, useShoppingLists, useAddFromMealPlan } from '../hooks/useShoppingLists';
import { mealPlansService } from '../services/mealPlans.service';
import AddRecipeModal from '../components/AddRecipeModal';
import WeekGridView from '../components/WeekGridView';
import { Button, Card, Badge, Modal, Collapsible } from '../components/ui';
import type { MealType } from '../types/mealPlan';
import { getCategoryForTag } from '../data/tagDefinitions';

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'snack', 'lunch', 'dinner'];
const MEAL_TYPE_DOTS: Record<string, string> = {
  breakfast: 'bg-amber-400',
  lunch: 'bg-green-400',
  dinner: 'bg-blue-400',
  snack: 'bg-purple-400',
};

interface DishSummary {
  recipeId: string;
  title: string;
  times: number;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  methods: string[];
  dates: string[];
}

const formatMinutes = (min?: number) => {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

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
  const [addRecipeMealType, setAddRecipeMealType] = useState<MealType | undefined>(undefined);
  const [shoppingDropdownOpen, setShoppingDropdownOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('grid');
  const [showRename, setShowRename] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [showPersonsEdit, setShowPersonsEdit] = useState(false);
  const [preSelectedRecipeId, setPreSelectedRecipeId] = useState<string | undefined>(undefined);
  const [dayOpenStates, setDayOpenStates] = useState<Record<string, boolean>>({});
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

  // Distinct dishes per meal type — a quick view of what has to be cooked
  const dishesByMealType = useMemo(() => {
    const groups: Record<string, DishSummary[]> = {};
    const sorted = [...(mealPlan?.meals || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
    for (const meal of sorted as any[]) {
      const recipeId = meal.recipe?.id || meal.recipeId;
      const list = (groups[meal.mealType] ??= []);
      let dish = list.find((d) => d.recipeId === recipeId);
      if (!dish) {
        const tags: string[] = Array.isArray(meal.recipe?.tags)
          ? meal.recipe.tags
          : (meal.recipe?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        dish = {
          recipeId,
          title: meal.recipe?.title || 'Unknown recipe',
          times: 0,
          servings: 0,
          prepTime: meal.recipe?.prepTime,
          cookTime: meal.recipe?.cookTime,
          methods: tags.filter((t) => getCategoryForTag(t)?.name === 'Method'),
          dates: [],
        };
        list.push(dish);
      }
      dish.times++;
      dish.servings += meal.servings || 0;
      const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
      if (!dish.dates.includes(dateKey)) dish.dates.push(dateKey);
    }
    return groups;
  }, [mealPlan?.meals]);
  const distinctDishCount = useMemo(
    () => new Set((mealPlan?.meals || []).map((m: any) => m.recipe?.id || m.recipeId)).size,
    [mealPlan?.meals]
  );

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
    // Auto-expand the day so meals are visible after scrolling
    setDayOpenStates(prev => ({ ...prev, [dateKey]: true }));
    const el = dateRefs.current[dateKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.classList.add('ring-2', 'ring-accent-ring');
      setTimeout(() => el.classList.remove('ring-2', 'ring-accent-ring'), 1500);
    }
  }, []);

  // Move a meal to another day / meal type (drag & drop in the week grid).
  // Optimistically updates the cached plan so the dish lands instantly; rolls back on failure.
  const handleMoveMeal = useCallback(async (mealId: string, dateKey: string, mealType: MealType) => {
    if (!id) return;
    const queryKey = ['meal-plans', id];
    const previous = queryClient.getQueryData<any>(queryKey);
    const meal = previous?.meals?.find((m: any) => m.id === mealId);
    if (!meal) return;

    // Same yyyy-MM-dd → ISO convention as paste
    const isoDate = new Date(dateKey + 'T00:00:00.000Z').toISOString();
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, {
      ...previous,
      meals: previous.meals.map((m: any) => (m.id === mealId ? { ...m, date: isoDate, mealType } : m)),
    });

    try {
      await mealPlansService.updateRecipe(id, mealId, { date: isoDate, mealType });
      toast.success(`Moved ${meal.recipe?.title || 'meal'} to ${mealType}, ${format(new Date(dateKey + 'T12:00:00'), 'EEE MMM d')}`);
    } catch {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to move meal');
    } finally {
      // Prefix match also refreshes plan lists — the server may have extended the plan's dates
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    }
  }, [id, queryClient]);

  // Copy a meal into another day / meal type (drop menu "Copy here" or Ctrl+drop)
  const handleCopyMeal = useCallback(async (mealId: string, dateKey: string, mealType: MealType) => {
    if (!id) return;
    const queryKey = ['meal-plans', id];
    const meal = queryClient.getQueryData<any>(queryKey)?.meals?.find((m: any) => m.id === mealId);
    if (!meal) return;

    try {
      await mealPlansService.addRecipe(id, {
        recipeId: meal.recipe?.id || meal.recipeId,
        date: new Date(dateKey + 'T00:00:00.000Z').toISOString(),
        mealType,
        servings: meal.servings,
        ...(meal.notes ? { notes: meal.notes } : {}),
      });
      toast.success(`Copied ${meal.recipe?.title || 'meal'} to ${mealType}, ${format(new Date(dateKey + 'T12:00:00'), 'EEE MMM d')}`);
    } catch {
      toast.error('Failed to copy meal');
    } finally {
      // Prefix match also refreshes plan lists — the server may have extended the plan's dates
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    }
  }, [id, queryClient]);

  // Remove a meal from the week grid (× on a dish, or dropped on the remove zone).
  // Optimistic, with an Undo toast that re-adds the same dish to the same slot.
  const handleRemoveMeal = useCallback(async (mealId: string) => {
    if (!id) return;
    const queryKey = ['meal-plans', id];
    const previous = queryClient.getQueryData<any>(queryKey);
    const meal = previous?.meals?.find((m: any) => m.id === mealId);
    if (!meal) return;

    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, {
      ...previous,
      meals: previous.meals.filter((m: any) => m.id !== mealId),
    });

    const title = meal.recipe?.title || 'Meal';
    const undo = async () => {
      try {
        await mealPlansService.addRecipe(id, {
          recipeId: meal.recipe?.id || meal.recipeId,
          date: meal.date,
          mealType: meal.mealType,
          servings: meal.servings,
          ...(meal.notes ? { notes: meal.notes } : {}),
        });
        toast.success(`Restored ${title}`);
      } catch {
        toast.error('Failed to restore meal');
      } finally {
        queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      }
    };

    try {
      await mealPlansService.removeRecipe(id, mealId);
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            <span>Removed <strong>{title}</strong></span>
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); undo(); }}
              className="font-semibold text-accent underline whitespace-nowrap"
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000 }
      );
    } catch {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to remove meal');
    } finally {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    }
  }, [id, queryClient]);

  const handleAddWeek = useCallback(() => {
    if (!id || !mealPlan) return;
    const endDate = addDays(new Date(mealPlan.endDate), 7).toISOString();
    return updateMealPlan.mutateAsync({ id, input: { endDate } });
  }, [id, mealPlan, updateMealPlan]);

  const handleAddMealToSlot = useCallback((dateKey: string, mealType: MealType) => {
    setAddRecipeDate(dateKey);
    setAddRecipeMealType(mealType);
    setIsAddRecipeModalOpen(true);
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
              <p className="text-text-muted mt-1">
                {mealPlan.meals.length} meals planned
                {' · '}
                {!showPersonsEdit ? (
                  <button
                    type="button"
                    onClick={() => setShowPersonsEdit(true)}
                    className="inline-flex items-center gap-1 text-text-muted hover:text-accent transition-colors"
                    title="Edit number of persons"
                  >
                    {mealPlan.numberOfPersons || 1} {(mealPlan.numberOfPersons || 1) === 1 ? 'person' : 'persons'}
                    <Pencil className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full border border-border text-text-primary text-xs flex items-center justify-center hover:bg-surface-hover active:scale-95 disabled:opacity-40"
                      onClick={() => {
                        const n = Math.max(1, (mealPlan.numberOfPersons || 1) - 1);
                        updateMealPlan.mutate({ id: id!, input: { numberOfPersons: n } });
                      }}
                      disabled={(mealPlan.numberOfPersons || 1) <= 1}
                    >−</button>
                    <span className="font-semibold text-text-primary">{mealPlan.numberOfPersons || 1}</span>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full border border-border text-text-primary text-xs flex items-center justify-center hover:bg-surface-hover active:scale-95 disabled:opacity-40"
                      onClick={() => {
                        const n = Math.min(25, (mealPlan.numberOfPersons || 1) + 1);
                        updateMealPlan.mutate({ id: id!, input: { numberOfPersons: n } });
                      }}
                      disabled={(mealPlan.numberOfPersons || 1) >= 25}
                    >+</button>
                    <span className="text-text-muted">{(mealPlan.numberOfPersons || 1) === 1 ? 'person' : 'persons'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPersonsEdit(false)}
                      className="text-xs text-accent hover:text-accent-hover ml-1"
                    >done</button>
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <Button onClick={() => { setAddRecipeDate(undefined); setAddRecipeMealType(undefined); setIsAddRecipeModalOpen(true); }}>
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
          <Collapsible
            title="Plan Nutrition Summary"
            subtitle={
              nutrition.mealsWithNutrition !== undefined && nutrition.mealsWithNutrition < nutrition.mealsCount
                ? `Based on ${nutrition.mealsWithNutrition} of ${nutrition.mealsCount} meals`
                : undefined
            }
            className="mb-6"
          >

            {/* Per-person daily average */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{Math.round(nutrition.totalCalories / dailyNutrition.length / (nutrition.numberOfPersons || 1))}</div>
                <div className="text-sm text-text-secondary">Calories{(nutrition.numberOfPersons || 1) > 1 ? ' / person' : ''} / day</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{Math.round(nutrition.totalProtein / dailyNutrition.length / (nutrition.numberOfPersons || 1))}g</div>
                <div className="text-sm text-text-secondary">Protein{(nutrition.numberOfPersons || 1) > 1 ? ' / person' : ''} / day</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{Math.round(nutrition.totalCarbs / dailyNutrition.length / (nutrition.numberOfPersons || 1))}g</div>
                <div className="text-sm text-text-secondary">Carbs{(nutrition.numberOfPersons || 1) > 1 ? ' / person' : ''} / day</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{Math.round(nutrition.totalFat / dailyNutrition.length / (nutrition.numberOfPersons || 1))}g</div>
                <div className="text-sm text-text-secondary">Fat{(nutrition.numberOfPersons || 1) > 1 ? ' / person' : ''} / day</div>
              </div>
            </div>

            {/* Daily breakdown table */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Daily Breakdown{(nutrition.numberOfPersons || 1) > 1 ? ` (per person, ${nutrition.numberOfPersons} persons)` : ''}
              </h3>
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
                        <td className="text-right py-1.5 px-2 text-text-primary font-semibold">{Math.round(day.calories / (nutrition.numberOfPersons || 1))}</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{Math.round(day.protein / (nutrition.numberOfPersons || 1))}g</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{Math.round(day.carbs / (nutrition.numberOfPersons || 1))}g</td>
                        <td className="text-right py-1.5 px-2 text-text-primary">{Math.round(day.fat / (nutrition.numberOfPersons || 1))}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Collapsible>
        )}

        {/* Dishes by meal type — what needs cooking */}
        {mealPlan.meals.length > 0 && (
          <Collapsible
            title="Dishes by Meal Type"
            subtitle={`${distinctDishCount} distinct dish${distinctDishCount === 1 ? '' : 'es'} across ${mealPlan.meals.length} meals`}
            className="mb-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-secondary">
                    <th className="text-left py-1.5 pr-3 font-medium">Dish</th>
                    <th className="text-right py-1.5 px-2 font-medium">Times</th>
                    <th className="text-right py-1.5 px-2 font-medium">Servings</th>
                    <th className="text-right py-1.5 px-2 font-medium">Prep</th>
                    <th className="text-right py-1.5 px-2 font-medium">Cook</th>
                    <th className="text-left py-1.5 px-2 font-medium">Method</th>
                    <th className="text-left py-1.5 pl-2 font-medium">Days</th>
                  </tr>
                </thead>
                {MEAL_TYPE_ORDER.filter((type) => dishesByMealType[type]?.length).map((type) => {
                  const dishes = dishesByMealType[type];
                  const mealCount = dishes.reduce((n, d) => n + d.times, 0);
                  return (
                    <tbody key={type}>
                      <tr>
                        <td colSpan={7} className="pt-4 pb-1.5">
                          <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            <span className={`w-2.5 h-2.5 rounded-full ${MEAL_TYPE_DOTS[type]}`} />
                            {type}
                            <span className="normal-case tracking-normal font-normal text-text-muted">
                              {dishes.length} dish{dishes.length === 1 ? '' : 'es'} · {mealCount} meal{mealCount === 1 ? '' : 's'}
                            </span>
                          </span>
                        </td>
                      </tr>
                      {dishes.map((dish) => {
                        const total = (dish.prepTime || 0) + (dish.cookTime || 0);
                        return (
                          <tr key={dish.recipeId} className="border-t border-border/50 align-top">
                            <td className="py-1.5 pr-3 min-w-[160px]">
                              <Link to={`/recipes/${dish.recipeId}`} className="text-text-primary font-medium hover:text-accent">
                                {dish.title}
                              </Link>
                              {total >= 60 && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-text-muted whitespace-nowrap" title="Takes an hour or more in total">
                                  <Clock className="w-3 h-3" /> {formatMinutes(total)}
                                </span>
                              )}
                            </td>
                            <td className="text-right py-1.5 px-2 text-text-primary font-semibold">×{dish.times}</td>
                            <td className="text-right py-1.5 px-2 text-text-primary">{dish.servings}</td>
                            <td className="text-right py-1.5 px-2 text-text-primary whitespace-nowrap">{formatMinutes(dish.prepTime)}</td>
                            <td className="text-right py-1.5 px-2 text-text-primary whitespace-nowrap">{formatMinutes(dish.cookTime)}</td>
                            <td className="py-1.5 px-2">
                              {dish.methods.length > 0 ? (
                                <span className="flex flex-wrap gap-1">
                                  {dish.methods.map((m) => (
                                    <Badge key={m} variant="red">{m}</Badge>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="py-1.5 pl-2 text-text-secondary text-xs min-w-[120px]">
                              {dish.dates.map((d) => format(new Date(d + 'T12:00:00'), 'EEE d')).join(', ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </Collapsible>
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
              <Collapsible
                title="Week Calendar"
                subtitle={`${mealPlan.meals.length} meals planned`}
                defaultOpen
                className="mb-6"
              >
                <WeekGridView
                  mealsByDate={mealsByDate}
                  startDate={mealPlan.startDate}
                  endDate={mealPlan.endDate}
                  onDateClick={(dateKey) => { setViewMode('cards'); setTimeout(() => handleDateClick(dateKey), 50); }}
                  onMoveMeal={handleMoveMeal}
                  onCopyMeal={handleCopyMeal}
                  onRemoveMeal={handleRemoveMeal}
                  onAddMeal={handleAddMealToSlot}
                  onAddWeek={handleAddWeek}
                />
              </Collapsible>
            )}

            {/* Card View (existing day cards) */}
            {viewMode === 'cards' && (
              <div className="space-y-3">
                {Object.entries(mealsByDate).map(([dateKey, meals]) => {
                  const isOpen = !!dayOpenStates[dateKey];
                  return (
                    <div
                      key={dateKey}
                      ref={(el: HTMLDivElement | null) => { dateRefs.current[dateKey] = el; }}
                      className="bg-detail-mealplans border border-detail-mealplans-border rounded-xl shadow-sm transition-all duration-300"
                    >
                      {/* Day header \u2014 always visible */}
                      <div className="flex items-center justify-between px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setDayOpenStates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          <ChevronDown
                            size={18}
                            className={`shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                          <h3 className="text-base font-semibold text-text-primary">
                            {format(new Date(dateKey), 'EEEE, MMMM d')}
                          </h3>
                          <span className="text-sm text-text-muted shrink-0">
                            {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddRecipeDate(dateKey); setAddRecipeMealType(undefined); setIsAddRecipeModalOpen(true); }}
                          className="ml-2 p-1.5 rounded-lg text-accent hover:bg-accent-light transition-colors shrink-0"
                          title="Add meal to this day"
                        >
                          <PlusCircle size={20} />
                        </button>
                      </div>

                      {/* Collapsible meals list */}
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="px-5 pb-4 space-y-3">
                            {[...meals].sort((a, b) => {
                              const order = { breakfast: 0, snack: 1, lunch: 2, dinner: 3 };
                              return (order[a.mealType as keyof typeof order] ?? 4) - (order[b.mealType as keyof typeof order] ?? 4);
                            }).map((meal) => (
                              <div
                                key={meal.id}
                                className="flex items-center justify-between p-4 bg-surface rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5">
                                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${{
                                        breakfast: 'bg-amber-400',
                                        lunch: 'bg-green-400',
                                        dinner: 'bg-blue-400',
                                        snack: 'bg-purple-400',
                                      }[meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack'] ?? 'bg-gray-400'}`} />
                                      <Badge variant="blue" className="uppercase">
                                        {meal.mealType}
                                      </Badge>
                                    </span>
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}


        {/* Add Recipe Modal */}
        {id && (
          <AddRecipeModal
            mealPlanId={id}
            isOpen={isAddRecipeModalOpen}
            onClose={() => { setIsAddRecipeModalOpen(false); setAddRecipeDate(undefined); setAddRecipeMealType(undefined); setPreSelectedRecipeId(undefined); }}
            defaultDate={addRecipeDate}
            defaultMealType={addRecipeMealType}
            preSelectedRecipeId={preSelectedRecipeId}
            numberOfPersons={mealPlan?.numberOfPersons || 1}
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
