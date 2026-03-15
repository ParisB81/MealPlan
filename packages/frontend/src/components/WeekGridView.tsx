import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isWithinInterval,
  isSameDay,
  differenceInWeeks,
} from 'date-fns';

interface WeekGridViewProps {
  mealsByDate: Record<string, any[]>;
  startDate: string;
  endDate: string;
  onDateClick?: (dateKey: string) => void;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-400',
  lunch: 'bg-green-400',
  dinner: 'bg-blue-400',
  snack: 'bg-purple-400',
};

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function WeekGridView({ mealsByDate, startDate, endDate, onDateClick }: WeekGridViewProps) {
  const planStart = new Date(startDate);
  const planEnd = new Date(endDate);
  const today = new Date();

  // Determine the initial week to show
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // If today is within the plan range, start on today's week
    if (isWithinInterval(today, { start: planStart, end: planEnd })) {
      return startOfWeek(today, { weekStartsOn: 1 });
    }
    // Otherwise start on the plan's first week
    return startOfWeek(planStart, { weekStartsOn: 1 });
  });

  // Compute the days for the current week
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  // Navigation
  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  // Compute week range bounds for disabling navigation
  const planFirstWeek = startOfWeek(planStart, { weekStartsOn: 1 });
  const planLastWeek = startOfWeek(planEnd, { weekStartsOn: 1 });

  // Week counter for display
  const totalWeeks = differenceInWeeks(planLastWeek, planFirstWeek) + 1;
  const currentWeekNum = differenceInWeeks(currentWeekStart, planFirstWeek) + 1;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevWeek}
          disabled={currentWeekStart <= planFirstWeek}
          className="p-2 rounded-lg hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous week"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-text-primary">
            {format(weekDays[0], 'MMM d')} — {format(weekDays[6], 'MMM d, yyyy')}
          </h3>
          <p className="text-xs text-text-muted">Week {currentWeekNum} of {totalWeeks}</p>
        </div>
        <button
          type="button"
          onClick={handleNextWeek}
          disabled={currentWeekStart >= planLastWeek}
          className="p-2 rounded-lg hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 7-column grid — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="grid grid-cols-7 gap-1 min-w-[700px]">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMeals = mealsByDate[dateKey] || [];
            const isToday = isSameDay(day, today);
            const inRange = isWithinInterval(day, { start: planStart, end: planEnd });

            // Sort meals by type order
            const sortedMeals = [...dayMeals].sort(
              (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType)
            );

            return (
              <div
                key={dateKey}
                className={`rounded-lg border p-2 min-h-[120px] ${
                  isToday
                    ? 'border-accent bg-accent-light/50'
                    : inRange
                      ? 'border-border-default bg-surface'
                      : 'border-border-default/50 bg-surface/50 opacity-50'
                }`}
              >
                {/* Day header */}
                <button
                  type="button"
                  onClick={() => dayMeals.length > 0 && onDateClick?.(dateKey)}
                  className={`w-full text-center mb-2 pb-1 border-b border-border-default/50 ${
                    dayMeals.length > 0 ? 'cursor-pointer hover:text-accent' : 'cursor-default'
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-text-muted'}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                    {format(day, 'd')}
                  </div>
                </button>

                {/* Meals list */}
                <div className="space-y-1.5">
                  {sortedMeals.map((meal) => (
                    <div key={meal.id} className="flex items-start gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${MEAL_TYPE_COLORS[meal.mealType] || 'bg-gray-400'}`}
                        title={meal.mealType}
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/recipes/${meal.recipe?.id || meal.recipeId}`}
                          className="text-xs text-text-primary hover:text-accent leading-tight block truncate"
                          title={meal.recipe?.title}
                        >
                          {meal.recipe?.title || 'Unknown recipe'}
                        </Link>
                      </div>
                    </div>
                  ))}
                  {sortedMeals.length === 0 && inRange && (
                    <p className="text-xs text-text-muted text-center italic">No meals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border-default">
        {MEAL_TYPE_ORDER.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${MEAL_TYPE_COLORS[type]}`} />
            <span className="text-xs text-text-muted capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
