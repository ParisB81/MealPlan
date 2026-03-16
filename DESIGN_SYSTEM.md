# MealPlan Design System

This document defines the visual language and design rules for the MealPlan application. These rules are **theme-agnostic** — they describe *how* colors are used, not *which* colors are used. Every theme (Classic, Ocean, Forest, etc.) must follow these rules while choosing its own palette.

**Last Updated:** 2026-03-16

---

## 1. Core Principles

1. **Neutral surfaces, colored accents.** Pages use neutral backgrounds (white/cream/dark slate). Color is used sparingly and intentionally — through small icon squares, section-colored buttons, and tag badges.
2. **Section identity via icon, not background.** Cards on the landing page and list pages use the same neutral surface color. Each section's identity is carried by a small colored icon square (`w-11 h-11 rounded-xl`) — never by painting the entire card.
3. **Role-based button coloring.** Every button's color communicates its *role*, not its section. See Section 4 below.
4. **Tags always show category colors.** Recipe tags use the Tag Manager's category color system everywhere they appear — on recipe cards, detail pages, forms, and modals. Tags are never styled with a generic single color.
5. **No hardcoded colors.** All colors flow through CSS custom properties (`--color-*`) mapped to Tailwind utilities. No raw Tailwind color classes (`bg-purple-600`, `text-emerald-500`) in page components.

---

## 2. Section Color System

The app has **8 sections**, each with a distinct identity color and a light tint variant. These are defined as CSS variables per theme:

| Section | CSS Variable | Light Variant | Usage |
|---------|-------------|---------------|-------|
| Recipes | `--color-sec-recipes` | `--color-sec-recipes-light` | Recipe-related actions and icons |
| Collections | `--color-sec-collections` | `--color-sec-collections-light` | Collection-related actions and icons |
| Meal Plans | `--color-sec-mealplans` | `--color-sec-mealplans-light` | Meal plan actions and icons |
| Shopping | `--color-sec-shopping` | `--color-sec-shopping-light` | Shopping list actions and icons |
| Cooking | `--color-sec-cooking` | `--color-sec-cooking-light` | Cooking plan actions and icons |
| Preferences | `--color-sec-prefs` | `--color-sec-prefs-light` | Preference profile UI elements |
| AI Meal Plan | `--color-sec-ai` | `--color-sec-ai-light` | AI meal plan wizard |
| AI Recipes | `--color-sec-ai-recipes` | `--color-sec-ai-recipes-light` | AI recipe generator |

### Tailwind Utilities

```
bg-sec-recipes       text-sec-recipes       bg-sec-recipes-light
bg-sec-collections   text-sec-collections   bg-sec-collections-light
bg-sec-mealplans     text-sec-mealplans     bg-sec-mealplans-light
bg-sec-shopping      text-sec-shopping      bg-sec-shopping-light
bg-sec-cooking       text-sec-cooking       bg-sec-cooking-light
bg-sec-prefs         text-sec-prefs         bg-sec-prefs-light
bg-sec-ai            text-sec-ai            bg-sec-ai-light
bg-sec-ai-recipes    text-sec-ai-recipes    bg-sec-ai-recipes-light
```

### Design Guidance for New Themes

When defining section colors for a new theme:
- **Recipes & Collections** should feel related (e.g., same hue family, Collections slightly darker).
- **Meal Plans, Shopping, Cooking** should feel related (e.g., same hue family, progressively darker).
- **AI & AI Recipes** should feel distinct from each other (different hue families).
- **Preferences** should feel neutral/supportive, not competing with the primary accent.
- All section colors must have sufficient contrast against white text (WCAG AA on buttons).
- Light variants (`-light`) are used for selected states, hover backgrounds on chips, and subtle tints. They should be very pale versions of the main color.

---

## 3. Landing Page (HomePage)

### Card Layout
- All cards use the default `<Card hoverable>` component — **same neutral background** for every card.
- No colored card backgrounds on the landing page.

### Section Icons
- Each card has a **colored icon square**: `w-11 h-11 rounded-xl bg-sec-{section}` containing a white Lucide icon.
- This is the *only* place where section color appears on the landing page card.

