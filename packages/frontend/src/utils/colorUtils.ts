/**
 * Color Utility Module
 *
 * Converts 6 user-chosen key colors into all 55 CSS custom properties
 * needed by the theme system. Uses HSL color math for lightening,
 * darkening, and deriving related shades.
 */

import type { CustomThemeKeys } from '../data/themes';

// ────────────────────────────────────────────────
// Color space conversions
// ────────────────────────────────────────────────

/** Parse a hex string (#RGB or #RRGGBB) into [r, g, b] 0–255 */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Convert [r, g, b] 0–255 to hex string #rrggbb */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c)))
    .toString(16)
    .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert hex to HSL. Returns [h (0–360), s (0–100), l (0–100)]. */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Convert HSL to hex. h: 0–360, s: 0–100, l: 0–100. */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// ────────────────────────────────────────────────
// Luminance & dark detection
// ────────────────────────────────────────────────

/**
 * Relative luminance (0–1) per WCAG 2.0 formula.
 * Used to decide if a background is "dark" or "light".
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns true if the color is perceptually dark (luminance < 0.35). */
export function isDark(hex: string): boolean {
  return getLuminance(hex) < 0.35;
}

// ────────────────────────────────────────────────
// HSL manipulation helpers
// ────────────────────────────────────────────────

/** Increase lightness by `amount` percentage points (0–100). */
export function lighten(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + amount));
}

/** Decrease lightness by `amount` percentage points (0–100). */
export function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

/** Set absolute lightness (0–100), preserving hue and saturation. */
export function setLightness(hex: string, newL: number): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, newL)));
}

// ────────────────────────────────────────────────
// All 55 CSS variable names (in declaration order)
// ────────────────────────────────────────────────

export const ALL_CSS_VARIABLE_NAMES = [
  // Surface & Text (10)
  '--color-page-bg',
  '--color-surface',
  '--color-surface-alt',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-border',
  '--color-border-strong',
  '--color-hover-bg',
  '--color-shadow',

  // Accent (4)
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-light',
  '--color-accent-ring',

  // Hero Cards (8)
  '--color-hero-recipes',
  '--color-hero-recipes-border',
  '--color-hero-mealplans',
  '--color-hero-mealplans-border',
  '--color-hero-shopping',
  '--color-hero-shopping-border',
  '--color-hero-cooking',
  '--color-hero-cooking-border',

  // List Cards (8)
  '--color-card-recipes',
  '--color-card-recipes-border',
  '--color-card-mealplans',
  '--color-card-mealplans-border',
  '--color-card-shopping',
  '--color-card-shopping-border',
  '--color-card-cooking',
  '--color-card-cooking-border',

  // Detail (6)
  '--color-detail-mealplans',
  '--color-detail-mealplans-border',
  '--color-detail-cooking-from',
  '--color-detail-cooking-to',
  '--color-card-cooking-text',
  '--color-card-cooking-meta',

  // Buttons (15)
  '--color-btn-primary',
  '--color-btn-primary-hover',
  '--color-btn-secondary',
  '--color-btn-secondary-hover',
  '--color-btn-danger',
  '--color-btn-danger-hover',
  '--color-btn-success',
  '--color-btn-success-hover',
  '--color-btn-warning',
  '--color-btn-warning-hover',
  '--color-btn-ghost-border',
  '--color-btn-ghost-text',
  '--color-btn-ghost-hover',
  '--color-btn-link',
  '--color-btn-link-hover',

  // Semantic (4)
  '--color-progress',
  '--color-error-bg',
  '--color-error-border',
  '--color-error-text',
] as const;

// ────────────────────────────────────────────────
// Main derivation: 6 keys → 55 CSS variables
// ────────────────────────────────────────────────

/**
 * Derives all 55 CSS custom property values from the 6 key colors.
 *
 * Dark mode is automatically detected from pageBg luminance.
 * Surface/text/border tokens invert for dark backgrounds.
 * Semantic colors (danger, success, warning) stay fixed.
 */
