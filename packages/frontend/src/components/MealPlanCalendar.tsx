import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { useState } from 'react';

interface MealPlanCalendarProps {
  startDate: string;
  endDate: string;
  /** Map of 'yyyy-MM-dd' -> array of meal types for that day */
  mealsByDate: Record<string, { mealType: string }[]>;
  /** Called when user clicks a date that has meals */
  onDateClick?: (dateKey: string) => void;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-400',
  lunch: 'bg-green-400',
  dinner: 'bg-blue-400',
  snack: 'bg-purple-400',
};

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealPlanCalendar({
  startDate,
  endDate,
  mealsByDate,
  onDateClick,
}: MealPlanCalendarProps) {
  const planStart = new Date(startDate);
  const planEnd = new Date(endDate);

  // Start viewing the month of the plan start date
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(planStart));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Build the calendar grid (always start on Monday)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Split into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const dayNamesFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNamesShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const isInPlanRange = (day: Date) =>
    isWithinInterval(day, { start: planStart, end: planEnd });

  const getMealsForDay = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    return mealsByDate[key] || [];
  };

  // Get unique meal types for dots, sorted by the standard order
  const getMealTypesForDay = (day: Date): string[] => {
    const meals = getMealsForDay(day);
    const types = [...new Set(meals.map((m) => m.mealType))];
    return types.sort(
      (a, b) => MEAL_TYPE_ORDER.indexOf(a) - MEAL_TYPE_ORDER.indexOf(b)
    );
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const today = new Date();

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1">
        {dayNamesFull.map((name, i) => (
          <div key={name} className="text-center text-xs font-medium text-gray-400 py-1">
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{dayNamesShort[i]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week) =>
          week.map((day) => {
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const inPlanRange = isInPlanRange(day);
            const mealTypes = getMealTypesForDay(day);
            const hasMeals = mealTypes.length > 0;
            const isToday = isSameDay(day, today);
            const dateKey = format(day, 'yyyy-MM-dd');

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => hasMeals && onDateClick?.(dateKey)}
                className={`
                  relative flex flex-col items-center py-2 text-xs transition-colors rounded-md min-h-[40px]
                  ${!inCurrentMonth ? 'text-gray-300' : ''}
                  ${inCurrentMonth && !inPlanRange ? 'text-gray-400' : ''}
                  ${inCurrentMonth && inPlanRange && !hasMeals ? 'text-gray-600' : ''}
                  ${inCurrentMonth && inPlanRange && hasMeals ? 'text-gray-900 font-semibold cursor-pointer hover:bg-blue-50 active:bg-blue-100' : ''}
                  ${!hasMeals ? 'cursor-default' : ''}
                  ${isToday ? 'ring-1 ring-blue-400 ring-inset' : ''}
                `}
                disabled={!hasMeals}
                title={
                  hasMeals
                    ? `${mealTypes.length} meal type${mealTypes.length > 1 ? 's' : ''}: ${mealTypes.join(', ')}`
                    : undefined
                }
              >
                <span className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-sm
                  ${inCurrentMonth && inPlanRange && hasMeals ? 'bg-blue-100' : ''}
                  ${inCurrentMonth && inPlanRange && !hasMeals ? 'bg-gray-50' : ''}
                `}>
                  {format(day, 'd')}
                </span>

                {/* Meal type dots */}
                <div className="flex gap-0.5 mt-0.5 h-2">
                  {hasMeals &&
                    mealTypes.map((type) => (
                      <span
                        key={type}
                        className={`w-2 h-2 rounded-full ${MEAL_TYPE_COLORS[type] || 'bg-gray-400'}`}
                        title={type}
                      />
                    ))}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
        {MEAL_TYPE_ORDER.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${MEAL_TYPE_COLORS[type]}`} />
            <span className="text-xs text-gray-500 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