### Text
- Card titles use `text-text-primary` (always readable on neutral surface).
- Card descriptions use `text-text-secondary`.

### Card Grid
- **Primary row** (3 columns): Recipes, Collections, Meal Plans
- **Secondary row** (4 columns): Shopping Lists, Cooking Plans, Preferences, Ingredients
- **Tertiary row** (3 columns): AI Meal Planner, AI Recipe Creator, Developer Tools
- Developer Tools card uses a dashed border (`border-dashed`) to visually separate it.

---

## 4. Button Color Roles

Every button in the app follows one of these roles:

| Role | Color Token | When to Use | Examples |
|------|------------|-------------|----------|
| **Primary** | `btn-primary` (blue) | Main CTA — the single most important action on a page | "Create Meal Plan", "Save", "Add Recipes", "New Profile", "Add Ingredient" |
| **Section** | `sec-{name}` | Cross-section navigation — buttons that take you to or interact with *another* section | "Add to Meal Plan" (sec-mealplans), "AI Generate" on MealPlansPage (sec-ai), "Add to Collection" (sec-collections), "Shopping List" (sec-shopping), "Cooking Plan" (sec-cooking) |
| **Secondary** | `btn-secondary` (dark grey) | Edit/modify actions | "Edit" buttons |
| **Success** | `btn-success` (vivid green) | Completion/positive state change | "Complete" (mark meal plan as completed) |
| **Danger** | `btn-danger` (red) | Destructive actions | "Delete", trash icons |
| **Ghost** | `btn-ghost-*` | Low-emphasis actions, toggle buttons | Filter toggles, icon-only actions on cards |
| **Link** | `btn-link` | Text-style links that behave as buttons | Inline text actions |

### Section Button Implementation

Since the `<Button>` component's variant system uses CSS variables for predefined roles, section-colored buttons are implemented as raw `<button>` elements with utility classes:

```tsx
<button className="inline-flex items-center justify-center font-medium rounded-lg
  transition-colors px-4 py-2 text-sm bg-sec-mealplans text-white hover:opacity-90">
  <CalendarPlus className="w-4 h-4 mr-1" />
  Add to Meal Plan
</button>
```

Or by overriding the Button component with `!important` classes:

```tsx
<Button className="!bg-sec-cooking hover:!opacity-90 !text-white !border-transparent">
  Cooking Plan
</Button>
```

### Button Rules Per Page

| Page | Primary (blue) | Section colored | Secondary (grey) | Success (green) | Danger (red) |
|------|---------------|-----------------|-------------------|-----------------|--------------|
| **RecipesPage** | — | AI Generate (ai-recipes), Meal Plan/Collection/Shopping on cards | — | — | Bulk Delete |
| **RecipeDetailPage** | — | Meal Plan (mealplans), Collection (collections), Shopping (shopping) | Edit | — | Delete |
| **CollectionsPage** | New Collection | — | — | — | Delete |
| **CollectionDetailPage** | Add Recipes | Add to Meal Plan (mealplans) per recipe card | Edit | — | Delete |
| **MealPlansPage** | Create Meal Plan | AI Generate (ai) | — | Complete | Delete |
| **MealPlanDetailPage** | Add Recipe | Shopping List (shopping), Cooking Plan (cooking) | — | Mark Complete (per meal) | Delete |
| **ShoppingListsPage** | Create Shopping List | — | — | Complete | Delete |
| **ShoppingListPage** | Add Ingredient | Add from Recipe (recipes), Add from Meal Plan (mealplans) | — | — | — |
| **CookingPlansPage** | New Cooking Plan | — | — | — | Delete |
| **PreferencesPage** | New Profile | — | — | — | Delete |
| **PreferenceEditPage** | Save Profile | — | — | — | — |

---

## 5. Tag Category Colors

Tags **always** display their Tag Manager category color, determined by `getCategoryForTag()` from `tagDefinitions.ts`. This applies everywhere tags appear — recipe cards, detail pages, search results, forms, and modals.

