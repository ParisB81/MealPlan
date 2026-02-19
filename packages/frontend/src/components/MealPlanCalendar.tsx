import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import { Copy, X } from 'lucide-react';
import CalendarContextMenu from './CalendarContextMenu';

interface MealPlanCalendarProps {
  startDate: string;
  endDate: string;
  /** Map of 'yyyy-MM-dd' -> array of meal types for that day */
  mealsByDate: Record<string, { mealType: string }[]>;
  /** Called when user clicks a date that has meals (normal mode) */
  onDateClick?: (dateKey: string) => void;
  /** Copy-paste state from parent (null = normal mode) */
  copyState?: { sourceDate: string; label: string } | null;
  /** Called when user selects a copy option from context menu */
  onCopyMeals?: (sourceDate: string, mealType: string | 'all') => void;
  /** Called when user clicks a target day in paste mode */
  onPasteMeals?: (targetDate: string) => void;
  /** Called to exit paste mode */
  onCancelCopy?: () => void;
  /** True while paste API calls are in progress */
  isPasting?: boolean;
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
  copyState,
  onCopyMeals,
  onPasteMeals,
  onCancelCopy,
  isPasting,
}: MealPlanCalendarProps) {
  const planStart = new Date(startDate);
  const planEnd = new Date(endDate);

  // Start viewing the month of the plan start date
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(planStart));

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dateKey: string;
    mealTypes: string[];
  } | null>(null);

  // Long-press refs for mobile
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

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

  // Close context menu on Escape, cancel paste mode on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (copyState) {
          onCancelCopy?.();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [contextMenu, copyState, onCancelCopy]);

  // Open context menu handler
  const openContextMenu = useCallback((x: number, y: number, dateKey: string, mealTypes: string[]) => {
    setContextMenu({ x, y, dateKey, mealTypes });
  }, []);

  // Handle day button click
  const handleDayClick = useCallback((dateKey: string, hasMeals: boolean, inPlanRange: boolean) => {
    // If long-press just triggered, suppress the click
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    // Paste mode: click to paste
    if (copyState) {
      if (inPlanRange && dateKey !== copyState.sourceDate && !isPasting) {
        onPasteMeals?.(dateKey);
      }
      return;
    }

    // Normal mode: scroll to day card
    if (hasMeals) {
      onDateClick?.(dateKey);
    }
  }, [copyState, isPasting, onPasteMeals, onDateClick]);

  // Handle right-click
  const handleContextMenu = useCallback((e: React.MouseEvent, dateKey: string, mealTypes: string[]) => {
    e.preventDefault();
    if (mealTypes.length === 0) return;
    openContextMenu(e.clientX, e.clientY, dateKey, mealTypes);
  }, [openContextMenu]);

  // Long-press handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, dateKey: string, mealTypes: string[]) => {
    if (mealTypes.length === 0) return;
    longPressTriggeredRef.current = false;
    // Capture touch coordinates immediately — React recycles the event object
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openContextMenu(touchX, touchY, dateKey, mealTypes);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle context menu item selection
  const handleContextMenuSelect = useCallback((mealType: string | 'all') => {
    if (contextMenu) {
      onCopyMeals?.(contextMenu.dateKey, mealType);
      setContextMenu(null);
    }
  }, [contextMenu, onCopyMeals]);

  return (
    <div className="select-none">
      {/* Paste mode status banner */}
      {copyState && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Copy size={14} className="text-amber-600 shrink-0" />
            <span className="text-amber-800 truncate">
              Copying <strong>{copyState.label}</strong> — tap days to paste
            </span>
          </div>
          <button
            onClick={onCancelCopy}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1.5 rounded hover:bg-amber-100 active:bg-amber-200 shrink-0 ml-2 min-h-[36px]"
          >
            <X size={12} />
            <span className="hidden sm:inline">Cancel</span>
            <span className="sm:hidden">Esc</span>
          </button>
        </div>
      )}

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

            // Paste mode styling
            const isSourceDay = copyState?.sourceDate === dateKey;
            const isValidTarget = copyState && inPlanRange && inCurrentMonth && !isSourceDay;
            const inPasteMode = !!copyState;

            // Determine if button should be disabled
            const isDisabled = inPasteMode
              ? (!inPlanRange || !inCurrentMonth || isSourceDay)
              : !hasMeals;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(dateKey, hasMeals, inPlanRange)}
                onContextMenu={(e) => handleContextMenu(e, dateKey, mealTypes)}
                onTouchStart={(e) => handleTouchStart(e, dateKey, mealTypes)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                className={`
                  relative flex flex-col items-center py-2 text-xs transition-colors rounded-md min-h-[40px]
                  ${!inCurrentMonth ? 'text-gray-300' : ''}
                  ${inCurrentMonth && !inPlanRange ? 'text-gray-400' : ''}
                  ${inCurrentMonth && inPlanRange && !hasMeals && !inPasteMode ? 'text-gray-600' : ''}
                  ${inCurrentMonth && inPlanRange && hasMeals && !inPasteMode ? 'text-gray-900 font-semibold cursor-pointer hover:bg-blue-50 active:bg-blue-100' : ''}
                  ${!inPasteMode && !hasMeals ? 'cursor-default' : ''}
                  ${isToday ? 'ring-1 ring-blue-400 ring-inset' : ''}
                  ${isSourceDay ? 'ring-2 ring-amber-400 bg-amber-50' : ''}
                  ${isValidTarget ? 'text-gray-900 border-2 border-dashed border-green-300 hover:bg-green-50 active:bg-green-100 cursor-copy' : ''}
                  ${isValidTarget && isPasting ? 'opacity-50 cursor-wait' : ''}
                  ${inPasteMode && inCurrentMonth && inPlanRange && !isSourceDay && !isValidTarget ? '' : ''}
                `}
                disabled={isDisabled}
                title={
                  isSourceDay
                    ? 'Source day (copying from here)'
                    : isValidTarget
                    ? 'Click to paste meals here'
                    : hasMeals
                    ? `${mealTypes.length} meal type${mealTypes.length > 1 ? 's' : ''}: ${mealTypes.join(', ')}`
                    : undefined
                }
              >
                <span className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-sm
                  ${inCurrentMonth && inPlanRange && hasMeals && !isSourceDay ? 'bg-blue-100' : ''}
                  ${inCurrentMonth && inPlanRange && !hasMeals && !isSourceDay ? 'bg-gray-50' : ''}
                  ${isSourceDay ? 'bg-amber-200' : ''}
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

      {/* Context Menu */}
      {contextMenu && (
        <CalendarContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          mealTypes={contextMenu.mealTypes}
          onSelect={handleContextMenuSelect}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
