import { useState, useMemo } from 'react';
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

interface Props {
  /** Plan start date (YYYY-MM-DD) */
  startDate: string;
  /** Plan end date (YYYY-MM-DD) */
  endDate: string;
  /** Currently selected cooking-free day strings (YYYY-MM-DD) */
  selectedDays: string[];
  /** Called with updated array of cooking-free day strings */
  onChange: (days: string[]) => void;
}

export default function CookingFreeDaysPicker({
  startDate,
  endDate,
  selectedDays,
  onChange,
}: Props) {
  const planStart = new Date(startDate);
  const planEnd = new Date(endDate);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(planStart));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Build calendar grid (start Monday)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const dayNamesFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNamesShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const isInRange = (day: Date) =>
    isWithinInterval(day, { start: planStart, end: planEnd });

  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);

  const toggleDay = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    if (selectedSet.has(key)) {
      onChange(selectedDays.filter(d => d !== key));
    } else {
      onChange([...selectedDays, key]);
    }
  };

  const today = new Date();

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Cooking-free days
      </label>
      <p className="text-xs text-text-muted mb-3">
        Tap dates when you don't want to cook. AI will plan quick meals (leftovers, no-cook) for those days.
      </p>

      <div className="border border-border-default rounded-lg p-3 bg-surface select-none">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {dayNamesFull.map((name, i) => (
            <div key={name} className="text-center text-xs font-medium text-text-muted py-1">
              <span className="hidden sm:inline">{name}</span>
              <span className="sm:hidden">{dayNamesShort[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {weeks.map(week =>
            week.map(day => {
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const inRange = isInRange(day);
              const dateKey = format(day, 'yyyy-MM-dd');
              const isSelected = selectedSet.has(dateKey);
              const isToday = isSameDay(day, today);
              const isClickable = inCurrentMonth && inRange;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => isClickable && toggleDay(day)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center py-2 text-xs rounded-md min-h-[36px] transition-colors
                    ${!inCurrentMonth ? 'text-text-muted opacity-30' : ''}
                    ${inCurrentMonth && !inRange ? 'text-text-muted cursor-default' : ''}
                    ${isClickable && !isSelected ? 'text-text-secondary hover:bg-hover-bg cursor-pointer' : ''}
                    ${isClickable && isSelected ? 'bg-amber-100 text-amber-800 font-semibold hover:bg-amber-200 cursor-pointer' : ''}
                    ${isToday ? 'ring-1 ring-accent-ring ring-inset' : ''}
                  `}
                  title={
                    isClickable
                      ? isSelected
                        ? 'Cooking-free day (click to remove)'
                        : 'Click to mark as cooking-free'
                      : undefined
                  }
                >
                  <span className={`
                    w-7 h-7 flex items-center justify-center rounded-full
                    ${isClickable && isSelected ? 'bg-amber-300 text-amber-900' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Summary */}
        {selectedDays.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-default flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {selectedDays.length} cooking-free day{selectedDays.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
