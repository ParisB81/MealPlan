import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus, GripVertical } from 'lucide-react';
import {
  format,
  addDays,
  isSameDay,
  differenceInCalendarDays,
  startOfDay,
} from 'date-fns';
import type { MealType } from '../types/mealPlan';

interface WeekGridViewProps {
  mealsByDate: Record<string, any[]>;
  startDate: string;
  endDate: string;
  onDateClick?: (dateKey: string) => void;
  /** Called when a meal is dropped onto a different day / meal-type cell */
  onMoveMeal?: (mealId: string, dateKey: string, mealType: MealType) => void;
  /** Called when the "+" in a cell is pressed */
  onAddMeal?: (dateKey: string, mealType: MealType) => void;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-400',
  lunch: 'bg-green-400',
  dinner: 'bg-blue-400',
  snack: 'bg-purple-400',
};

const MEAL_TYPE_BORDERS: Record<string, string> = {
  breakfast: 'border-l-amber-400',
  lunch: 'border-l-green-400',
  dinner: 'border-l-blue-400',
  snack: 'border-l-purple-400',
};

// Same order as the day cards (breakfast → snack → lunch → dinner)
const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'snack', 'lunch', 'dinner'];

const LONG_PRESS_MS = 300;
const MOUSE_DRAG_THRESHOLD = 5;
const TOUCH_MOVE_TOLERANCE = 8;
const EDGE_SCROLL_ZONE = 48;
const EDGE_SCROLL_SPEED = 12;
// Hovering a dragged dish over the prev/next arrow flips the week after this delay (repeats while held)
const WEEK_FLIP_DELAY_MS = 600;

interface DragState {
  meal: any;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

interface DropTarget {
  dateKey: string;
  mealType: MealType;
}

interface PendingDrag {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  meal: any;
  el: HTMLElement;
  timer?: number;
}

export default function WeekGridView({
  mealsByDate,
  startDate,
  endDate,
  onDateClick,
  onMoveMeal,
  onAddMeal,
}: WeekGridViewProps) {
  const planStart = startOfDay(new Date(startDate));
  const planEnd = startOfDay(new Date(endDate));
  const today = new Date();
  const isInPlan = (day: Date) => day >= planStart && day <= planEnd;

  // Weeks are 7-day windows aligned to the plan's first day (not Mon–Sun),
  // so a 7-day plan starting mid-week fits in a single view.
  const totalWeeks = Math.max(1, Math.ceil((differenceInCalendarDays(planEnd, planStart) + 1) / 7));
  const [weekIndex, setWeekIndex] = useState(() => {
    const todayOffset = differenceInCalendarDays(startOfDay(today), planStart);
    return isInPlan(startOfDay(today)) ? Math.floor(todayOffset / 7) : 0;
  });
  const windowStart = addDays(planStart, weekIndex * 7);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(windowStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [windowStart.getTime()]
  );

  const shiftWeek = (dir: -1 | 1) =>
    setWeekIndex((i) => Math.min(totalWeeks - 1, Math.max(0, i + dir)));
  const shiftWeekRef = useRef(shiftWeek);
  shiftWeekRef.current = shiftWeek;

  // ---------------------------------------------------------------------------
  // Drag & drop (Pointer Events — works for mouse and touch)
  // ---------------------------------------------------------------------------
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const suppressClickRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<{ dir: -1 | 1; timer: number } | null>(null);
  const onMoveMealRef = useRef(onMoveMeal);
  onMoveMealRef.current = onMoveMeal;

  const findDropTarget = (x: number, y: number): DropTarget | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>('[data-drop-cell]');
    if (!cell || cell.dataset.inRange !== 'true') return null;
    return { dateKey: cell.dataset.date!, mealType: cell.dataset.mealType as MealType };
  };