| Category | Badge Variant | Hex (bg / text) | Example Tags |
|----------|--------------|-----------------|--------------|
| **Meal** | `blue` | `#e8eef5` / `#4a6080` | Appetizers, Breakfast, Main Dishes, Soups |
| **Base** | `green` | `#e6f0ea` / `#3d6648` | Beef, Chicken, Fish, Pasta, Vegetables |
| **Duration** | `yellow` | `#f5f0e0` / `#7a6530` | Under 15 min, 15-30 min, 30-60 min |
| **Country** | `purple` | `#f0ecf8` / `#6a4daa` | Greek, Italian, French, Mexican |
| **Store** | `orange` | `#fdf3ed` / `#a84e20` | Freezer-friendly, Make-ahead |
| **Method** | `red` | `#f5e8e8` / `#8b3a3a` | Baked, Grilled, Roasted, Slow-cooked |
| **Source** | `purple` | `#f0ecf8` / `#6a4daa` | AI, Akis Petretzikis, Allrecipes |

> **Note:** Badge variant colors are **hardcoded** in `Badge.tsx` and do not change per theme. This ensures tag readability is consistent regardless of the active theme.

### Implementation

```tsx
import { getCategoryForTag } from '../data/tagDefinitions';

// In render:
const cat = getCategoryForTag(tag);
<Badge variant={cat?.color || 'blue'} size="sm">{tag}</Badge>
```

---

## 6. Semantic Color Tokens

Beyond section and button colors, the theme defines semantic tokens for surfaces, text, and borders:

| Token | Purpose |
|-------|---------|
| `page-bg` | Full-page background |
| `surface` | Card/container backgrounds |
| `surface-alt` | Alternate surface (e.g., table stripes) |
| `text-primary` | Main text (headings, body) |
| `text-secondary` | Supporting text (descriptions) |
| `text-muted` | De-emphasized text (timestamps, counts) |
| `border-default` | Standard borders |
| `border-strong` | Emphasized borders |
| `hover-bg` | Hover state backgrounds |
| `accent` | Primary accent (active tabs, links, focus rings) |
| `accent-hover` | Accent hover state |
| `accent-light` | Accent tint (selected backgrounds) |
| `accent-ring` | Focus ring color |
| `progress` | Progress bars |
| `error-bg` / `error-border` / `error-text` | Error states |

---

## 7. Card Backgrounds on List Pages

List pages (MealPlansPage, ShoppingListsPage, CookingPlansPage) use themed card backgrounds defined by `card-*` tokens:

| Token | Purpose |
|-------|---------|
| `card-recipes` / `card-recipes-border` | Recipe list cards |
| `card-mealplans` / `card-mealplans-border` | Meal plan list cards |
| `card-shopping` / `card-shopping-border` | Shopping list cards |
| `card-cooking` / `card-cooking-border` | Cooking plan cards |
| `card-cooking-text` / `card-cooking-meta` | Text colors on cooking cards |

> **Important:** Card text tokens must have sufficient contrast against their card background. If a theme uses light card backgrounds, card text tokens must be dark (and vice versa).

---

## 8. Preference / AI Wizard UI Elements

The Preferences section and AI wizards use chip-style selectors (e.g., dietary restrictions, cuisines, cooking methods). These follow a consistent pattern:

- **Selected chip:** `bg-sec-prefs text-white` (or the relevant section color)
- **Unselected chip:** `border border-border-default hover:border-sec-prefs`
- **Selected chip with border variant:** `border-sec-prefs bg-sec-prefs-light`
- **Range sliders:** `accent-sec-prefs` (CSS accent-color property)

This pattern applies to all chip selectors in:
- `PreferenceEditPage` (standalone profiles)
- `StepPlanSetup` / `StepTasteDiet` (AI meal plan wizard)
- `StepRecipePreferences` (AI recipe generator wizard)
- Shared components in `components/ai-shared/`

---

## 9. Classic Theme Reference

The Classic theme is the default and serves as the reference implementation. Here are its key color choices and the rationale:

