import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-400',
  lunch: 'bg-green-400',
  dinner: 'bg-blue-400',
  snack: 'bg-purple-400',
};

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

interface CalendarContextMenuProps {
  x: number;
  y: number;
  dateKey: string;
  mealTypes: string[];
  onSelect: (mealType: string | 'all') => void;
  onClose: () => void;
}

export default function CalendarContextMenu({
  x,
  y,
  mealTypes,
  onSelect,
  onClose,
}: CalendarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Viewport clamping — measure menu and flip if it overflows
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Flip left if overflows right
    if (x + rect.width > viewportW - 8) {
      adjustedX = Math.max(8, x - rect.width);
    }
    // Flip up if overflows bottom
    if (y + rect.height > viewportH - 8) {
      adjustedY = Math.max(8, y - rect.height);
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [x, y]);

  // Close on click/tap outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = (e as TouchEvent).touches
        ? document.elementFromPoint(
            (e as TouchEvent).touches[0].clientX,
            (e as TouchEvent).touches[0].clientY
          )
        : (e as MouseEvent).target as Node;
      if (menuRef.current && target && !menuRef.current.contains(target as Node)) {
        onClose();
      }
    };
    // Use setTimeout so the opening right-click/long-press doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Sort meal types in standard order
  const sortedTypes = [...mealTypes].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a) - MEAL_TYPE_ORDER.indexOf(b)
  );

  const showCopyAll = sortedTypes.length > 1;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{ left: position.x, top: position.y }}
    >
      {showCopyAll && (
        <>
          <button
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            onClick={() => onSelect('all')}
            onTouchEnd={(e) => { e.preventDefault(); onSelect('all'); }}
          >
            <Copy size={14} className="text-gray-500 shrink-0" />
            <span>Copy all meals</span>
          </button>
          <div className="border-t border-gray-100 mx-2" />
        </>
      )}
      {sortedTypes.map((type) => (
        <button
          key={type}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
          onClick={() => onSelect(type)}
          onTouchEnd={(e) => { e.preventDefault(); onSelect(type); }}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${MEAL_TYPE_COLORS[type] || 'bg-gray-400'}`} />
          <span>Copy {type}</span>
        </button>
      ))}
    </div>
  );
}
