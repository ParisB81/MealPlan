import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isCustomSlot,
  loadCustomThemes,
  saveCustomThemes,
  type AllThemeId,
  type CustomSlotId,
  type CustomThemeData,
} from '../data/themes';
import {
  deriveAllVariables,
  clearInlineThemeStyles,
  applyInlineThemeStyles,
} from '../utils/colorUtils';

interface ThemeContextType {
  theme: AllThemeId;
  setTheme: (theme: AllThemeId) => void;
  customThemes: Record<CustomSlotId, CustomThemeData | null>;
  /** Save (or delete) a custom theme. Pass activate=true to switch to it immediately. */
  updateCustomTheme: (slotId: CustomSlotId, data: CustomThemeData | null, activate?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Cache derived CSS variables to localStorage for FOUC prevention */
function cacheCustomVars(slotId: CustomSlotId, vars: Record<string, string>): void {
  try {
    localStorage.setItem(`mealplan_custom_vars_${slotId}`, JSON.stringify(vars));
  } catch {
    // localStorage unavailable
  }
}

/** Remove cached CSS variables for a custom slot */
function clearCachedCustomVars(slotId: CustomSlotId): void {
  try {
    localStorage.removeItem(`mealplan_custom_vars_${slotId}`);
  } catch {
    // localStorage unavailable
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AllThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        // Check if it's a predefined theme
        if (THEMES.some(t => t.id === saved)) return saved as AllThemeId;
        // Check if it's a custom slot
        if (isCustomSlot(saved)) return saved;
      }
    } catch {
      // localStorage may be unavailable
    }
    return DEFAULT_THEME;
  });

  const [customThemes, setCustomThemes] = useState<Record<CustomSlotId, CustomThemeData | null>>(
    () => loadCustomThemes()
  );

  // Apply theme whenever it changes
  useEffect(() => {
    // Set the data-theme attribute
    document.documentElement.dataset.theme = theme;

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable
    }

    if (isCustomSlot(theme)) {
      // Custom theme: inject inline CSS variables
      const customData = customThemes[theme];
      if (customData) {
        const vars = deriveAllVariables(customData.keys);
        applyInlineThemeStyles(vars);
        cacheCustomVars(theme, vars);

        // Update PWA meta theme-color with accent
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', customData.keys.accent);
      }
    } else {
      // Predefined theme: clear any inline overrides, let [data-theme] CSS take over
      clearInlineThemeStyles();

      // Update PWA meta theme-color
      const themeDef = THEMES.find(t => t.id === theme);
      if (themeDef) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', themeDef.metaThemeColor);
      }
    }
  }, [theme, customThemes]);

  const setTheme = useCallback((newTheme: AllThemeId) => {
    // Don't switch to an unconfigured custom slot
    if (isCustomSlot(newTheme) && !customThemes[newTheme]) return;
    setThemeState(newTheme);
  }, [customThemes]);

  const updateCustomTheme = useCallback((slotId: CustomSlotId, data: CustomThemeData | null, activate?: boolean) => {
    setCustomThemes(prev => {
      const next = { ...prev, [slotId]: data };
      saveCustomThemes(next);

      if (data) {
        // Pre-cache CSS variables for FOUC prevention
        const vars = deriveAllVariables(data.keys);
        cacheCustomVars(slotId, vars);
      } else {
        // Slot deleted — clear cache
        clearCachedCustomVars(slotId);
      }

      return next;
    });

    if (data && activate) {
      // Switch to this custom theme immediately (avoids stale closure in setTheme)
      setThemeState(slotId);
    } else if (data === null && theme === slotId) {
      // If we deleted the currently active theme, fall back to default
      setThemeState(DEFAULT_THEME);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customThemes, updateCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
