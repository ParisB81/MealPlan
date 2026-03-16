import { useState, useMemo, useCallback } from 'react';
import { Trash2, Check, RotateCcw, UtensilsCrossed, CalendarDays, ShoppingCart, ChefHat, Sparkles, Zap, Settings, FolderHeart } from 'lucide-react';
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

/** Color picker groups following the design system */
const COLOR_GROUPS: {
  title: string;
  description: string;
  keys: { key: keyof CustomThemeKeys; label: string }[];
}[] = [
  {
    title: 'Foundation',
    description: 'Page background and primary accent (buttons, links, active states)',
    keys: [
      { key: 'pageBg', label: 'Page Background' },
      { key: 'accent', label: 'Accent / Primary' },
    ],
  },
  {
    title: 'Recipe Sections',
    description: 'Recipes & Collections share a color family (Collections auto-darkens)',
    keys: [
      { key: 'heroRecipes', label: 'Recipes' },
    ],
  },
  {
    title: 'Planning Sections',
    description: 'Meal Plans, Shopping, and Cooking — use related hues for visual cohesion',
    keys: [
      { key: 'heroMealplans', label: 'Meal Plans' },
      { key: 'heroShopping', label: 'Shopping Lists' },
      { key: 'heroCooking', label: 'Cooking Plans' },
    ],
  },
  {
    title: 'AI & Preferences',
    description: 'Distinct colors for AI features and preference profiles',
    keys: [
      { key: 'secAi', label: 'AI Meal Planner' },
      { key: 'secAiRecipes', label: 'AI Recipes' },
      { key: 'secPrefs', label: 'Preferences' },
    ],
  },
];

/** Default keys when creating a new custom theme (Classic) */
const DEFAULT_KEYS: CustomThemeKeys = PREDEFINED_THEME_KEYS.classic;

/** Resolve optional fields with sensible defaults so pickers always have values */
function resolveKeys(keys: CustomThemeKeys): CustomThemeKeys {
  return {
    ...keys,
    secPrefs: keys.secPrefs || '#8b7db8',
    secAi: keys.secAi || '#7c3aed',
    secAiRecipes: keys.secAiRecipes || '#059669',
  };
}

