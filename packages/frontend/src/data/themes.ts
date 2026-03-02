export type ThemeName = 'classic' | 'ocean' | 'forest' | 'sunset' | 'midnight';
export type CustomSlotId = 'custom-1' | 'custom-2' | 'custom-3';
export type AllThemeId = ThemeName | CustomSlotId;

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
  description: string;
  /** Preview swatches: [recipes, mealplans, shopping, cooking] hero colors */
  previewColors: [string, string, string, string];
  /** PWA <meta name="theme-color"> value */
  metaThemeColor: string;
}

/** The 6 key colors that fully define a custom theme */
export interface CustomThemeKeys {
  pageBg: string;
  accent: string;
  heroRecipes: string;
  heroMealplans: string;
  heroShopping: string;
  heroCooking: string;
}

/** A saved custom theme: name + 6 key colors */
export interface CustomThemeData {
  name: string;
  keys: CustomThemeKeys;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'The original look',
    previewColors: ['#ea580c', '#2563eb', '#9f1239', '#1f2937'],
    metaThemeColor: '#2563eb',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cool blues and teals',
    previewColors: ['#0d9488', '#0284c7', '#4338ca', '#334155'],
    metaThemeColor: '#0284c7',
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Earthy greens and ambers',
    previewColors: ['#b45309', '#047857', '#44403c', '#14532d'],
    metaThemeColor: '#047857',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm reds and ambers',
    previewColors: ['#d97706', '#e11d48', '#a21caf', '#1e293b'],
    metaThemeColor: '#e11d48',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Dark theme with vibrant accents',
    previewColors: ['#f97316', '#3b82f6', '#f43f5e', '#475569'],
    metaThemeColor: '#0f172a',
  },
];

/**
 * Maps each predefined theme to its 6 key colors.
 * Used by "Start from" feature in CustomThemeEditor.
 */
export const PREDEFINED_THEME_KEYS: Record<ThemeName, CustomThemeKeys> = {
  classic: {
    pageBg: '#f9fafb',
    accent: '#2563eb',
    heroRecipes: '#ea580c',
    heroMealplans: '#2563eb',
    heroShopping: '#9f1239',
    heroCooking: '#1f2937',
  },
  ocean: {
    pageBg: '#f0f9ff',
    accent: '#0891b2',
    heroRecipes: '#0d9488',
    heroMealplans: '#0284c7',
    heroShopping: '#4338ca',
    heroCooking: '#334155',
  },
  forest: {
    pageBg: '#fafaf9',
    accent: '#047857',
    heroRecipes: '#b45309',
    heroMealplans: '#047857',
    heroShopping: '#44403c',
    heroCooking: '#14532d',
  },
  sunset: {
    pageBg: '#fff7ed',
    accent: '#e11d48',
    heroRecipes: '#d97706',
    heroMealplans: '#e11d48',
    heroShopping: '#a21caf',
    heroCooking: '#1e293b',
  },
  midnight: {
    pageBg: '#0f172a',
    accent: '#38bdf8',
    heroRecipes: '#f97316',
    heroMealplans: '#3b82f6',
    heroShopping: '#f43f5e',
    heroCooking: '#475569',
  },
};

export const CUSTOM_SLOTS: CustomSlotId[] = ['custom-1', 'custom-2', 'custom-3'];

export const DEFAULT_THEME: ThemeName = 'classic';
export const THEME_STORAGE_KEY = 'mealplan_theme';
export const CUSTOM_THEMES_STORAGE_KEY = 'mealplan_custom_themes';

/** Load custom themes from localStorage */
export function loadCustomThemes(): Record<CustomSlotId, CustomThemeData | null> {
  const defaults: Record<CustomSlotId, CustomThemeData | null> = {
    'custom-1': null,
    'custom-2': null,
    'custom-3': null,
  };
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const slot of CUSTOM_SLOTS) {
        if (parsed[slot] && parsed[slot].name && parsed[slot].keys) {
          defaults[slot] = parsed[slot];
        }
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return defaults;
}

/** Save custom themes to localStorage */
export function saveCustomThemes(data: Record<CustomSlotId, CustomThemeData | null>): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

/** Check if a theme ID is a custom slot */
export function isCustomSlot(id: string): id is CustomSlotId {
  return CUSTOM_SLOTS.includes(id as CustomSlotId);
}
