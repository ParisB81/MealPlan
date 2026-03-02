import { useState, useMemo, useCallback } from 'react';
import { Trash2, Check, RotateCcw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import {
  THEMES,
  CUSTOM_SLOTS,
  PREDEFINED_THEME_KEYS,
  type CustomSlotId,
  type CustomThemeKeys,
  type ThemeName,
} from '../data/themes';
import { deriveAllVariables, isDark } from '../utils/colorUtils';
import { Button } from './ui';

/** Labels for the 6 key color pickers */
const KEY_LABELS: { key: keyof CustomThemeKeys; label: string }[] = [
  { key: 'pageBg', label: 'Page Background' },
  { key: 'accent', label: 'Accent / Navigation' },
  { key: 'heroRecipes', label: 'Recipes' },
  { key: 'heroMealplans', label: 'Meal Plans' },
  { key: 'heroShopping', label: 'Shopping Lists' },
  { key: 'heroCooking', label: 'Cooking Plans' },
];

/** Default keys when creating a new custom theme (Classic) */
const DEFAULT_KEYS: CustomThemeKeys = PREDEFINED_THEME_KEYS.classic;

export default function CustomThemeEditor() {
  const { theme, customThemes, updateCustomTheme } = useTheme();

  // Currently selected slot tab
  const [activeSlot, setActiveSlot] = useState<CustomSlotId>('custom-1');

  // Editing state for the active slot
  const existingData = customThemes[activeSlot];
  const [name, setName] = useState(existingData?.name || '');
  const [keys, setKeys] = useState<CustomThemeKeys>(existingData?.keys || { ...DEFAULT_KEYS });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // When switching tabs, load existing data or defaults
  const switchTab = useCallback((slotId: CustomSlotId) => {
    setActiveSlot(slotId);
    const data = customThemes[slotId];
    setName(data?.name || '');
    setKeys(data?.keys || { ...DEFAULT_KEYS });
    setHasUnsavedChanges(false);
  }, [customThemes]);

  // Update a single key color
  const updateKey = useCallback((key: keyof CustomThemeKeys, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // "Start from" a predefined theme
  const startFrom = useCallback((themeId: ThemeName) => {
    setKeys({ ...PREDEFINED_THEME_KEYS[themeId] });
    if (!name) setName(`My ${THEMES.find(t => t.id === themeId)?.label || 'Theme'}`);
    setHasUnsavedChanges(true);
  }, [name]);

  // Save & apply — use activate=true to switch to this theme in the same React batch
  const handleSave = useCallback(() => {
    const themeName = name.trim() || `Custom ${CUSTOM_SLOTS.indexOf(activeSlot) + 1}`;
    updateCustomTheme(activeSlot, { name: themeName, keys }, true);
    setName(themeName);
    setHasUnsavedChanges(false);
  }, [activeSlot, name, keys, updateCustomTheme]);

  // Delete
  const handleDelete = useCallback(() => {
    updateCustomTheme(activeSlot, null);
    setName('');
    setKeys({ ...DEFAULT_KEYS });
    setHasUnsavedChanges(false);
  }, [activeSlot, updateCustomTheme]);

  // Reset to saved state
  const handleReset = useCallback(() => {
    const data = customThemes[activeSlot];
    setName(data?.name || '');
    setKeys(data?.keys || { ...DEFAULT_KEYS });
    setHasUnsavedChanges(false);
  }, [activeSlot, customThemes]);

  // Derive all 55 CSS variables for the live preview
  const previewVars = useMemo(() => deriveAllVariables(keys), [keys]);

  // Convert CSS variable map to React inline style object
  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(previewVars)) {
      style[k] = v;
    }
    return style;
  }, [previewVars]);

  const isPageDark = isDark(keys.pageBg);

  return (
    <div>
      {/* ── Slot tabs ── */}
      <div className="flex gap-2 mb-6">
        {CUSTOM_SLOTS.map((slotId, i) => {
          const data = customThemes[slotId];
          const label = data?.name || `Custom ${i + 1}`;
          const isActive = activeSlot === slotId;
          return (
            <button
              key={slotId}
              onClick={() => switchTab(slotId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : data
                    ? 'bg-hover-bg text-text-primary hover:bg-border-default'
                    : 'bg-hover-bg text-text-muted hover:bg-border-default'
              }`}
            >
              {label}
              {!data && !isActive && <span className="ml-1 text-xs opacity-60">(empty)</span>}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left: Editor controls ── */}
        <div className="space-y-5">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Theme Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setHasUnsavedChanges(true); }}
              placeholder={`Custom ${CUSTOM_SLOTS.indexOf(activeSlot) + 1}`}
              className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring"
            />
          </div>

          {/* "Start from" dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Start from preset</label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => startFrom(t.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:bg-hover-bg hover:border-accent transition-colors"
                >
                  <div className="flex gap-0.5">
                    {t.previewColors.slice(0, 2).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6 color pickers */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">Colors</label>
            {KEY_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={keys[key]}
                  onChange={(e) => updateKey(key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border-default cursor-pointer p-0.5 bg-surface"
                  title={label}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary">{label}</span>
                </div>
                <input
                  type="text"
                  value={keys[key]}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) updateKey(key, v);
                    else if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      // Allow typing but don't update color until valid
                      setKeys(prev => ({ ...prev, [key]: v }));
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="w-24 px-2 py-1 text-xs font-mono border border-border-default rounded bg-surface text-text-primary text-center"
                  placeholder="#000000"
                />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={handleSave}
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Apply & Save
            </Button>
            {hasUnsavedChanges && (
              <Button variant="ghost" onClick={handleReset} size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
            {existingData && (
              <Button variant="danger" onClick={handleDelete} size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>

          {/* Status indicator */}
          {theme === activeSlot && (
            <p className="text-xs text-accent font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Currently active
            </p>
          )}
        </div>

        {/* ── Right: Live preview ── */}
        <div
          className="rounded-xl border border-border-default overflow-hidden"
          style={previewStyle}
        >
          {/* Preview header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{
              backgroundColor: previewVars['--color-surface'],
              borderColor: previewVars['--color-border'],
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: previewVars['--color-text-primary'] }}
            >
              Preview
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: previewVars['--color-accent-light'],
                color: previewVars['--color-accent'],
              }}
            >
              {isPageDark ? 'Dark' : 'Light'}
            </span>
          </div>

          {/* Preview body */}
          <div
            className="p-4 space-y-3"
            style={{ backgroundColor: previewVars['--color-page-bg'] }}
          >
            {/* Hero card previews */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Recipes', bg: previewVars['--color-hero-recipes'], border: previewVars['--color-hero-recipes-border'] },
                { label: 'Meal Plans', bg: previewVars['--color-hero-mealplans'], border: previewVars['--color-hero-mealplans-border'] },
                { label: 'Shopping', bg: previewVars['--color-hero-shopping'], border: previewVars['--color-hero-shopping-border'] },
                { label: 'Cooking', bg: previewVars['--color-hero-cooking'], border: previewVars['--color-hero-cooking-border'] },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-lg p-3 text-center text-xs font-medium text-white border"
                  style={{
                    backgroundColor: card.bg,
                    borderColor: card.border,
                  }}
                >
                  {card.label}
                </div>
              ))}
            </div>

            {/* Surface card preview */}
            <div
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: previewVars['--color-surface'],
                borderColor: previewVars['--color-border'],
              }}
            >
              <p className="text-xs font-medium" style={{ color: previewVars['--color-text-primary'] }}>
                Surface card
              </p>
              <p className="text-xs mt-1" style={{ color: previewVars['--color-text-secondary'] }}>
                Secondary text on a surface
              </p>
              <p className="text-xs mt-0.5" style={{ color: previewVars['--color-text-muted'] }}>
                Muted text for less important info
              </p>
            </div>

            {/* List card previews */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Recipe card', bg: previewVars['--color-card-recipes'], border: previewVars['--color-card-recipes-border'] },
                { label: 'Plan card', bg: previewVars['--color-card-mealplans'], border: previewVars['--color-card-mealplans-border'] },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-lg p-2 text-xs border"
                  style={{
                    backgroundColor: card.bg,
                    borderColor: card.border,
                    color: previewVars['--color-text-primary'],
                  }}
                >
                  {card.label}
                </div>
              ))}
            </div>

            {/* Button previews */}
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: previewVars['--color-btn-primary'] }}
              >
                Primary
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: previewVars['--color-btn-secondary'] }}
              >
                Secondary
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: previewVars['--color-btn-danger'] }}
              >
                Danger
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  borderColor: previewVars['--color-btn-ghost-border'],
                  color: previewVars['--color-btn-ghost-text'],
                }}
              >
                Ghost
              </button>
            </div>

            {/* Accent link */}
            <p className="text-xs">
              <span style={{ color: previewVars['--color-text-muted'] }}>Link: </span>
              <span className="underline" style={{ color: previewVars['--color-accent'] }}>
                accent colored link
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
