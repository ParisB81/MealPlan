# MealPlan Design System

This document defines the visual language and design rules for the MealPlan application. These rules describe *how* colors and layouts are used across the app.

**Last Updated:** 2026-04-01

---

## 1. Core Principles

1. **Jewel Tones palette.** The app uses a fixed set of brand colors (emerald, amber, violet, rose, slate) that remain consistent across all themes. Themes control surface colors, text, and accents — but section identity colors are fixed.
2. **Vibrant landing page, neutral inner pages.** The home page uses full-gradient colored tiles for visual impact. Inner pages (list pages, detail pages) use neutral surfaces with section color applied sparingly through icon squares and action buttons.
3. **Role-based button coloring.** Every button's color communicates its *role*, not its section. See Section 4 below.
4. **Tags always show category colors.** Recipe tags use the Tag Manager's category color system everywhere they appear. Tags are never styled with a generic single color.
5. **AI = Purple.** All AI-powered features (AI Meal Plans, AI Recipe Generator, "Think of Something!") use violet/purple to create a unified AI brand identity that stands out from section colors.
6. **Colors flow through CSS custom properties** (`--color-*`) mapped to Tailwind utilities for inner pages. The home page tiles use hardcoded constants for theme-independent identity.

---

## 2. Section Color System

The app has **8 sections** grouped into 4 color families. Section colors are **fixed across all themes** (Jewel Tones palette):

### Color Families

| Family | Sections | Hue | Base Hex |
|--------|----------|-----|----------|
| **Plans** | Meal Plans, Shopping, Cooking | Emerald | `#047857` → `#065f46` → `#064e3b` |
| **Recipes** | Recipes, Collections | Amber | `#b45309` → `#92400e` |
| **Preferences** | Preferences | Rose | `#be185d` |
| **AI** | AI Meal Plan, AI Recipes | Violet | `#7c3aed` |

### CSS Variables

| Section | CSS Variable | Light Variant | Hex (light themes) |
|---------|-------------|---------------|---------------------|
| Recipes | `--color-sec-recipes` | `--color-sec-recipes-light` | `#b45309` |
| Collections | `--color-sec-collections` | `--color-sec-collections-light` | `#92400e` |
| Meal Plans | `--color-sec-mealplans` | `--color-sec-mealplans-light` | `#047857` |
| Shopping | `--color-sec-shopping` | `--color-sec-shopping-light` | `#065f46` |
| Cooking | `--color-sec-cooking` | `--color-sec-cooking-light` | `#064e3b` |
| Preferences | `--color-sec-prefs` | `--color-sec-prefs-light` | `#be185d` |
| AI Meal Plan | `--color-sec-ai` | `--color-sec-ai-light` | `#7c3aed` |
| AI Recipes | `--color-sec-ai-recipes` | `--color-sec-ai-recipes-light` | `#7c3aed` |

> **Midnight (dark theme):** Uses brighter variants for contrast on dark backgrounds (e.g., `#059669` emerald-600, `#d97706` amber-600, `#db2777` pink-600, `#a78bfa` violet-400).

### Design Guidance

- **Recipes & Collections** use the same amber hue family, with Collections slightly darker.
- **Meal Plans, Shopping, Cooking** use the same emerald hue family, progressively darker.
- **AI Meal Plan & AI Recipes** both use violet — they share the same purple brand identity.
- **Preferences** uses rose — visually distinct from all other sections.
- All section colors must have sufficient contrast against white text (WCAG AA on buttons).
- Light variants (`-light`) are very pale tints used for selected states, hover backgrounds, and subtle card tints.

---

## 3. Landing Page (HomePage)

### Tile Layout

The home page uses **vibrant gradient tiles** — each tile has a full-color gradient background with white text and icons. This is the only page that uses colored backgrounds for navigation elements.

#### Mobile (< md breakpoint)
- **2x2 grid**: Plan my Meals, Recipes & Collections, My Preferences, Think of Something!
- **Developer Tools strip**: Full-width below the grid, smaller and more subdued
- No greeting text, no duplicate logo bar (Navigation component handles the top chrome)

#### Desktop (md+ breakpoint)
- **5-column grid**: Plan my Meals, Recipes & Collections, Think of Something!, My Preferences, Developer Tools
- `hover:scale-[1.02]` micro-interaction on tile hover
- No greeting text (Navigation bar provides context)

### Tile Colors (Hardcoded Constants)

Tile colors are defined as a `TILE` constant in `HomePage.tsx` — **not** through CSS variables. This ensures tiles look identical regardless of the active theme.

| Tile | From | To | Notes |
|------|------|----|-------|
| Plan my Meals | `#047857` | `#059669` | Emerald |
| Recipes & Collections | `#b45309` | `#d97706` | Amber |
| Think of Something! | `#7c3aed` | `#a855f7` | Violet (AI) |
| My Preferences | `#be185d` | `#db2777` | Rose |
| Developer Tools | `#475569` | `#64748b` | Slate (subdued) |