  const autoScroll = (x: number, y: number) => {
    const container = scrollRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (x < rect.left + EDGE_SCROLL_ZONE) container.scrollLeft -= EDGE_SCROLL_SPEED;
      else if (x > rect.right - EDGE_SCROLL_ZONE) container.scrollLeft += EDGE_SCROLL_SPEED;
    }
    if (y < EDGE_SCROLL_ZONE) window.scrollBy(0, -EDGE_SCROLL_SPEED);
    else if (y > window.innerHeight - EDGE_SCROLL_ZONE) window.scrollBy(0, EDGE_SCROLL_SPEED);
  };

  const stopWeekFlip = () => {
    if (flipRef.current) window.clearTimeout(flipRef.current.timer);
    flipRef.current = null;
  };

  // While dragging over a [data-week-flip] arrow, flip weeks repeatedly until the pointer leaves
  const updateWeekFlip = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const arrow = el?.closest<HTMLElement>('[data-week-flip]');
    const dir = arrow ? (Number(arrow.dataset.weekFlip) as -1 | 1) : null;
    if (dir === (flipRef.current?.dir ?? null)) return;
    stopWeekFlip();
    if (!dir) return;
    const tick = () => {
      shiftWeekRef.current(dir);
      flipRef.current = { dir, timer: window.setTimeout(tick, WEEK_FLIP_DELAY_MS) };
    };
    flipRef.current = { dir, timer: window.setTimeout(tick, WEEK_FLIP_DELAY_MS) };
  };

  const beginDrag = (pending: PendingDrag, x: number, y: number) => {
    const rect = pending.el.getBoundingClientRect();
    const next: DragState = {
      meal: pending.meal,
      x,
      y,
      offsetX: pending.startX - rect.left,
      offsetY: pending.startY - rect.top,
      width: rect.width,
    };
    dragRef.current = next;
    setDrag(next);
    suppressClickRef.current = true;
    if (pending.pointerType !== 'mouse' && navigator.vibrate) navigator.vibrate(15);
  };

  const cleanup = useCallback(() => {
    const pending = pendingRef.current;
    if (pending?.timer) window.clearTimeout(pending.timer);
    stopWeekFlip();
    pendingRef.current = null;
    dragRef.current = null;
    dropTargetRef.current = null;
    setDrag(null);
    setDropTarget(null);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    window.removeEventListener('touchmove', blockTouchScroll);
    // Let the click that follows pointerup be swallowed, then re-enable clicks
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable handler identities so add/removeEventListener match
  const handlePointerMove = useRef((e: PointerEvent) => {
    const pending = pendingRef.current;
    if (!pending || e.pointerId !== pending.pointerId) return;
    const dx = e.clientX - pending.startX;
    const dy = e.clientY - pending.startY;

    if (!dragRef.current) {
      if (pending.pointerType === 'mouse') {
        if (Math.hypot(dx, dy) > MOUSE_DRAG_THRESHOLD) beginDrag(pending, e.clientX, e.clientY);
        else return;
      } else {
        // Touch: moving before the long-press fires means the user is scrolling
        if (Math.hypot(dx, dy) > TOUCH_MOVE_TOLERANCE) cleanupRef.current();
        return;
      }
    }

    const current = dragRef.current!;
    const next = { ...current, x: e.clientX, y: e.clientY };
    dragRef.current = next;
    setDrag(next);

    const target = findDropTarget(e.clientX, e.clientY);
    const prev = dropTargetRef.current;
    if (target?.dateKey !== prev?.dateKey || target?.mealType !== prev?.mealType) {
      dropTargetRef.current = target;
      setDropTarget(target);
    }
    autoScroll(e.clientX, e.clientY);
    updateWeekFlip(e.clientX, e.clientY);
  }).current;

  const handlePointerUp = useRef((e: PointerEvent) => {
    const pending = pendingRef.current;
    if (!pending || e.pointerId !== pending.pointerId) return;
    const current = dragRef.current;
    if (current) {
      const target = findDropTarget(e.clientX, e.clientY);
      if (target) {
        const fromKey = format(new Date(current.meal.date), 'yyyy-MM-dd');
        if (fromKey !== target.dateKey || current.meal.mealType !== target.mealType) {
          onMoveMealRef.current?.(current.meal.id, target.dateKey, target.mealType);
        }
      }
    }
    cleanupRef.current();
  }).current;

  const handlePointerCancel = useRef(() => cleanupRef.current()).current;

  // Prevent the page from scrolling while a touch drag is in progress
  const blockTouchScroll = useRef((e: TouchEvent) => {
    if (dragRef.current) e.preventDefault();
  }).current;

  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => () => cleanupRef.current(), []);

  const handleChipPointerDown = (e: ReactPointerEvent<HTMLElement>, meal: any) => {
    if (!onMoveMeal) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pendingRef.current) return;

    const pending: PendingDrag = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      meal,
      el: e.currentTarget,
    };
    pendingRef.current = pending;

    if (e.pointerType !== 'mouse') {
      pending.timer = window.setTimeout(() => {
        if (pendingRef.current === pending) beginDrag(pending, pending.startX, pending.startY);
      }, LONG_PRESS_MS);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('touchmove', blockTouchScroll, { passive: false });
  };

  // Swallow the click that a drag's pointerup would otherwise fire on the recipe link
  const handleChipClickCapture = (e: ReactMouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const renderChip = (meal: any) => {
    const isDragging = drag?.meal.id === meal.id;
    return (
      <div
        key={meal.id}
        onPointerDown={(e) => handleChipPointerDown(e, meal)}
        onClickCapture={handleChipClickCapture}
        onContextMenu={(e) => onMoveMeal && e.preventDefault()}
        className={`group flex items-start gap-1 rounded-md border border-border-default border-l-4 ${
          MEAL_TYPE_BORDERS[meal.mealType] || 'border-l-gray-400'
        } bg-surface px-1.5 py-1 shadow-sm select-none [-webkit-touch-callout:none] ${
          onMoveMeal ? 'cursor-grab active:cursor-grabbing' : ''
        } ${isDragging ? 'opacity-30' : 'hover:shadow-md'}`}
      >
        {onMoveMeal && (
          <GripVertical className="w-3 h-3 mt-0.5 shrink-0 text-text-muted opacity-50 group-hover:opacity-100" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/recipes/${meal.recipe?.id || meal.recipeId}?servings=${meal.servings}`}
            draggable={false}
            className="text-xs text-text-primary hover:text-accent leading-snug block break-words line-clamp-3"
            title={meal.recipe?.title}
          >
            {meal.recipe?.title || 'Unknown recipe'}
          </Link>
          <span className="text-[10px] text-text-muted">
            {meal.servings} serving{meal.servings > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          data-week-flip="-1"
          onClick={() => shiftWeek(-1)}
          disabled={weekIndex === 0}
          className={`p-2 rounded-lg ${drag && weekIndex > 0 ? 'bg-accent-light text-accent ring-2 ring-accent-ring' : ''} hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
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
          <p className="text-xs text-text-muted">Week {weekIndex + 1} of {totalWeeks}</p>
        </div>
        <button
          type="button"
          data-week-flip="1"
          onClick={() => shiftWeek(1)}
          disabled={weekIndex >= totalWeeks - 1}
          className={`p-2 rounded-lg ${drag && weekIndex < totalWeeks - 1 ? 'bg-accent-light text-accent ring-2 ring-accent-ring' : ''} hover:bg-hover-bg active:bg-border-default text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Next week"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {onMoveMeal && (
        <p className="text-xs text-text-muted mb-2">
          <span className="hidden md:inline">Drag</span>
          <span className="md:hidden">Press and hold</span> a dish to move it to another day or meal.
          {totalWeeks > 1 && ' Hold it over an arrow to switch weeks.'}
        </p>
      )}

      {/* Meal-type × day matrix — scrollable on mobile */}
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div
          className="grid gap-1 md:min-w-[820px]"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(96px, 1fr))' }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 bg-surface shadow-[4px_0_0_0_var(--color-surface)]" />
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, today);
            const hasMeals = (mealsByDate[dateKey] || []).length > 0;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => hasMeals && onDateClick?.(dateKey)}
                className={`text-center rounded-lg py-1.5 ${
                  isToday ? 'bg-accent-light' : ''
                } ${isInPlan(day) ? '' : 'opacity-40'} ${
                  hasMeals ? 'cursor-pointer hover:text-accent' : 'cursor-default'
                }`}
              >
                <div className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-text-muted'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}

          {/* One row per meal type */}
          {MEAL_TYPE_ORDER.map((mealType) => (
            <MealRow
              key={mealType}
              mealType={mealType}
              weekDays={weekDays}
              mealsByDate={mealsByDate}
              isInPlan={isInPlan}
              today={today}
              dropTarget={dropTarget}
              isDragging={!!drag}
              renderChip={renderChip}
              onAddMeal={onAddMeal}
            />
          ))}
        </div>
      </div>

      {/* Floating ghost that follows the pointer while dragging */}
      {drag && (
        <div
          className="fixed z-50 pointer-events-none rotate-2"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: drag.width,
          }}
        >
          <div
            className={`rounded-md border border-accent border-l-4 ${
              MEAL_TYPE_BORDERS[drag.meal.mealType] || 'border-l-gray-400'
            } bg-surface px-1.5 py-1 shadow-xl text-xs text-text-primary leading-snug`}
          >
            {drag.meal.recipe?.title}
          </div>
        </div>
      )}

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

interface MealRowProps {
  mealType: MealType;
  weekDays: Date[];
  mealsByDate: Record<string, any[]>;
  isInPlan: (day: Date) => boolean;
  today: Date;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  renderChip: (meal: any) => ReactNode;
  onAddMeal?: (dateKey: string, mealType: MealType) => void;
}

function MealRow({
  mealType,
  weekDays,
  mealsByDate,
  isInPlan,
  today,
  dropTarget,
  isDragging,
  renderChip,
  onAddMeal,
}: MealRowProps) {
  return (
    <>
      {/* Row label */}
      <div className="sticky left-0 z-10 bg-surface shadow-[4px_0_0_0_var(--color-surface)] flex items-start gap-1.5 pt-2 pr-1">
        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${MEAL_TYPE_COLORS[mealType]}`} />
        <span className="text-xs font-medium text-text-secondary capitalize">{mealType}</span>
      </div>

      {weekDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const inRange = isInPlan(day);
        const isToday = isSameDay(day, today);
        const cellMeals = (mealsByDate[dateKey] || []).filter((m) => m.mealType === mealType);
        const isTarget = dropTarget?.dateKey === dateKey && dropTarget?.mealType === mealType;

        return (
          <div
            key={dateKey}
            data-drop-cell
            data-date={dateKey}
            data-meal-type={mealType}
            data-in-range={inRange ? 'true' : 'false'}
            className={`group/cell relative rounded-lg border p-1 min-h-[64px] flex flex-col gap-1 transition-colors ${
              isTarget
                ? 'border-accent bg-accent-light ring-2 ring-accent-ring'
                : !inRange
                  ? 'border-border-default/50 bg-page-bg/50 opacity-40'
                  : isDragging
                    ? 'border-dashed border-border-strong bg-surface'
                    : isToday
                      ? 'border-accent/40 bg-accent-light/30'
                      : 'border-border-default bg-page-bg/40'
            }`}
          >
            {cellMeals.map(renderChip)}

            {inRange && onAddMeal && !isDragging && (
              <button
                type="button"
                onClick={() => onAddMeal(dateKey, mealType)}
                className={`flex items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-accent-light transition-opacity ${
                  cellMeals.length === 0
                    ? 'flex-1 min-h-[32px] opacity-40 hover:opacity-100'
                    : 'h-5 opacity-0 group-hover/cell:opacity-100 focus:opacity-100'
                }`}
                title={`Add ${mealType} on ${format(day, 'EEE MMM d')}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