export default function CustomThemeEditor() {
  const { theme, customThemes, updateCustomTheme } = useTheme();

  // Currently selected slot tab
  const [activeSlot, setActiveSlot] = useState<CustomSlotId>('custom-1');

  // Editing state for the active slot
  const existingData = customThemes[activeSlot];
  const [name, setName] = useState(existingData?.name || '');
  const [keys, setKeys] = useState<CustomThemeKeys>(resolveKeys(existingData?.keys || { ...DEFAULT_KEYS }));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // When switching tabs, load existing data or defaults
  const switchTab = useCallback((slotId: CustomSlotId) => {
    setActiveSlot(slotId);
    const data = customThemes[slotId];
    setName(data?.name || '');
    setKeys(resolveKeys(data?.keys || { ...DEFAULT_KEYS }));
    setHasUnsavedChanges(false);
  }, [customThemes]);

  // Update a single key color
  const updateKey = useCallback((key: keyof CustomThemeKeys, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // "Start from" a predefined theme
  const startFrom = useCallback((themeId: ThemeName) => {
    setKeys(resolveKeys({ ...PREDEFINED_THEME_KEYS[themeId] }));
    if (!name) setName(`My ${THEMES.find(t => t.id === themeId)?.label || 'Theme'}`);
    setHasUnsavedChanges(true);
  }, [name]);

  // Save & apply
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
    setKeys(resolveKeys({ ...DEFAULT_KEYS }));
    setHasUnsavedChanges(false);
  }, [activeSlot, updateCustomTheme]);

  // Reset to saved state
  const handleReset = useCallback(() => {
    const data = customThemes[activeSlot];
    setName(data?.name || '');
    setKeys(resolveKeys(data?.keys || { ...DEFAULT_KEYS }));
    setHasUnsavedChanges(false);
  }, [activeSlot, customThemes]);

  // Derive all CSS variables for the live preview
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

          {/* "Start from" preset buttons */}
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

          {/* Grouped color pickers */}
          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <label className="block text-sm font-medium text-text-primary mb-0.5">{group.title}</label>
              <p className="text-xs text-text-muted mb-2">{group.description}</p>
              <div className="space-y-2">
                {group.keys.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={keys[key] || '#888888'}
                      onChange={(e) => updateKey(key, e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border-default cursor-pointer p-0.5 bg-surface"
                      title={label}
                    />
                    <span className="text-sm text-text-primary flex-1 min-w-0">{label}</span>
                    <input
                      type="text"
                      value={keys[key] || '#888888'}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) updateKey(key, v);
                        else if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                          setKeys(prev => ({ ...prev, [key]: v }));
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs font-mono border border-border-default rounded bg-surface text-text-primary text-center"
                      placeholder="#000000"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} size="sm">
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
            <span className="text-sm font-semibold" style={{ color: previewVars['--color-text-primary'] }}>
              Live Preview
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
          <div className="p-4 space-y-4" style={{ backgroundColor: previewVars['--color-page-bg'] }}>

            {/* Landing page mockup: neutral cards with section icon squares */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: previewVars['--color-text-muted'] }}>
                Landing Page Cards
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Recipes', color: previewVars['--color-sec-recipes'], Icon: UtensilsCrossed },
                  { label: 'Collections', color: previewVars['--color-sec-collections'], Icon: FolderHeart },
                  { label: 'Meal Plans', color: previewVars['--color-sec-mealplans'], Icon: CalendarDays },
                  { label: 'Shopping', color: previewVars['--color-sec-shopping'], Icon: ShoppingCart },
                  { label: 'Cooking', color: previewVars['--color-sec-cooking'], Icon: ChefHat },
                  { label: 'Prefs', color: previewVars['--color-sec-prefs'], Icon: Settings },
                  { label: 'AI Plan', color: previewVars['--color-sec-ai'], Icon: Sparkles },
                  { label: 'AI Recipe', color: previewVars['--color-sec-ai-recipes'], Icon: Zap },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg p-2 border"
                    style={{
                      backgroundColor: previewVars['--color-surface'],
                      borderColor: previewVars['--color-border'],
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center mb-1"
                      style={{ backgroundColor: card.color }}
                    >
                      <card.Icon size={12} color="#ffffff" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-medium leading-tight" style={{ color: previewVars['--color-text-primary'] }}>
                      {card.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Button roles */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: previewVars['--color-text-muted'] }}>
                Button Roles
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ backgroundColor: previewVars['--color-btn-primary'] }}>
                  Primary
                </button>
                <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ backgroundColor: previewVars['--color-sec-mealplans'] }}>
                  Section
                </button>
                <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ backgroundColor: previewVars['--color-btn-secondary'] }}>
                  Edit
                </button>
                <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ backgroundColor: previewVars['--color-btn-success'] }}>
                  Complete
                </button>
                <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ backgroundColor: previewVars['--color-btn-danger'] }}>
                  Delete
                </button>
              </div>
            </div>

            {/* Section color buttons (cross-section actions) */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: previewVars['--color-text-muted'] }}>
                Section Action Buttons
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: 'Meal Plan', color: previewVars['--color-sec-mealplans'] },
                  { label: 'Collection', color: previewVars['--color-sec-collections'] },
                  { label: 'Shopping', color: previewVars['--color-sec-shopping'] },
                  { label: 'Cooking', color: previewVars['--color-sec-cooking'] },
                  { label: 'AI Generate', color: previewVars['--color-sec-ai'] },
                  { label: 'AI Recipe', color: previewVars['--color-sec-ai-recipes'] },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    className="px-2 py-0.5 rounded text-[9px] font-medium text-white"
                    style={{ backgroundColor: btn.color }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface card */}
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
