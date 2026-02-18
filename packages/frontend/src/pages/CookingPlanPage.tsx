import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { format, eachDayOfInterval, parseISO, isBefore, isEqual } from 'date-fns';
import { useMealPlans, useMealPlan } from '../hooks/useMealPlans';
import { useCookingPlan, useCreateCookingPlan } from '../hooks/useCookingPlans';
import { Button, Card, Badge, Alert, Modal, Input } from '../components/ui';
import { ChefHat, Calendar, Clock, ArrowRight, Save } from 'lucide-react';
import type { MealPlanRecipe } from '../types/mealPlan';

interface CookDaySchedule {
  cookDate: Date;
  coversUntil: Date;
  meals: MealPlanRecipe[];
  totalPrepTime: number;
  totalCookTime: number;
}

export default function CookingPlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isViewMode = !!id;

  // Load saved cooking plan if viewing
  const { data: savedPlan, isLoading: savedPlanLoading } = useCookingPlan(id);
  const createCookingPlan = useCreateCookingPlan();

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [planName, setPlanName] = useState('');

  const { data: mealPlans, isLoading: plansLoading } = useMealPlans('active');

  // Selected meal plan IDs
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  // Selected cook days (ISO date strings)
  const [selectedCookDays, setSelectedCookDays] = useState<Set<string>>(new Set());
  // Whether we've generated a schedule
  const [schedule, setSchedule] = useState<CookDaySchedule[] | null>(null);
  // Track if we've hydrated from saved plan
  const [hydrated, setHydrated] = useState(false);

  // Fetch each selected meal plan's details (with meals)
  const plan1 = useMealPlan(selectedPlanIds[0]);
  const plan2 = useMealPlan(selectedPlanIds[1]);
  const plan3 = useMealPlan(selectedPlanIds[2]);
  const plan4 = useMealPlan(selectedPlanIds[3]);

  const selectedPlansData = useMemo(() => {
    return [plan1, plan2, plan3, plan4]
      .filter((q) => q.data)
      .map((q) => q.data!);
  }, [plan1.data, plan2.data, plan3.data, plan4.data]);

  const isLoadingPlans = [plan1, plan2, plan3, plan4].some(
    (q) => q.isLoading && q.fetchStatus !== 'idle'
  );

  // Compute the full date range across all selected plans
  const dateRange = useMemo(() => {
    if (selectedPlansData.length === 0) return [];

    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const plan of selectedPlansData) {
      const start = parseISO(plan.startDate);
      const end = parseISO(plan.endDate);
      if (!earliest || isBefore(start, earliest)) earliest = start;
      if (!latest || isBefore(latest, end)) latest = end;
    }

    if (!earliest || !latest) return [];
    return eachDayOfInterval({ start: earliest, end: latest });
  }, [selectedPlansData]);

  // Hydrate state from saved plan
  useEffect(() => {
    if (savedPlan && !hydrated) {
      setSelectedPlanIds(savedPlan.mealPlanIds);
      setSelectedCookDays(new Set(savedPlan.cookDays));
      setHydrated(true);
    }
  }, [savedPlan, hydrated]);

  // Generate the cooking plan schedule
  const generateSchedule = useCallback(() => {
    if (selectedCookDays.size === 0 || selectedPlansData.length === 0) return;

    // Collect all meals from all selected plans
    const allMeals: MealPlanRecipe[] = [];
    for (const plan of selectedPlansData) {
      if (plan.meals) {
        allMeals.push(...plan.meals);
      }
    }

    // Sort meals by date, then by meal type order
    const mealTypeOrder: Record<string, number> = {
      breakfast: 0,
      lunch: 1,
      dinner: 2,
      snack: 3,
    };
    allMeals.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return (mealTypeOrder[a.mealType] ?? 4) - (mealTypeOrder[b.mealType] ?? 4);
    });

    // Sort cook days chronologically
    const cookDaysSorted = Array.from(selectedCookDays).sort();

    // Build schedule: each cook day covers from itself until just before the next cook day
    const result: CookDaySchedule[] = [];

    for (let i = 0; i < cookDaysSorted.length; i++) {
      const cookDate = parseISO(cookDaysSorted[i]);
      const nextCookDate =
        i + 1 < cookDaysSorted.length ? parseISO(cookDaysSorted[i + 1]) : null;

      // Find the last date this cook day covers
      let coversUntil: Date;
      if (nextCookDate) {
        // Covers up to the day before the next cook day
        const dayBeforeNext = new Date(nextCookDate);
        dayBeforeNext.setDate(dayBeforeNext.getDate() - 1);
        coversUntil = dayBeforeNext;
      } else {
        // Last cook day: covers until end of plan range
        const lastDate = dateRange[dateRange.length - 1];
        coversUntil = lastDate || cookDate;
      }

      // Filter meals for this cook day's coverage
      const mealsForDay = allMeals.filter((meal) => {
        const mealDate = parseISO(meal.date);
        const afterOrOnCookDay =
          isBefore(cookDate, mealDate) || isEqual(cookDate, mealDate);

        if (nextCookDate) {
          return afterOrOnCookDay && isBefore(mealDate, nextCookDate);
        } else {
          // Last cook day: include all remaining meals
          return afterOrOnCookDay;
        }
      });

      let totalPrepTime = 0;
      let totalCookTime = 0;
      for (const meal of mealsForDay) {
        totalPrepTime += meal.recipe?.prepTime || 0;
        totalCookTime += meal.recipe?.cookTime || 0;
      }

      result.push({
        cookDate,
        coversUntil,
        meals: mealsForDay,
        totalPrepTime,
        totalCookTime,
      });
    }

    setSchedule(result);
  }, [selectedCookDays, selectedPlansData, dateRange]);

  // Auto-generate schedule when viewing a saved plan and data is ready
  useEffect(() => {
    if (
      isViewMode &&
      hydrated &&
      selectedPlansData.length > 0 &&
      selectedCookDays.size > 0 &&
      !schedule
    ) {
      generateSchedule();
    }
  }, [isViewMode, hydrated, selectedPlansData, selectedCookDays, schedule, generateSchedule]);

  // Toggle a meal plan on/off (only in new mode)
  const togglePlan = (planId: string) => {
    if (isViewMode) return;
    setSelectedPlanIds((prev) => {
      if (prev.includes(planId)) {
        return prev.filter((currId) => currId !== planId);
      }
      if (prev.length >= 4) return prev; // limit to 4 concurrent plans
      return [...prev, planId];
    });
    // Reset schedule and cook days when plans change
    setSchedule(null);
    setSelectedCookDays(new Set());
  };

  // Toggle a cook day (only in new mode)
  const toggleCookDay = (dateStr: string) => {
    if (isViewMode) return;
    setSelectedCookDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
    setSchedule(null); // Reset schedule when cook days change
  };

  // Save handler
  const handleSave = () => {
    if (!planName.trim()) return;
    createCookingPlan.mutate(
      {
        name: planName.trim(),
        mealPlanIds: selectedPlanIds,
        cookDays: Array.from(selectedCookDays),
      },
      {
        onSuccess: (data) => {
          setShowSaveModal(false);
          setPlanName('');
          navigate(`/cooking-plans/${data.id}`);
        },
      }
    );
  };

  // Helper to format meal type nicely
  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Helper for time display
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // Badge color for meal type
  const mealTypeBadge = (type: string) => {
    const colors: Record<string, 'blue' | 'green' | 'orange' | 'purple'> = {
      breakfast: 'blue',
      lunch: 'green',
      dinner: 'orange',
      snack: 'purple',
    };
    return colors[type] || ('gray' as const);
  };

  // Loading state for saved plan
  if (isViewMode && savedPlanLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <p className="text-gray-500">Loading cooking plan...</p>
      </div>
    );
  }

  if (isViewMode && !savedPlan && !savedPlanLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Alert variant="error">Cooking plan not found.</Alert>
        <Link
          to="/cooking-plans"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          &larr; Back to Cooking Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <Link
        to="/cooking-plans"
        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        &larr; Back to Cooking Plans
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <h1 className="text-4xl font-bold text-gray-900">
            {isViewMode ? savedPlan?.name || 'Cooking Plan' : 'New Cooking Plan'}
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          {isViewMode
            ? 'Viewing your saved cooking schedule.'
            : "Select your meal plans, pick the days you'll cook, and see exactly what to prepare on each cook day."}
        </p>
      </header>

      {/* Step 1: Select Meal Plans */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
            1
          </span>
          {isViewMode ? 'Selected Meal Plans' : 'Select Meal Plans'}
        </h2>

        {plansLoading ? (
          <p className="text-gray-500">Loading meal plans...</p>
        ) : !mealPlans || mealPlans.length === 0 ? (
          <Alert variant="info">
            No active meal plans found.{' '}
            <Link to="/meal-plans" className="underline">
              Create a meal plan
            </Link>{' '}
            first.
          </Alert>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mealPlans.map((plan) => {
              const isSelected = selectedPlanIds.includes(plan.id);
              // In view mode, only show selected plans
              if (isViewMode && !isSelected) return null;
              return (
                <button
                  key={plan.id}
                  onClick={() => togglePlan(plan.id)}
                  disabled={isViewMode}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${isViewMode ? 'cursor-default' : ''}`}
                >
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(parseISO(plan.startDate), 'MMM d')} –{' '}
                    {format(parseISO(plan.endDate), 'MMM d, yyyy')}
                  </p>
                  {plan.meals && (
                    <p className="text-xs text-gray-400 mt-1">
                      {plan.meals.length} meal{plan.meals.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2: Pick Cook Days */}
      {selectedPlanIds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
              2
            </span>
            {isViewMode ? 'Cook Days' : 'Pick Your Cook Days'}
          </h2>

          {isLoadingPlans ? (
            <p className="text-gray-500">Loading plan details...</p>
          ) : dateRange.length === 0 ? (
            <p className="text-gray-500">No date range found.</p>
          ) : (
            <>
              {!isViewMode && (
                <p className="text-sm text-gray-500 mb-3">
                  Click on the dates when you plan to cook. Each cook day will cover
                  meals until the next cook day.
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {dateRange.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedCookDays.has(dateStr);
                  // In view mode, only show selected cook days
                  if (isViewMode && !isSelected) return null;
                  const dayName = format(date, 'EEE');
                  const dayNum = format(date, 'd');
                  const monthName = format(date, 'MMM');

                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleCookDay(dateStr)}
                      disabled={isViewMode}
                      className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all min-w-[60px] ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      } ${isViewMode ? 'cursor-default' : ''}`}
                    >
                      <span className="text-xs font-medium">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      <span className="text-xs">{monthName}</span>
                    </button>
                  );
                })}
              </div>

              {!isViewMode && (
                <Button
                  variant="primary"
                  onClick={generateSchedule}
                  disabled={selectedCookDays.size === 0}
                >
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Generate Cooking Plan
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {/* Step 3: Generated Schedule */}
      {schedule && (
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
              3
            </span>
            Your Cooking Schedule
          </h2>

          {schedule.length === 0 ? (
            <Alert variant="info">No cook days selected.</Alert>
          ) : (
            <div className="space-y-6">
              {schedule.map((day, idx) => (
                <Card key={idx} padding="none">
                  {/* Cook day header */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-4 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <ChefHat className="w-5 h-5" />
                          Cook Day: {format(day.cookDate, 'EEEE, MMM d')}
                        </h3>
                        <p className="text-orange-100 text-sm mt-1">
                          Covers meals for:{' '}
                          {format(day.cookDate, 'EEE MMM d')}
                          {!isEqual(day.cookDate, day.coversUntil) && (
                            <>
                              {' '}
                              <ArrowRight className="w-3 h-3 inline" />{' '}
                              {format(day.coversUntil, 'EEE MMM d')}
                            </>
                          )}
                        </p>
                      </div>
                      {(day.totalPrepTime > 0 || day.totalCookTime > 0) && (
                        <div className="text-right">
                          <div className="text-white text-sm font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(day.totalPrepTime + day.totalCookTime)} total
                          </div>
                          <p className="text-orange-100 text-xs mt-0.5">
                            Prep {formatTime(day.totalPrepTime)} + Cook{' '}
                            {formatTime(day.totalCookTime)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meals list */}
                  <div className="divide-y divide-gray-100">
                    {day.meals.length === 0 ? (
                      <div className="px-6 py-8 text-center text-gray-400">
                        No meals scheduled for this period.
                      </div>
                    ) : (
                      day.meals.map((meal, mIdx) => (
                        <div
                          key={`${meal.id}-${mIdx}`}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link
                                to={`/recipes/${meal.recipeId}`}
                                className="text-base font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {meal.recipe?.title || 'Unknown Recipe'}
                              </Link>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge
                                  variant={mealTypeBadge(meal.mealType)}
                                  size="sm"
                                >
                                  {formatMealType(meal.mealType)}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {format(parseISO(meal.date), 'EEE, MMM d')}
                                </span>
                                <span className="text-sm text-gray-400">&middot;</span>
                                <span className="text-sm text-gray-500">
                                  {meal.servings} serving
                                  {meal.servings !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-400 ml-4 flex-shrink-0">
                              {(meal.recipe?.prepTime || meal.recipe?.cookTime) && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {meal.recipe.prepTime
                                    ? `Prep ${meal.recipe.prepTime}m`
                                    : ''}
                                  {meal.recipe.prepTime && meal.recipe.cookTime
                                    ? ' + '
                                    : ''}
                                  {meal.recipe.cookTime
                                    ? `Cook ${meal.recipe.cookTime}m`
                                    : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          {meal.notes && (
                            <p className="text-sm text-gray-400 italic mt-1">
                              {meal.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary footer */}
                  {day.meals.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {day.meals.length} recipe
                        {day.meals.length !== 1 ? 's' : ''} to prepare
                      </span>
                      {(day.totalPrepTime > 0 || day.totalCookTime > 0) && (
                        <span className="text-sm font-medium text-gray-600">
                          Total: {formatTime(day.totalPrepTime + day.totalCookTime)}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Save button (only in new mode) */}
          {!isViewMode && schedule && schedule.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowSaveModal(true)}
              >
                <Save className="w-5 h-5 mr-2 inline" />
                Save Cooking Plan
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Save Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Cooking Plan"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSaveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!planName.trim() || createCookingPlan.isPending}
            >
              {createCookingPlan.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <Input
          label="Plan Name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="e.g., Week of Jan 27 Cooking Schedule"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
      </Modal>
    </div>
  );
}