export function deriveAllVariables(keys: CustomThemeKeys): Record<string, string> {
  const { pageBg, accent, heroRecipes, heroMealplans, heroShopping, heroCooking } = keys;
  const dark = isDark(pageBg);

  // — Surface & Text —
  const surface      = dark ? lighten(pageBg, 10) : '#ffffff';
  const surfaceAlt   = dark ? lighten(pageBg, 5) : pageBg;
  const textPrimary  = dark ? '#f9fafb' : '#111827';
  const textSecondary = dark ? '#d1d5db' : '#4b5563';
  const textMuted    = dark ? '#6b7280' : '#9ca3af';
  const border       = dark ? lighten(pageBg, 15) : darken(pageBg, 12);
  const borderStrong = dark ? lighten(pageBg, 20) : darken(pageBg, 18);
  const hoverBg      = dark ? lighten(pageBg, 8) : pageBg;
  const shadow       = dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';

  // — Accent —
  const accentHover = darken(accent, 10);
  const accentLight = dark ? setLightness(accent, 15) : setLightness(accent, 95);
  const accentRing  = lighten(accent, 5);

  // — Hero borders —
  const heroRecipesBorder   = darken(heroRecipes, 8);
  const heroMealplansBorder = darken(heroMealplans, 8);
  const heroShoppingBorder  = darken(heroShopping, 8);
  const heroCookingBorder   = darken(heroCooking, 8);

  // — List Card colors (lighter variants of hero colors) —
  const cardRecipes        = dark ? setLightness(heroRecipes, 20) : setLightness(heroRecipes, 85);
  const cardRecipesBorder  = dark ? setLightness(heroRecipes, 30) : setLightness(heroRecipes, 75);
  const cardMealplans      = dark ? setLightness(heroMealplans, 20) : setLightness(heroMealplans, 85);
  const cardMealplansBorder = dark ? setLightness(heroMealplans, 30) : setLightness(heroMealplans, 75);
  const cardShopping       = dark ? setLightness(heroShopping, 20) : setLightness(heroShopping, 85);
  const cardShoppingBorder = dark ? setLightness(heroShopping, 30) : setLightness(heroShopping, 75);
  const cardCooking        = dark ? setLightness(heroCooking, 20) : setLightness(heroCooking, 45);
  const cardCookingBorder  = dark ? setLightness(heroCooking, 30) : setLightness(heroCooking, 55);

  // — Detail —
  const detailMealplans       = dark ? setLightness(heroMealplans, 25) : setLightness(heroMealplans, 80);
  const detailMealplansBorder = dark ? setLightness(heroMealplans, 35) : setLightness(heroMealplans, 70);
  const detailCookingFrom     = dark ? darken(heroCooking, 5) : lighten(heroCooking, 5);
  const detailCookingTo       = dark ? lighten(heroCooking, 10) : darken(heroCooking, 5);
  const cardCookingText       = dark ? '#e5e7eb' : '#ffffff';
  const cardCookingMeta       = dark ? '#9ca3af' : '#e5e7eb';

  // — Buttons (secondary derives from pageBg; danger/success/warning are fixed) —
  const btnSecondary      = dark ? lighten(pageBg, 15) : '#4b5563';
  const btnSecondaryHover = dark ? lighten(pageBg, 20) : '#374151';

  return {
    // Surface & Text
    '--color-page-bg': pageBg,
    '--color-surface': surface,
    '--color-surface-alt': surfaceAlt,
    '--color-text-primary': textPrimary,
    '--color-text-secondary': textSecondary,
    '--color-text-muted': textMuted,
    '--color-border': border,
    '--color-border-strong': borderStrong,
    '--color-hover-bg': hoverBg,
    '--color-shadow': shadow,

    // Accent
    '--color-accent': accent,
    '--color-accent-hover': accentHover,
    '--color-accent-light': accentLight,
    '--color-accent-ring': accentRing,

    // Hero Cards
    '--color-hero-recipes': heroRecipes,
    '--color-hero-recipes-border': heroRecipesBorder,
    '--color-hero-mealplans': heroMealplans,
    '--color-hero-mealplans-border': heroMealplansBorder,
    '--color-hero-shopping': heroShopping,
    '--color-hero-shopping-border': heroShoppingBorder,
    '--color-hero-cooking': heroCooking,
    '--color-hero-cooking-border': heroCookingBorder,

    // List Cards
    '--color-card-recipes': cardRecipes,
    '--color-card-recipes-border': cardRecipesBorder,
    '--color-card-mealplans': cardMealplans,
    '--color-card-mealplans-border': cardMealplansBorder,
    '--color-card-shopping': cardShopping,
    '--color-card-shopping-border': cardShoppingBorder,
    '--color-card-cooking': cardCooking,
    '--color-card-cooking-border': cardCookingBorder,

    // Detail
    '--color-detail-mealplans': detailMealplans,
    '--color-detail-mealplans-border': detailMealplansBorder,
    '--color-detail-cooking-from': detailCookingFrom,
    '--color-detail-cooking-to': detailCookingTo,
    '--color-card-cooking-text': cardCookingText,
    '--color-card-cooking-meta': cardCookingMeta,

    // Buttons
    '--color-btn-primary': accent,
    '--color-btn-primary-hover': accentHover,
    '--color-btn-secondary': btnSecondary,
    '--color-btn-secondary-hover': btnSecondaryHover,
    '--color-btn-danger': '#dc2626',
    '--color-btn-danger-hover': '#b91c1c',
    '--color-btn-success': '#16a34a',
    '--color-btn-success-hover': '#15803d',
    '--color-btn-warning': '#ea580c',
    '--color-btn-warning-hover': '#c2410c',
    '--color-btn-ghost-border': borderStrong,
    '--color-btn-ghost-text': dark ? '#d1d5db' : '#374151',
    '--color-btn-ghost-hover': hoverBg,
    '--color-btn-link': accent,
    '--color-btn-link-hover': accentHover,

    // Semantic
    '--color-progress': accent,
    '--color-error-bg': dark ? '#450a0a' : '#fef2f2',
    '--color-error-border': dark ? '#7f1d1d' : '#fecaca',
    '--color-error-text': dark ? '#fca5a5' : '#dc2626',
  };
}

/**
 * Remove all 55 inline CSS custom properties from `<html>`.
 * Called when switching from a custom theme back to a predefined one.
 */
export function clearInlineThemeStyles(): void {
  const el = document.documentElement;
  for (const name of ALL_CSS_VARIABLE_NAMES) {
    el.style.removeProperty(name);
  }
}

/**
 * Apply all 55 CSS custom properties as inline styles on `<html>`.
 * Called when activating a custom theme.
 */
export function applyInlineThemeStyles(vars: Record<string, string>): void {
  const el = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}
