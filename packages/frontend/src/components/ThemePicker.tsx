import { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, CUSTOM_SLOTS, type CustomSlotId } from '../data/themes';

interface ThemePickerProps {
  /** Render inline for mobile drawer (no dropdown, no icon button) */
  inline?: boolean;
}

/** Default gray swatches for unconfigured custom slots */
const EMPTY_SWATCHES = ['#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db'];

/** Get display label for a custom slot */
function slotLabel(_slotId: CustomSlotId, index: number, name?: string): string {
  return name || `Custom ${index + 1}`;
}

export default function ThemePicker({ inline = false }: ThemePickerProps) {
  const { theme, setTheme, customThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Check if there are any configured custom themes
  const hasCustomThemes = CUSTOM_SLOTS.some(s => customThemes[s] !== null);

  // Build custom theme rows
  const customRows = CUSTOM_SLOTS.map((slotId, i) => {
    const data = customThemes[slotId];
    const isConfigured = data !== null;
    const label = slotLabel(slotId, i, data?.name);
    const swatches = isConfigured
      ? [data.keys.heroRecipes, data.keys.heroMealplans, data.keys.heroShopping, data.keys.heroCooking]
      : EMPTY_SWATCHES;
    return { slotId, label, swatches, isConfigured };
  });

  // Inline mode: render flat list (for mobile drawer)
  if (inline) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Theme</p>
        <div className="space-y-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                theme === t.id
                  ? 'bg-accent-light text-accent font-medium'
                  : 'text-text-secondary hover:bg-hover-bg'
              }`}
            >
              {/* Color swatches */}
              <div className="flex gap-0.5 flex-shrink-0">
                {t.previewColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.id && <Check className="w-4 h-4 flex-shrink-0" />}
            </button>
          ))}

          {/* Custom themes divider + rows */}
          {hasCustomThemes && (
            <>
              <div className="border-t border-border-default my-2" />
              {customRows.filter(r => r.isConfigured).map((row) => (
                <button
                  key={row.slotId}
                  onClick={() => setTheme(row.slotId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === row.slotId
                      ? 'bg-accent-light text-accent font-medium'
                      : 'text-text-secondary hover:bg-hover-bg'
                  }`}
                >
                  <div className="flex gap-0.5 flex-shrink-0">
                    {row.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="flex-1 text-left">{row.label}</span>
                  {theme === row.slotId && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop dropdown mode
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-hover-bg transition-colors"
        aria-label="Change theme"
        title="Change theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border-default rounded-lg shadow-lg z-50 py-1">
          <p className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Theme</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                theme === t.id
                  ? 'bg-accent-light text-accent font-medium'
                  : 'text-text-primary hover:bg-hover-bg'
              }`}
            >
              <div className="flex gap-0.5 flex-shrink-0">
                {t.previewColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.id && <Check className="w-4 h-4 flex-shrink-0" />}
            </button>
          ))}

          {/* Custom themes divider + rows */}
          {hasCustomThemes && (
            <>
              <div className="border-t border-border-default my-1" />
              {customRows.filter(r => r.isConfigured).map((row) => (
                <button
                  key={row.slotId}
                  onClick={() => {
                    setTheme(row.slotId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    theme === row.slotId
                      ? 'bg-accent-light text-accent font-medium'
                      : 'text-text-primary hover:bg-hover-bg'
                  }`}
                >
                  <div className="flex gap-0.5 flex-shrink-0">
                    {row.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="flex-1 text-left">{row.label}</span>
                  {theme === row.slotId && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