### Palette Philosophy
- **Warm neutrals** for surfaces (cream/stone tones, not cool grays)
- **Terracotta family** for Recipes/Collections (earthy, food-related)
- **Sage green family** for Meal Plans/Shopping/Cooking (planning, organization)
- **Purple** for AI features (technology, intelligence)
- **Light purple** for Preferences (supportive, not dominant)
- **Emerald** for AI Recipes (distinct from AI purple, fresh/creative)
- **Blue** for primary actions and accent (universal, trustworthy)

### Classic Section Colors

| Section | Hex | Description |
|---------|-----|-------------|
| Recipes | `#c2602a` | Terracotta |
| Collections | `#a04d22` | Darker terracotta |
| Meal Plans | `#4a7a6b` | Sage green |
| Shopping | `#3d6b5e` | Deeper sage |
| Cooking | `#2d5b4e` | Darkest sage |
| Preferences | `#8b7db8` | Light purple |
| AI Meal Plan | `#7c3aed` | Vivid purple |
| AI Recipes | `#059669` | Emerald |

### Classic Button Colors

| Role | Hex | Description |
|------|-----|-------------|
| Primary | `#2563eb` | Blue-600 |
| Secondary | `#57534e` | Stone-600 (dark grey) |
| Success | `#16a34a` | Green-600 (vivid) |
| Danger | `#dc2626` | Red-600 |
| Warning | `#d97706` | Amber-600 |
| Ghost | `#d6d0c8` border | Warm sand |
| Link | `#2563eb` | Same as primary |

### Classic Accent
- `#2563eb` (blue-600) — used for active navigation tabs, focus rings, and link text.

---

## 10. Creating a New Theme

To create a new predefined theme:

1. **Add a `[data-theme="yourname"]` block** in `packages/frontend/src/index.css` with all 55+ CSS variables.
2. **Follow the rules in this document** — section colors, button roles, card contrast, etc.
3. **Register the theme** in `packages/frontend/src/data/themes.ts`.
4. **Test all pages** — especially:
   - HomePage cards (icons should pop against neutral background)
   - Cooking plan cards (text must be readable)
   - Tag badges (these are fixed colors — ensure they're readable on your surface color)
   - Dark mode: if `page-bg` luminance < 0.35, text tokens must flip to light colors

### Checklist for Theme Authors

- [ ] All 8 section colors defined with `-light` variants
- [ ] Section colors have WCAG AA contrast against white text (for buttons)
- [ ] Button colors are distinct from each other (primary vs success vs danger)
- [ ] `accent` color matches `btn-primary` for visual consistency
- [ ] `card-cooking-text` and `card-cooking-meta` contrast against `card-cooking` background
- [ ] `progress` bar color is clearly visible on `surface` background
- [ ] Light variants are very pale (used for subtle backgrounds, not as button colors)
- [ ] Error tokens are clearly distinguishable from success tokens

---

## 11. File Reference

| File | What It Contains |
|------|-----------------|
| `packages/frontend/src/index.css` | All 55+ CSS variables per theme (`[data-theme]` blocks) |
| `packages/frontend/tailwind.config.js` | Maps CSS variables to Tailwind utility classes |
| `packages/frontend/src/data/themes.ts` | Theme registry, custom slot helpers, localStorage keys |
| `packages/frontend/src/data/tagDefinitions.ts` | Tag categories, `getCategoryForTag()`, badge color mapping |
| `packages/frontend/src/components/ui/Badge.tsx` | Hardcoded badge variant colors (theme-agnostic) |
| `packages/frontend/src/components/ui/Button.tsx` | Button variants using CSS variable tokens |
| `packages/frontend/src/utils/colorUtils.ts` | HSL math for custom theme derivation |
| `packages/frontend/src/contexts/ThemeContext.tsx` | Theme provider, inline style injection |
| `packages/frontend/src/components/ThemePicker.tsx` | Theme selector UI |
| `packages/frontend/src/components/CustomThemeEditor.tsx` | Custom theme color picker |
| `packages/frontend/index.html` | FOUC prevention script |
| `DESIGN_SYSTEM.md` | This file |