### Tile Anatomy

Each tile consists of:
- Gradient background (`linear-gradient(155deg, from, to)`)
- Radial shimmer overlay (`rgba(255,255,255,0.12)`)
- `w-24 h-24 rounded-full bg-white/15 border border-white/25` icon circle with white Lucide icon
- White title text (`font-extrabold`)
- `text-white/70` subtitle text

---

## 4. Button Color Roles

Every button in the app follows one of these roles:

| Role | Color Token | When to Use | Examples |
|------|------------|-------------|----------|
| **Primary** | `btn-primary` (blue) | Main CTA — the single most important action on a page | "Create Meal Plan", "Save", "Add Recipes", "New Profile" |
| **Section** | `sec-{name}` | Cross-section navigation — buttons that interact with *another* section | "Add to Meal Plan" (sec-mealplans), "AI Generate" (sec-ai), "Shopping List" (sec-shopping) |
| **Secondary** | `btn-secondary` (dark grey) | Edit/modify actions | "Edit" buttons |
| **Success** | `btn-success` (vivid green) | Completion/positive state change | "Complete" (mark meal plan as completed) |
| **Danger** | `btn-danger` (red) | Destructive actions | "Delete", trash icons |
| **Ghost** | `btn-ghost-*` | Low-emphasis actions, toggle buttons | Filter toggles, icon-only actions |
| **Link** | `btn-link` | Text-style links that behave as buttons | Inline text actions |

### Section Button Implementation

Section-colored buttons are implemented as raw `<button>` elements with Tailwind utility classes:

```tsx
<button className="inline-flex items-center justify-center font-medium rounded-lg
  transition-colors px-4 py-2 text-sm bg-sec-mealplans text-white hover:opacity-90">
  <CalendarPlus className="w-4 h-4 mr-1" />
  Add to Meal Plan
</button>
```

---

## 5. Navigation

### Desktop Nav Bar (Navigation.tsx)

- Sticky top bar with 5 hub tabs: **Home**, Plans, Recipes, Preferences, Developer
- **Icon-only for inactive tabs** with native browser tooltip (`title` attribute)
- **Icon + label for the active tab** — highlights with `text-accent bg-accent-light`
- ThemePicker dropdown on the far right
- Visible on **all pages** including home

### Mobile Tab Bar (MobileTabBar.tsx)

- Fixed bottom bar with 5 tabs matching desktop
- **Tab hierarchy**: Home/Plans/Recipes use `w-6 h-6` icons (primary); Preferences/Developer use `w-5 h-5` icons (secondary)
- Developer tab uses `text-text-muted` when inactive + 60% opacity label
- Active indicator: small dot below label (`w-1 h-1 rounded-full bg-accent`)
- Safe area padding for notched phones

### Mobile Top Chrome (Navigation.tsx)

- Shows "MealPlan" logo text + ThemePicker on all pages
- HomePage does **not** duplicate this — it relies on Navigation.tsx

---

## 6. AI Feature Branding

All AI-powered features use **violet/purple** as their brand color to create visual consistency:

| Feature | CSS Token | Hardcoded Classes | Hex |
|---------|-----------|-------------------|-----|
| AI Meal Plan Wizard | `sec-ai` | — | `#7c3aed` |
| AI Recipe Generator | `sec-ai-recipes` | `bg-violet-*`, `text-violet-*` | `#7c3aed` |
| "Think of Something!" | — | Via `TILE.think` constant | `#7c3aed` → `#a855f7` |
| AI Generate buttons | `bg-sec-ai` / `bg-sec-ai-recipes` | — | `#7c3aed` |

The AI Recipe Generator wizard uses hardcoded Tailwind violet classes (`bg-violet-500`, `text-violet-600`, etc.) for step indicators, buttons, and status text — maintaining the purple AI identity throughout the creation flow.

---

## 7. Tag Category Colors

Tags **always** display their Tag Manager category color, determined by `getCategoryForTag()` from `tagDefinitions.ts`:

| Category | Badge Variant | Example Tags |
|----------|--------------|--------------|
| **Meal** | `blue` | Appetizers, Breakfast, Main Dishes, Soups |
| **Base** | `green` | Beef, Chicken, Fish, Pasta, Vegetables |
| **Duration** | `yellow` | Under 15 min, 15-30 min, 30-60 min |
| **Country** | `purple` | Greek, Italian, French, Mexican |
| **Store** | `orange` | Freezer-friendly, Make-ahead |
| **Method** | `red` | Baked, Grilled, Roasted, Slow-cooked |
| **Source** | `purple` | AI, Akis Petretzikis, Allrecipes |

> Badge variant colors are **hardcoded** in `Badge.tsx` and do not change per theme.

---

## 8. Card Backgrounds on List Pages

List pages use themed card backgrounds defined by `card-*` tokens:

| Token | Purpose |
|-------|---------|
| `card-recipes` / `card-recipes-border` | Recipe list cards (amber-tinted) |
| `card-mealplans` / `card-mealplans-border` | Meal plan list cards (emerald-tinted) |
| `card-shopping` / `card-shopping-border` | Shopping list cards (emerald-tinted) |
| `card-cooking` / `card-cooking-border` | Cooking plan cards (emerald-tinted) |

Card backgrounds are subtle tints of the section's Jewel Tone color — very pale in light themes, very dark in Midnight.

---

## 9. Semantic Color Tokens

| Token | Purpose |
|-------|---------|
| `page-bg` | Full-page background |
| `surface` | Card/container backgrounds |
| `surface-alt` | Alternate surface (table stripes) |
| `text-primary` | Main text |
| `text-secondary` | Supporting text |
| `text-muted` | De-emphasized text |
| `border-default` / `border-strong` | Borders |
| `hover-bg` | Hover state backgrounds |
| `accent` / `accent-hover` / `accent-light` / `accent-ring` | Primary accent (tabs, links, focus) |
| `progress` | Progress bars |
| `error-bg` / `error-border` / `error-text` | Error states |

---

## 10. Jewel Tones Reference (All Themes)

The Jewel Tones palette is **fixed across all themes**. Only surface/text/accent/button colors vary per theme.

### Section Colors (Light Themes)

| Section | Hex | Description |
|---------|-----|-------------|
| Recipes | `#b45309` | Amber-700 |
| Collections | `#92400e` | Amber-800 |
| Meal Plans | `#047857` | Emerald-700 |
| Shopping | `#065f46` | Emerald-800 |
| Cooking | `#064e3b` | Emerald-900 |
| Preferences | `#be185d` | Rose-700 |
| AI Meal Plan | `#7c3aed` | Violet-600 |
| AI Recipes | `#7c3aed` | Violet-600 |

### Section Colors (Midnight / Dark Theme)

| Section | Hex | Description |
|---------|-----|-------------|
| Recipes | `#d97706` | Amber-600 (brighter) |
| Collections | `#b45309` | Amber-700 |
| Meal Plans | `#059669` | Emerald-600 (brighter) |
| Shopping | `#047857` | Emerald-700 |
| Cooking | `#065f46` | Emerald-800 |
| Preferences | `#db2777` | Pink-600 (brighter) |
| AI Meal Plan | `#a78bfa` | Violet-400 (brighter) |
| AI Recipes | `#a78bfa` | Violet-400 (brighter) |

---

## 11. What Themes Control

Themes (Classic, Ocean, Forest, Sunset, Midnight) control:
- **Surface colors**: page background, card backgrounds, borders
- **Text colors**: primary, secondary, muted
- **Accent color**: active tabs, links, focus rings
- **Button colors**: primary, secondary, success, danger, warning, ghost, link

Themes do **not** control:
- Section identity colors (fixed Jewel Tones)
- Home page tile colors (hardcoded TILE constants)
- Tag badge colors (hardcoded in Badge.tsx)
- AI feature purple branding

---

## 12. Creating a New Theme

To create a new predefined theme:

1. **Add a `[data-theme="yourname"]` block** in `index.css` with surface, text, accent, and button variables.
2. **Copy the Jewel Tones section/hero/card blocks** from any existing theme (they're identical).
3. **Register the theme** in `themes.ts` with `pageBg`, `accent`, and the fixed hero/sec keys.
4. **Test all pages** — especially:
   - Home page tiles (should look identical to other themes)
   - Cooking plan cards (text must be readable)
   - Tag badges (fixed colors — ensure readable on your surface color)
   - Dark mode: if `page-bg` luminance < 0.35, text tokens must flip to light colors

---

## 13. File Reference

| File | What It Contains |
|------|-----------------|
| `packages/frontend/src/index.css` | CSS variables per theme (`[data-theme]` blocks) |
| `packages/frontend/tailwind.config.js` | Maps CSS variables to Tailwind utility classes |
| `packages/frontend/src/data/themes.ts` | Theme registry, custom slot helpers |
| `packages/frontend/src/data/tagDefinitions.ts` | Tag categories and badge color mapping |
| `packages/frontend/src/components/ui/Badge.tsx` | Hardcoded badge variant colors |
| `packages/frontend/src/components/ui/Button.tsx` | Button variants using CSS variable tokens |
| `packages/frontend/src/utils/colorUtils.ts` | HSL math for custom theme derivation |
| `packages/frontend/src/contexts/ThemeContext.tsx` | Theme provider, inline style injection |
| `packages/frontend/src/components/ThemePicker.tsx` | Theme selector UI |
| `packages/frontend/src/components/CustomThemeEditor.tsx` | Custom theme color picker |
| `packages/frontend/src/components/Navigation.tsx` | Desktop nav bar + mobile top chrome |
| `packages/frontend/src/components/MobileTabBar.tsx` | Mobile bottom tab bar |
| `packages/frontend/src/pages/HomePage.tsx` | Home page with TILE color constants |
| `packages/frontend/index.html` | FOUC prevention script |
| `DESIGN_SYSTEM.md` | This file |
