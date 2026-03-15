# CLAUDE.md - MealPlan Project Guide

This file provides essential context for AI assistants (like Claude) working on the MealPlan project. Read this file first when picking up this project in a new session.

## Quick Start (New Session Checklist)

**IMPORTANT: At the start of every session, Claude MUST ensure both servers are running before doing anything else.** Check with `curl`, and start any server that isn't responding. The user expects the app to be accessible at http://localhost:5173 immediately.

1. **Check if servers are already running:**
   ```bash
   curl -s http://localhost:3000/api/health
   curl -s http://localhost:5173
   ```
2. **Ensure PostgreSQL is running (required before backend):**
   ```bash
   docker compose -f "C:\00 Paris\MealPlan\docker-compose.yml" up -d
   ```
3. **Start backend server (if not running):**
   ```bash
   cd "C:\00 Paris\MealPlan\packages\backend"
   "C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" src/server.ts
   ```
4. **Start frontend dev server (if not running):**
   ```bash
   cd "C:\00 Paris\MealPlan\packages\frontend"
   "C:\Program Files\nodejs\node.exe" "../../node_modules/vite/bin/vite.js"
   ```
5. **Verify both are running:**
   - Backend health check: `curl http://localhost:3000/api/health`
   - Frontend: open http://localhost:5173 in browser
   - Also accessible on LAN at http://192.168.1.73:5173 (Vite configured with `host: true`)
6. If database is empty (first run or after reset):
   ```bash
   cd "C:\00 Paris\MealPlan"
   npm run prisma:migrate
   cd packages/backend
   "C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" prisma/seed.ts
   ```

## Project Overview

MealPlan is a full-stack TypeScript web application for meal planning and cooking. It provides recipe management (including scraping recipes from URLs), weekly meal planning, shopping list generation with intelligent ingredient aggregation, and nutritional tracking. The app is deployed to Railway cloud and accessible as a PWA on Android phones.

**Tech Stack:**
- **Backend:** Express.js + TypeScript + PostgreSQL (Prisma ORM) + Cheerio (web scraping) + Puppeteer (headless browser for Cloudflare-protected sites: Akis, Argiro)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Query + React Hook Form + Lucide Icons + vite-plugin-pwa
- **Database:** PostgreSQL 16 (local via Docker, production on Railway Postgres addon)
- **Deployment:** Railway (single service — backend serves frontend static files in production)
- **Auth:** SHA-256 token-based password protection (set via `APP_PASSWORD` env var)
- **Mobile:** PWA with service worker, installable on Android home screen, mobile-first responsive UI
- **Monorepo:** npm workspaces structure
- **Key Libraries:** Zod (validation), Axios (HTTP client), date-fns (dates), react-hot-toast (notifications), xlsx (Excel generation), puppeteer (headless Chrome)

## Project Structure

```
C:\00 Paris\MealPlan/
├── packages/
│   ├── backend/                    # Express API server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── recipe.controller.ts
│   │   │   │   ├── recipeScraper.controller.ts
│   │   │   │   ├── mealPlan.controller.ts
│   │   │   │   ├── shoppingList.controller.ts
│   │   │   │   ├── cookingPlan.controller.ts
│   │   │   │   ├── ingredient.controller.ts
│   │   │   │   ├── collection.controller.ts   # Recipe collections CRUD
│   │   │   │   └── aiRecipe.controller.ts     # AI recipe generation endpoint
│   │   │   ├── services/
│   │   │   │   ├── recipe.service.ts
│   │   │   │   ├── recipeScraper.service.ts
│   │   │   │   ├── mealPlan.service.ts
│   │   │   │   ├── shoppingList.service.ts
│   │   │   │   ├── cookingPlan.service.ts
│   │   │   │   ├── collection.service.ts      # Recipe collection management
│   │   │   │   └── aiRecipe.service.ts        # AI recipe suggestion generation
│   │   │   ├── routes/
│   │   │   │   ├── recipes.ts
│   │   │   │   ├── scraper.ts
│   │   │   │   ├── mealPlans.ts
│   │   │   │   ├── shoppingLists.ts
│   │   │   │   ├── cookingPlans.ts
│   │   │   │   ├── ingredients.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── collections.ts             # Recipe collection routes
│   │   │   │   └── aiRecipes.ts               # AI recipe routes
│   │   │   ├── validators/
│   │   │   │   ├── recipe.validator.ts
│   │   │   │   ├── mealPlan.validator.ts
│   │   │   │   ├── cookingPlan.validator.ts
│   │   │   │   ├── collection.validator.ts    # Collection Zod schemas
│   │   │   │   └── aiRecipe.validator.ts      # AI recipe generation Zod schemas
│   │   │   ├── utils/
│   │   │   │   ├── autoTagger.ts        # Auto-tag assignment on recipe creation
│   │   │   │   ├── unitConversion.ts   # Unit conversion for shopping list aggregation
│   │   │   │   └── validUnits.ts       # Valid unit definitions
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts             # Password auth: login, check, requireAuth middleware
│   │   │   │   └── errorHandler.ts     # AppError class + global error handler
│   │   │   └── server.ts               # Express app entry point (serves frontend in production)
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Database schema (10 models, PostgreSQL provider)
│   │   │   ├── seed.ts                 # Seed data
│   │   │   └── migrations/
│   │   └── .env                        # DATABASE_URL, PORT, APP_PASSWORD
│   ├── frontend/                   # React application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/                 # Reusable UI component library
│   │   │   │   │   ├── Button.tsx      # Variants: primary/secondary/danger/success/warning/ghost/link
│   │   │   │   │   ├── Card.tsx        # Container with padding and shadow
│   │   │   │   │   ├── Input.tsx       # Text input with labels
│   │   │   │   │   ├── TextArea.tsx    # Multi-line text input
│   │   │   │   │   ├── Modal.tsx       # Dialog/modal container
│   │   │   │   │   ├── Badge.tsx       # Small label/tag component
│   │   │   │   │   ├── Select.tsx      # Dropdown selector
│   │   │   │   │   ├── Collapsible.tsx # Accordion section with smooth CSS grid animation
│   │   │   │   │   └── Alert.tsx       # Variants: info/success/error
│   │   │   │   ├── ai-shared/              # Shared components for AI meal plan + AI recipe wizards
│   │   │   │   │   ├── DietaryRestrictionsSelector.tsx
│   │   │   │   │   ├── AllergiesSelector.tsx
│   │   │   │   │   ├── CuisineSelector.tsx
│   │   │   │   │   ├── IngredientPreferencesFields.tsx
│   │   │   │   │   ├── CookingMethodSelector.tsx
│   │   │   │   │   ├── SeasonSelector.tsx         # Single-select season picker (Spring/Summer/Autumn/Winter)
│   │   │   │   │   └── CookingFreeDaysPicker.tsx  # Calendar-based cooking-free day picker
│   │   │   │   ├── ai-recipes/             # AI Recipe Generator step components
│   │   │   │   │   ├── StepConcept.tsx
│   │   │   │   │   ├── StepRecipePreferences.tsx
│   │   │   │   │   ├── StepReviewCreate.tsx
│   │   │   │   │   └── StepDone.tsx
│   │   │   │   ├── Navigation.tsx          # Responsive nav: desktop horizontal, mobile hamburger+drawer
│   │   │   │   ├── ThemePicker.tsx         # Theme selector: dropdown (desktop) + inline (mobile drawer)
│   │   │   │   ├── CustomThemeEditor.tsx   # 3-slot custom theme editor with color pickers + live preview
│   │   │   │   ├── RecipeSelector.tsx      # Recipe selection component
│   │   │   │   ├── RecipePicker.tsx        # Modal to search/select existing recipe
│   │   │   │   ├── MealPlanPicker.tsx      # Modal to select a meal plan
│   │   │   │   ├── MealPlanCalendar.tsx    # Interactive monthly calendar for meal plan dates
│   │   │   │   ├── AddRecipeModal.tsx      # Modal to add recipe to meal plan (supports defaultDate prop for per-day add)
│   │   │   │   ├── AddToMealPlanModal.tsx # Modal to add recipe to any meal plan (from RecipesPage/RecipeDetailPage)
│   │   │   │   ├── AddToCollectionModal.tsx # Toggle-on-check modal to add/remove recipe from collections
│   │   │   │   ├── IngredientAutocomplete.tsx  # Autocomplete for ingredient names
│   │   │   │   ├── UnitAutocomplete.tsx    # Autocomplete for measurement units
│   │   │   │   ├── TagAutocomplete.tsx        # Autocomplete for recipe tags (grouped by category, color-coded)
│   │   │   │   ├── ShoppingListBuilder.tsx # Multi-tab modal (meal plans/recipes/custom + split mode)
│   │   │   │   └── DietGoalCalculator.tsx # Mifflin-St Jeor TDEE calculator (frontend-only)
│   │   │   ├── data/
│   │   │   │   ├── tagDefinitions.ts       # 97 predefined tags in 6 categories
│   │   │   │   └── themes.ts              # 5 predefined themes + custom theme types/helpers
│   │   │   ├── pages/
│   │   │   │   ├── HomePage.tsx            # Landing page with quick links
│   │   │   │   ├── RecipesPage.tsx         # Browse/search recipes
│   │   │   │   ├── RecipeDetailPage.tsx    # View single recipe
│   │   │   │   ├── RecipeFormPage.tsx      # Create/edit recipe form
│   │   │   │   ├── UrlImportPage.tsx       # Scrape recipes from URLs
│   │   │   │   ├── MealPlansPage.tsx       # List meal plans
│   │   │   │   ├── MealPlanDetailPage.tsx  # View plan, add/edit/remove meals
│   │   │   │   ├── LoginPage.tsx            # Password login screen
│   │   │   │   ├── IngredientsPage.tsx     # Manage ingredient database
│   │   │   │   ├── ShoppingListsPage.tsx   # List all shopping lists
│   │   │   │   ├── ShoppingListPage.tsx    # View/edit shopping list with categories
│   │   │   │   ├── CookingPlansPage.tsx    # List saved cooking plans (active/deleted)
│   │   │   │   ├── CookingPlanPage.tsx     # Create new or view saved cooking plan
│   │   │   │   ├── DeveloperPage.tsx       # Developer tools hub
│   │   │   │   ├── AssetsLibraryPage.tsx   # UI component showcase
│   │   │   │   ├── TagManagerPage.tsx      # Drag-and-drop tag assignment for recipes
│   │   │   │   ├── IngredientRefinementPage.tsx # Documentation for ingredient cleanup
│   │   │   │   ├── AIMealPlanWizardPage.tsx    # AI meal plan wizard (5 steps)
│   │   │   │   ├── AIRecipeGeneratorPage.tsx   # AI recipe generator wizard (4 steps)
│   │   │   │   ├── CollectionsPage.tsx         # List/create recipe collections (active/deleted)
│   │   │   │   ├── CollectionDetailPage.tsx    # View collection with recipe grid, add/remove/edit
│   │   │   │   ├── PreferencesPage.tsx         # List saved preference profiles
│   │   │   │   └── PreferenceEditPage.tsx     # Create/edit preference profile (standalone form)
│   │   │   ├── contexts/
│   │   │   │   ├── AuthContext.tsx         # Auth provider: token storage, interceptors, login/logout
│   │   │   │   └── ThemeContext.tsx        # Theme provider: predefined + custom themes, inline CSS injection
│   │   │   ├── utils/
│   │   │   │   └── colorUtils.ts          # HSL color math: 6 key colors → 55 CSS variables derivation
│   │   │   ├── hooks/
│   │   │   │   ├── useRecipes.ts           # Recipe CRUD + bulk ops + soft delete/restore
│   │   │   │   ├── useMealPlans.ts         # Meal plan CRUD + meal management + nutrition
│   │   │   │   ├── useShoppingLists.ts     # Shopping list generation + item management
│   │   │   │   ├── useCookingPlans.ts     # Cooking plan CRUD + soft delete/restore
│   │   │   │   ├── useIngredients.ts       # Ingredient list/detail/recipes
│   │   │   │   ├── useCollections.ts      # Collection CRUD + recipe add/remove + memberships
│   │   │   │   └── useAIRecipes.ts         # AI recipe generation mutation
│   │   │   ├── services/
│   │   │   │   ├── api.ts                  # Axios instance + ApiError class (preserves backend response data)
│   │   │   │   ├── recipes.service.ts      # Recipe API methods
│   │   │   │   ├── mealPlans.service.ts    # Meal plan API methods
│   │   │   │   ├── shoppingLists.service.ts # Shopping list API methods
│   │   │   │   ├── cookingPlans.service.ts # Cooking plan API methods
│   │   │   │   ├── scraper.service.ts      # Recipe scraper API methods
│   │   │   │   ├── ingredients.service.ts  # Ingredient API methods
│   │   │   │   ├── collections.service.ts # Recipe collection API methods
│   │   │   │   └── aiRecipes.service.ts    # AI recipe generation API methods
│   │   │   ├── types/
│   │   │   │   ├── recipe.ts               # Recipe, Ingredient, Nutrition types
│   │   │   │   ├── mealPlan.ts             # MealPlan, MealPlanRecipe types
│   │   │   │   ├── shoppingList.ts         # ShoppingList, ShoppingListItem types
│   │   │   │   ├── cookingPlan.ts          # CookingPlan types
│   │   │   │   ├── mealPlanPreference.ts   # Preference profiles + AI generation types
│   │   │   │   ├── collection.ts           # RecipeCollection, CollectionMembership types
│   │   │   │   └── aiRecipe.ts             # AI recipe suggestion + queue entry types
│   │   │   ├── App.tsx                     # Router with auth wrapper, ScrollToTop
│   │   │   └── main.tsx                    # React Query setup, app entry
│   │   ├── public/
│   │   │   ├── icon-192.png               # PWA icon 192x192
│   │   │   ├── icon-512.png               # PWA icon 512x512
│   │   │   └── favicon.ico                # Browser tab icon
│   │   └── vite.config.ts                  # Vite + React + PWA + API proxy + LAN host
│   └── shared/                     # Shared types & utilities
│       └── src/types/
├── process-usda.ts                 # USDA SR Legacy CSV → ingredients Excel/JSON processor
├── scrape-ingredients.ts           # FooDB scraper + multi-source ingredient generator (legacy)
├── generate-ingredients-excel.ts   # Hardcoded ingredient data generator (legacy)
├── sr_legacy/                      # USDA FoodData Central SR Legacy CSV data (downloaded)
├── foundation_foods/               # USDA FoodData Central Foundation Foods CSV data (downloaded)
├── ingredients-import.xlsx         # Generated: 2,592 ingredients with nutrition (for review)
├── ingredients-import.json         # Generated: JSON for API bulk import
├── ingredients-full.json           # Generated: Full data with nutrition columns
├── scripts/
│   └── enrich-source-urls.ts       # Batch update recipes with source URLs from Excel
├── source-url-enrichment-report.json # Generated: Report from source URL enrichment
├── docker-compose.yml              # Local PostgreSQL for development
├── nixpacks.toml                   # Railway Nixpacks config: system Chromium + Puppeteer env vars
├── railway.toml                    # Railway deployment configuration
├── package.json                    # Root workspace config (includes production start/postinstall)
└── tsconfig.base.json              # Base TypeScript config
```

## Common Bash Commands

### Development

```bash
# Start both frontend and backend (from root)
npm run dev

# Start individually
npm run dev:backend    # Backend on http://localhost:3000
npm run dev:frontend   # Frontend on http://localhost:5173

# Using full path (when PATH not set in session - TYPICAL for Claude sessions)
cd "C:\00 Paris\MealPlan\packages\backend"
"C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" src/server.ts

cd "C:\00 Paris\MealPlan\packages\frontend"
"C:\Program Files\nodejs\node.exe" "../../node_modules/vite/bin/vite.js"
```

### Database (PostgreSQL + Prisma)

```bash
# Start local PostgreSQL (Docker required)
docker compose -f "C:\00 Paris\MealPlan\docker-compose.yml" up -d

# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Deploy migrations (production — used in start script)
cd packages/backend && npx prisma migrate deploy

# Run seed script
cd packages/backend
"C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" prisma/seed.ts

# Open Prisma Studio (GUI)
npm run prisma:studio
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# List recipes
curl http://localhost:3000/api/recipes

# List meal plans
curl http://localhost:3000/api/meal-plans

# List shopping lists
curl http://localhost:3000/api/shopping-lists

# List cooking plans
curl http://localhost:3000/api/cooking-plans

# Scrape a recipe
curl -X POST http://localhost:3000/api/scraper/recipe -H "Content-Type: application/json" -d "{\"url\":\"https://bigrecipe.com/...\"}"
```

### Ingredient Data Processing

```bash
# Process USDA SR Legacy data → generate ingredients Excel + JSON
cd "C:\00 Paris\MealPlan"
"C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" process-usda.ts

# Bulk import ingredients into database (requires backend running)
curl -X POST http://localhost:3000/api/ingredients/bulk-import -H "Content-Type: application/json" -d @ingredients-import.json
```

### Source URL Enrichment

```bash
# Enrich existing recipes with source URLs from an Excel file
# Excel file should have URLs in column A (one per row)
# Place Excel file at C:/Users/Kat/Desktop/recipe_urls.xlsx (or update path in script)
cd "C:\00 Paris\MealPlan"
"C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" scripts/enrich-source-urls.ts

# Report saved to source-url-enrichment-report.json
```

## Feature Summary

### 1. Recipe Management (Phase 1 - Complete)
- Full CRUD with soft delete + restore + permanent delete
- **Search:** Case-insensitive search across title, description, tags, and ingredient names (PostgreSQL `mode: 'insensitive'`)
- **Tag filtering:** Single tag via search bar, or multi-tag AND filter with comma-separated tags
- **Tag highlighting:** Matched tags shown with colored badges on recipe cards; `+N more` counter for remaining tags
- **Advanced filters:** Collapsible filter panel on RecipesPage with 6 client-side filters (Max Calories, Min Protein, Max Carbs, Max Fat, Max Total Time, Max Prep Time). Nutrition filters are per-serving; recipes without nutrition data are excluded when a nutrition filter is active. Time filters exclude recipes with no time data. Filter button shows active count badge; "Clear all filters" link; "Showing X of Y recipes" counter. All filtering is client-side via `useMemo` since `useRecipes` fetches all recipes. Responsive: 6 columns desktop, 3 tablet, 2 mobile.
- Pagination (backend caps `limit` at 100; frontend `useRecipes` hook auto-paginates to fetch ALL recipes)
- **Export Recipes:** Button on RecipesPage exports all active recipes (ID, Name, Tags) to Excel
- **Add to Meal Plan:** Button on each recipe card and RecipeDetailPage to add recipe to any active meal plan
- Ingredient quantity limited to 2 decimal places
- **Tabbed form interface:** 4-tab layout (Details, Ingredients, Instructions, Nutrition) with sticky tab bar, red error dot indicators on tabs with validation issues, auto-navigation to first error tab on submit failure. Mobile-responsive with shorter tab labels (Ingred., Steps, Nutri.). Uses `noValidate` on `<form>` since hidden `required` inputs would silently block submission. Tab state: `activeTab` + conditional rendering (`{activeTab === 'x' && (...)}`), form data preserved across tab switches.
- **Field-specific validation errors:**
  - Backend Zod errors preserved via `ApiError` class (keeps `response.data.errors` array)
  - Toast popup shows error count (e.g., "Validation error: 3 fields need fixing. See details below.")
  - Top-of-form alert lists all errors with human-readable paths (e.g., "Ingredient #1 → Unit: Invalid unit of measurement")
  - Individual ingredient rows highlighted with red ring/background; specific fields (name, quantity, unit) get red borders
  - Per-row error messages displayed below the affected ingredient
  - `formatErrorPath()` helper converts Zod paths like `ingredients.0.unit` to readable labels
  - `getTabForError()` maps error paths to their owning tab; `getTabsWithErrors()` returns `Set<RecipeFormTab>` for red dot indicators
- "Start from existing recipe" feature (copies recipe data into new form)
- **Prefill from URL import:** RecipeFormPage accepts `location.state.prefill` data from React Router navigation, pre-populating all form fields for review before saving; shows info banner "Imported from URL — review and edit before saving"
- **Tag autocomplete:** `TagAutocomplete` component on recipe form with grouped dropdown (6 categories: Meal, Base, Duration, Country, Store, Method), color-coded suggestions, keyboard navigation (Enter selects first match), and existing tag exclusion
- Bulk import/delete operations
- Ingredient deduplication (combines duplicates within a recipe, sums quantities if same unit)
- **Source URL tracking:** Scraped recipes store their original URL in `sourceUrl` field, displayed as "View Original Recipe" link on RecipeDetailPage

### 2. Recipe Scraper / URL Import (Complete)
- **Backend:** `RecipeScraperService` scrapes recipes from multiple sites
  - **Supported sites:** bigrecipe.com, allrecipes.com, akispetretzikis.com, argiro.gr
  - JSON-LD structured data extraction (primary method for bigrecipe/allrecipes)
  - HTML fallback parsing with Cheerio
  - Extracts: title, description, ingredients, instructions, nutrition, times, images
  - Parses fractions (e.g., "1/2" -> 0.5) and ISO 8601 durations (e.g., "PT30M" -> 30)
  - **URL limits** (enforced in backend + frontend to prevent server overload):
    - Maximum 25 URLs total per request
    - Maximum 1 URL from Akis/Argiro per request (uses async job system with Puppeteer)
  - 500ms delay between regular requests, 2s delay between Puppeteer requests
  - **Child process isolation:** Puppeteer scraping runs in separate Node.js process via `puppeteerWorker.ts`
    - Uses Windows `start /B /MIN` command to launch completely independent processes
    - 90-second timeout per child process
    - Parent polls for output file instead of waiting on process
  - Excel template generation from scraped data (using xlsx library)
  - **Sodium normalization:** All sodium values normalized to milligrams (mg) during scraping
    - `parseSodiumValue()`: Detects g vs mg via negative lookbehind regex (`(?<!m)g\b`), converts g→mg (×1000)
    - `parseSodiumValueForAkis()`: Akis API stores sodium in grams, always converts to mg (×1000)
  - **Can size extraction:** `formatIngredients()` detects `"1 (15 oz) can chickpeas"` pattern from JSON-LD and converts to `"15 oz chickpeas"` (multiplies can count × oz per can, strips ", drained/rinsed")
  - **Unit normalization pipeline:** Centralized `normalizeUnit()` method applied across all scraper paths
    - `UNIT_NORMALIZATION_MAP`: ~80 entries mapping long-form English (tablespoon→tbsp, teaspoon→tsp, pound→lb, ounce→oz, etc.), plurals (pounds→lb, cups→cup), and variants (gr→g, lt→l) to app-standard abbreviations
    - Handles parenthetical plurals from Akis EN: `tablespoon(s)` → "tbsp", `clove(s)` → "clove"
    - Strips "of ..." patterns: `clove(s) of garlic` → "clove"
    - Tries two-word unit matches before single-word: `fluid ounce` → "fl oz"
    - Falls back to first-word extraction: `level tablespoon` → "tbsp"
    - `GREEK_UNIT_MAP`: 75+ Greek-to-English mappings used by Akis and Argiro scrapers (γρ.→g, κ.σ.→tbsp, κ.γ.→tsp, φλ.→cup, σκελ.→clove, κλων.→sprig, πρέζες→pinch, etc.)
  - **Akis Petretzikis scraper** (akispetretzikis.com):
    - Two-tier strategy: API call first (`/api/v1/recipe/{id_or_slug}`), Puppeteer fallback on Cloudflare 403
    - Greek-to-English unit mapping via shared `GREEK_UNIT_MAP` + `normalizeUnit()`
    - Extracts from `__NEXT_DATA__` JSON or JSON-LD via headless Chromium
    - Auto-tags with "Akis Petretzikis", "Greek", and dietary info
    - Handles ingredient sections and method sections with HTML entity decoding
  - **Argiro Barbarigou scraper** (argiro.gr):
    - Puppeteer-only (no JSON-LD schema available on argiro.gr)
    - DOM-based extraction using CSS selectors (`h1.single_recipe__title`, `div.ingredients`, etc.)
    - Cloudflare challenge handling (8-second wait on detection)
    - Greek-to-English unit mapping via shared `GREEK_UNIT_MAP` + `normalizeUnit()`
    - Auto-tags with "Argiro Barbarigou", "Greek", plus page tags (normalized to Title Case)
    - ~15-25 seconds per URL (Puppeteer overhead)
- **Frontend:** `UrlImportPage` at `/recipes/import-urls`
  - Four source boxes: bigrecipe.com (blue), allrecipes.com (orange), akispetretzikis.com (emerald), argiro.gr (pink)
  - Upload Excel files containing URLs
  - Manual URL entry
  - Preview scraped results before importing
  - Download results as Excel with error reporting
  - **Review & Import flow (mandatory):** Each scraped recipe has a "Review & Import" button that navigates to `/recipes/new` with prefilled data via `location.state` — user reviews/edits all fields before saving. Bulk direct import was intentionally removed to prevent bad data from entering the database.
  - Async job system with polling for Akis URLs (prevents frontend from hanging)

### 3. Nutritional Information (Phase 2 - Complete)
- Per-recipe nutrition: calories, protein, carbs, fat, fiber, sugar, sodium (stored in mg)
- Per-serving calculations
- Meal plan nutrition aggregation (calories, protein, carbs, fat only)
- Display in recipe detail and meal plan views
- **Sodium convention:** All sodium values stored as milligrams (mg) — implicit unit, no explicit unit field in database. Scrapers auto-convert grams to mg during extraction.

### 4. Weekly Meal Planning (Phase 3 - Complete)
- Create/view/update/delete meal plans with date ranges
- Meal types: breakfast, lunch, dinner, snack
- Per-meal servings adjustment
- Meal completion tracking (checkbox)
- Notes per meal
- Status management: active / completed / deleted
- Nutrition summary across all meals in a plan
- Add/update/remove recipes via modal UI
- **Meal Plan Calendar** (`MealPlanCalendar` component):
  - Interactive monthly calendar on MealPlanDetailPage
  - Days with meals highlighted with blue circle + color-coded dots per meal type (amber=breakfast, green=lunch, blue=dinner, purple=snack)
  - Month navigation with left/right arrows, starts on plan's start month
  - Today's date shown with blue ring
  - Click a highlighted date to smooth-scroll to that day's meal card (with brief blue flash highlight)
  - Legend showing meal type color codes

### 5. Shopping List Generation (Phase 4 - Complete)
- **Generate from meal plans:** Aggregates all ingredients across all meals
- **Generate from recipes:** Select specific recipes to generate list
- **Custom shopping lists:** Create with custom ingredients
- **Intelligent ingredient aggregation:**
  - Uses unified unit conversion system (metric + imperial merged)
  - Weight units (g, kg, oz, lb) all aggregate into grams, displayed as g/kg
  - Volume units (ml, l, tsp, tbsp, cup, etc.) all aggregate into ml, displayed as ml/cl/dl/l
  - Converts back to display-friendly metric units (e.g., 600g + 15oz → 1.03kg)
- **Category grouping:** Items organized by ingredient category (produce, dairy, meat, pantry, etc.)
- **Check-off functionality:** Toggle items as purchased
- **Item management:** Add, remove, update quantity on items
- **Add from recipes (with conversion):** `POST /:id/add-from-recipes` endpoint runs recipes through `aggregateIngredients()` pipeline before adding to an existing list — ensures imperial→metric conversion and ingredient-specific overrides are applied (e.g., `1.5 lb` → `680.39 g`)
- **Status management:** active / completed / deleted with restore
- **Print-optimized layout:** Portrait mode with `@media print` styles — progress bar hidden, print-friendly checkboxes (□/☑ Unicode), tightened spacing, dotted leader lines connecting ingredient names to quantities, category cards with minimal padding
- **Split by shopping trips:** In the ShoppingListBuilder modal (Meal Plans tab), toggle between "One list" and "Split by shopping trips". Split mode shows frequency presets (every 2/3/4/7 days) + custom input. Computes date-range trips from selected meal plans' combined date range. Each trip generates a separate shopping list containing only ingredients for meals within that date range. Uses existing `aggregateIngredients()` pipeline per trip — no changes to aggregation logic. Backend: `POST /generate-split` with `{ mealPlanIds, trips: [{name, startDate, endDate}] }`.

### 6. Unit Conversion System
Located in `packages/backend/src/utils/unitConversion.ts`. Uses 7 unified measurement systems with metric output for shopping lists:

| System | Base Unit | Units | Display |
|--------|-----------|-------|---------|
| weight | g | mg, g, kg, oz, lb | g / kg (always metric) |
| volume | ml | ml, cl, dl, l, tsp, tbsp, fl oz, cup, pt, qt, gal | ml / l only (cl and dl intentionally removed — not practical) |
| count | piece | piece, clove, head, stalk, slice, leaf, sprig, bunch, fillet, etc. | original unit |
| small_quantity | pinch | pinch, dash, drop, smidgen, handful, scoop | original unit |
| package | pack | pack, can, jar, bottle, box, bag | original unit |
| size | medium | large, medium, small | original unit |
| unknown | - | Fallback for unmapped units | original unit |

**Key design:** Metric and imperial are merged into unified `weight` and `volume` systems. Imperial units convert to metric base units (oz→28.35g, lb→453.59g, cup→236.59ml, tbsp→14.79ml, tsp→4.93ml). Shopping lists always display in metric. Recipes retain their original units — conversion only happens during shopping list aggregation.

Key functions: `convertToBase()`, `convertFromBase()`, `canCombineUnits()`, `getAggregationKey()`, `applyIngredientOverride()`

**Ingredient-specific unit overrides:** After normal aggregation, `INGREDIENT_UNIT_OVERRIDES` (in `unitConversion.ts`) remaps certain ingredients to a practical shopping unit, applied via `applyIngredientOverride()` in `aggregateIngredients()`:
- **Produce → piece:** onion, carrot, bell pepper (+ red/green/yellow), zucchini, eggplant, cucumber
- **Garlic → clove:** 1 clove = 1 tsp = 4.93 ml; 1 head = 10 cloves
- **Dairy/fats → g:** butter (1 tbsp=14.2g), parmesan cheese (1 cup=100g), feta cheese (1 cup=150g)
- **Herbs → bunch:** parsley, cilantro, mint, dill, basil (1 bunch ≈ 1 cup = 236.59 ml)
- To add more overrides: extend `INGREDIENT_UNIT_OVERRIDES` in `unitConversion.ts`

### 7. Ingredient Management
- Master ingredient database with name (unique), category, tags
- Autocomplete component for ingredient selection in recipe forms
- Autocomplete component for unit selection
- Bulk import/delete with validation
- Protection against deleting ingredients used in recipes
- **Click-to-view recipes:** Click any ingredient name on IngredientsPage to open a modal showing all active recipes that use it, with quantity/unit, notes, servings, and tags; recipe titles link to RecipeDetailPage

### 8. Cooking Plans (Complete)
- **Persistable cooking schedules** with full CRUD + soft delete/restore/permanent delete
- **Create flow** (`/cooking-plan/new`):
  1. Select up to 4 active meal plans
  2. Pick cook days from the combined date range
  3. Generate schedule: each cook day shows recipes to prepare, covering meals until the next cook day
  4. Save with a name via modal dialog
- **View saved plans** (`/cooking-plans/:id`): Auto-loads saved meal plan IDs + cook days, auto-generates schedule in read-only mode
- **List page** (`/cooking-plans`): Active/deleted tabs with View, Delete, Restore, Permanent Delete actions
- **Schedule computation** is frontend-only (no backend schedule storage): stores `mealPlanIds` (comma-separated) and `cookDays` (comma-separated dates), computes schedule from live meal plan data
- **Per cook day card shows:** Recipe title (linked), meal type badge, date, servings, prep/cook times, total time summary
- **Backend:** `CookingPlan` model in Prisma, full REST API at `/api/cooking-plans`

### 9. Developer Tools (Complete)
- **Developer hub** (`/developer`): Accessible from HomePage via dashed-border card
- **Assets Library** (`/developer/assets`): Interactive showcase of all 8 UI components with live demos
  - Button (7 variants x 3 sizes + loading/disabled states)
  - Card (4 padding levels + hoverable)
  - Input, TextArea, Modal (4 sizes), Badge (7 colors x 2 sizes + removable), Select, Alert (4 variants + dismissible)
- **Tag Manager** (`/developer/tags`): Drag-and-drop interface for bulk tag assignment to recipes (see section 10)
- **Ingredient Refinement** (`/developer/ingredients`): Documentation page for ingredient data cleanup with AI prompt (see section 13)

### 10. Tag Manager (Complete)
- **Drag-and-drop tag assignment** for recipes at `/developer/tags` (developer tool)
- **Tag palette** with 80+ predefined tags organized in 6 color-coded categories:
  - **Meal** (blue): Appetizers, Breakfast, Desserts, Main Dishes, Salads, Soups, etc. (14 tags)
  - **Base** (green): Beef, Chicken, Fish, Vegetables, Pasta, Rice & Grains, etc. (26 tags)
  - **Duration** (yellow): Under 15 minutes, 15-30 minutes, 30-60 minutes, Over 60 minutes
  - **Country** (purple): Greek, Italian, French, Indian, Thai, Mexican, American, etc. (25 tags)
  - **Store** (orange): Freezer-friendly, Leftovers-friendly, Make-ahead, One-pot meals
  - **Method** (red): Baked, Fried, Grilled, Roasted, Slow-cooked, etc. (14 tags)
- **Tag definitions** in `packages/frontend/src/data/tagDefinitions.ts`:
  - `TAG_CATEGORIES`: Array of category objects with name, color variant, and tags
  - `getCategoryForTag(tag)`: Lookup helper returning category name and color
  - `ALL_TAGS`: Flat array of all tags for search/filtering
- **Recipe list** with search, scrollable container, drop zones with visual feedback
- **Native HTML5 drag-and-drop**: Drag tags from palette onto recipe rows
- **Duplicate prevention**: Info toast if tag already exists on recipe
- **Quick removal**: Click × on any tag badge to remove it
- **No backend changes needed**: Uses existing `PUT /api/recipes/:id` for tags-only updates

### 11. Ingredient Data Pipeline (Complete)
- **USDA FoodData Central integration** for populating the master ingredient database
- **Data source:** USDA SR Legacy (April 2018) — 7,793 foods, public domain (CC0 1.0)
  - Downloaded from: https://fdc.nal.usda.gov/download-datasets/
  - CSV files stored in `sr_legacy/` directory
- **Processing script:** `process-usda.ts` reads SR Legacy CSV files and generates import files
  - Filters to relevant food categories (dairy, spices, herbs, fats/oils, poultry, fruits, pork, vegetables, nuts, beef, seafood, legumes, lamb/game, grains)
  - Excludes processed/fast food/restaurant/baby food/snack categories
  - Deduplicates by cleaned name, preferring "raw" versions
  - Maps USDA categories to app categories (dairy, spices, herbs, pantry, meat, produce, nuts, seafood, pulses, grains)
  - Joins with nutrition data: Calories (kcal), Protein (g), Carbs (g), Fat (g), Fiber (g), Sugar (g), Sodium (mg) — all per 100g
- **Output:** 2,592 unique ingredients with 100% nutrition data coverage
  - `ingredients-import.xlsx` — Excel with "Ingredients" sheet + "About" sheet
  - `ingredients-import.json` — JSON for API bulk import (`{ ingredients: [{ name, category, tags }] }`)
  - `ingredients-full.json` — Full data including nutrition columns
- **Category breakdown:** Meat (1,098), Produce (464), Pulses (243), Dairy (241), Pantry (209), Grains (122), Seafood (117), Nuts (54), Spices (35), Herbs (9)
- **Bulk import command:** `curl -X POST http://localhost:3000/api/ingredients/bulk-import -H "Content-Type: application/json" -d @ingredients-import.json`
- **Run processor:** `cd "C:\00 Paris\MealPlan" && "C:\Program Files\nodejs\node.exe" "node_modules/tsx/dist/cli.mjs" process-usda.ts`
- **Legacy scripts** (kept for reference):
  - `generate-ingredients-excel.ts` — Hardcoded ingredient data from FooDB + Tasting Table + Simone Jones Tyner + My Eclectic Bites
  - `scrape-ingredients.ts` — FooDB web scraper with USDA API cross-reference (prototype)

### 12. UI Component Library
Located in `packages/frontend/src/components/ui/`:
- **Button** - 7 variants (primary, secondary, danger, success, warning, ghost, link), 3 sizes (sm, md, lg), loading state, fullWidth option
- **Card** - Container with padding and shadow
- **Input** - Text input with label support
- **TextArea** - Multi-line input with label
- **Modal** - Dialog overlay with close button
- **Badge** - Small label/tag display
- **Select** - Dropdown selector with options
- **Collapsible** - Accordion section with smooth CSS grid animation (`grid-template-rows: 0fr → 1fr`), supports controlled/uncontrolled modes, title + optional subtitle + chevron
- **Alert** - Notification banner (info, success, error)

### 13. Ingredient Refinement (Complete)
- **Documentation page** at `/developer/ingredients` with comprehensive cleanup guidelines
- **Scope:** Periodic maintenance to ensure ingredient data quality after recipe imports
- **7 refinement actions** performed in order:
  1. **Fix Invalid Units** - Map long-form units to abbreviations (tablespoon→tbsp, teaspoon→tsp)
  2. **Merge Plural Forms** - Consolidate "carrots"→"carrot", "eggs"→"egg", etc.
  3. **Remove Noise from Names** - Strip parenthetical notes, prep instructions, percentages, "homemade" prefix
  4. **Resolve Vague Names** - Context-specific fixes for "powder", "sauce", "oil", etc.
  5. **Translate Non-English** - Convert Greek (αλάτι→salt) and other languages to English
  6. **Merge Duplicates** - Combine "vegetable stock pot"→"vegetable stock", etc.
  7. **Verify Recipe Integrity** - Check for recipes with missing ingredients after cleanup
- **AI prompt included** for running refinement with Claude after new recipe imports
- **Technical notes:** Foreign key constraints require updating RecipeIngredient and ShoppingListItem before deleting ingredients
- **Scripts location:** `scripts/` directory contains reusable refinement scripts

### 14. Auto-Tagging on Recipe Import (Complete)
- **Location:** `packages/backend/src/utils/autoTagger.ts`
- **Triggered by:** `createRecipe()` in `recipe.service.ts` — applies to all creation paths (manual, bulk import, URL scraper direct import)
- **Additive only:** Never removes existing tags, only adds for missing categories
- **Source site tags:** Auto-adds source site tag (Akis Petretzikis, Allrecipes, Big Recipe, Argiro Barbarigou) based on `sourceUrl` field, with duplicate prevention
- **Category tag inference** (6 categories):
  - **Meal**: Maps informal tags (Dinner→Main Dishes, Soup→Soups, etc.) + title/description keyword matching + protein-based default to Main Dishes
  - **Base**: Ingredient name analysis for primary protein/carb (chicken, beef, pasta, lentils, etc.)
  - **Duration**: `prepTime + cookTime` → duration bucket (Under 15 min / 15–30 / 30–60 / Over 60). Skips if both are 0.
  - **Country**: Maps informal tags (Hawaiian→American, etc.) + title/description country keywords. Defaults to International.
  - **Store**: Conservative — only tags obvious cases (soups→Leftovers-friendly, meatballs→Freezer-friendly, dips→Make-ahead). Leaves untagged if unsure.
  - **Method**: Title/description keyword matching (grilled, baked, fried, roasted, etc.). Leaves untagged if unsure.

### 15. Theme System (Complete)
- **Architecture:** 55 CSS custom properties (`--color-*`) defined per `[data-theme]` selector in `index.css`, mapped to Tailwind utilities via `tailwind.config.js` `theme.extend.colors`
- **5 predefined themes:** Classic (warm gray/blue), Ocean (sky/cyan), Forest (green/emerald), Sunset (amber/rose), Midnight (dark slate/sky)
- **3 custom theme slots:** Users pick 6 key colors (pageBg, accent, heroRecipes, heroMealplans, heroShopping, heroCooking); all 55 CSS variables auto-derived via HSL color math in `colorUtils.ts`
- **Dark mode auto-detection:** `isDark(pageBg)` checks luminance < 0.35; dark backgrounds invert text to white, lighten surfaces/borders, adjust accent-light values
- **Custom theme injection:** Predefined themes use static `[data-theme="X"]` CSS selectors; custom themes inject all 55 variables as inline styles on `<html>` (highest specificity). Switching to predefined clears all inline styles so CSS selectors take effect.
- **ThemePicker component:** Desktop = dropdown from palette icon in nav bar; Mobile = inline list at bottom of hamburger drawer. Shows 5 presets + divider + configured custom themes with color swatches.
- **CustomThemeEditor component:** Located in Assets Library (`/developer/assets`). 3 tab buttons for slots, "Start from preset" buttons, 6 native `<input type="color">` pickers with hex sync, scoped live preview panel, Apply & Save / Reset / Delete buttons.
- **FOUC prevention:** Synchronous `<script>` in `<head>` (in `index.html`) reads theme from localStorage, sets `data-theme` attribute. For custom themes, also reads cached CSS variables from `mealplan_custom_vars_custom-N` and applies them before first paint.
- **Persistence:** Theme ID stored in `localStorage` key `mealplan_theme`; custom theme data (name + 6 keys) in `mealplan_custom_themes`; derived CSS variables cached in `mealplan_custom_vars_custom-N`
- **Key files:**
  - `packages/frontend/src/index.css` — 55 CSS variable declarations per theme (5 `[data-theme]` blocks)
  - `packages/frontend/tailwind.config.js` — Maps 55 CSS vars to Tailwind utility classes
  - `packages/frontend/src/data/themes.ts` — Theme definitions, custom slot types, localStorage helpers
  - `packages/frontend/src/contexts/ThemeContext.tsx` — `ThemeProvider`, `useTheme()` hook, inline CSS injection
  - `packages/frontend/src/utils/colorUtils.ts` — `deriveAllVariables()`, `applyInlineThemeStyles()`, `clearInlineThemeStyles()`
  - `packages/frontend/src/components/ThemePicker.tsx` — Dropdown/inline theme selector
  - `packages/frontend/src/components/CustomThemeEditor.tsx` — Color picker editor + live preview
  - `packages/frontend/index.html` — FOUC prevention inline script
- **All ~30 page/component files migrated** from hardcoded Tailwind colors to semantic theme tokens (e.g., `bg-white` → `bg-surface`, `text-gray-900` → `text-text-primary`, `bg-orange-600` → `bg-hero-recipes`)

### 16. AI-Powered Meal Plan Generation (Complete)
- **Multi-step wizard** at `/ai-meal-plan` with 5 steps: Plan Setup → Taste & Diet → Review Plan → Create Recipes → Confirm & Save
- **Anthropic Claude integration:** Uses `@anthropic-ai/sdk` with `claude-sonnet-4-20250514` model for plan generation, meal swapping, and recipe detail generation
- **Preference profiles** (`MealPlanPreference` model): Saved per-user profiles with dietary restrictions, allergies, cuisine preferences, cooking time limits (weekday/weekend), calorie/macro targets, recipe source mode (library-only or library+AI), meal variety (1-5 scale), cooking-free days, preferred cooking methods, seasonal preference (Spring/Summer/Autumn/Winter)
- **Step 1 — Plan Setup** (collapsible accordion sections): Profile management (load/save), plan dates with duration presets (1-28 days), meals & servings, recipe source, pinned meals, meal variety (1-5 slider), cooking-free days (calendar picker), cooking time limits (weekday/weekend), nutrition targets (calories + macro split)
- **Step 2 — Taste & Diet** (uses shared components): Dietary restrictions, allergies, cuisine preferences, ingredient likes/dislikes, preferred cooking methods + **Generate Plan** button
- **Cooking-free days:** Calendar-based picker replaces legacy `cookDaysPerWeek`; user selects specific dates when cooking is not possible. AI generates only quick/no-cook/leftover meals for those dates.
- **Preferred cooking methods:** Multi-select chips (Baked, Fried, Grilled, etc.) stored in `preferredMethods` field. AI favors recipes using selected methods.
- **Pinned meals:** Pre-assign specific library recipes to meal slots (e.g., "Greek Lentil Soup for lunch 3 times"). Passed as MANDATORY constraints in the AI prompt. Validated against plan capacity.
- **AI plan generation:** Sends preferences + existing recipe library + date range to Claude. Returns structured JSON with per-day meals, each referencing existing recipes or suggesting new ones. Includes estimated per-serving nutrition for all meals.
- **Post-generation validation:** Fixes hallucinated recipe IDs (converts to new suggestions); fuzzy-matches "new" recipes against library (normalized title comparison with stop-word stripping)
- **Meal swapping:** Request 3 alternatives for any meal slot. Alternatives include existing library recipes or new AI suggestions with estimated nutrition.
- **Recipe detail generation:** For AI-suggested dishes, generates full recipe (ingredients, instructions, nutrition, tags) using Claude. **Ingredient constraint:** All ingredient names must come from the existing ingredient database (~1,025 ingredients). **Auto-tagging:** "AI" tag automatically added to all AI-generated recipes.
- **Estimated nutrition:** AI provides per-serving calorie/protein/carbs/fat estimates for every meal. Two-tier display: stored recipe nutrition (exact) → AI estimates (shown in italic with `~` prefix).
- **Plan nutrition summary:** MealPlanDetailPage shows plan totals with daily averages + per-day breakdown table (date, calories, protein, carbs, fat). Nutrition values stored per-serving; `meal.servings` multiplier applied at display time.
- **Shared components:** 6 reusable selector components in `components/ai-shared/` shared between AI Meal Plan and AI Recipe Generator wizards
- **Rate limiting:** 10 requests per minute per user (in-memory, shared across AI endpoints, resets on server restart)
- **Key files:**
  - Backend: `aiMealPlan.service.ts` (3 AI endpoints), `mealPlanPreference.service.ts` (CRUD), `mealPlanPreference.validator.ts` (Zod schemas)
  - Frontend: `AIMealPlanWizardPage.tsx` (wizard state machine), `StepPlanSetup.tsx`, `StepTasteDiet.tsx`, `StepReviewPlan.tsx`, `StepCreateRecipes.tsx`, `StepConfirmation.tsx`
  - Shared: `components/ai-shared/` (DietaryRestrictionsSelector, AllergiesSelector, CuisineSelector, IngredientPreferencesFields, CookingMethodSelector, CookingFreeDaysPicker, SeasonSelector)
  - Types: `mealPlanPreference.ts` (GeneratedPlan, GeneratedMeal, PinnedMeal, SwapAlternative, etc.)

### 17. AI Recipe Generator (Complete)
- **Standalone recipe generation** at `/recipes/ai-generate` — creates recipes without a meal plan context
- **4-step wizard:** Concept → Preferences → Review & Create → Done
- **Step 1 — Concept:** Number of recipes (1-5 chip buttons), freetext concept summary, optional "alternative version of existing recipe" via RecipePicker
- **Step 2 — Preferences:** Load-only profile support (pre-fills from saved meal plan preference profiles but doesn't save back), meal type toggles, specific taste target, all shared selectors (dietary restrictions, allergies, cuisines, ingredient likes/dislikes, cooking methods), calorie range, time limits, other remarks + **Generate Recipes** button
- **Step 3 — Review & Create:** AI suggestions displayed as cards with estimated nutrition, cuisine tag, prep/cook times. Each has "Create Recipe" (generates full details via existing `POST /api/ai-meal-plan/recipe-details` → navigates to RecipeFormPage with prefill) or "Skip" options. Progress bar tracks completion.
- **Step 4 — Done:** Summary of created/skipped recipes with links to created recipe pages, "Generate More" and "Back to Recipes" buttons
- **Entry points:** "AI Generate" button on RecipesPage header + "AI Recipe Creator" card on HomePage
- **Emerald accent color** to visually distinguish from the AI Meal Planner (purple)
- **SessionStorage persistence:** Wizard state survives page refreshes; handles return from RecipeFormPage after recipe creation
- **Rate limiting:** Shares the same 10 req/min rate limiter as AI Meal Plan
- **Key files:**
  - Backend: `aiRecipe.service.ts`, `aiRecipe.controller.ts`, `aiRecipes.ts` (routes), `aiRecipe.validator.ts`
  - Frontend: `AIRecipeGeneratorPage.tsx` (wizard), `StepConcept.tsx`, `StepRecipePreferences.tsx`, `StepReviewCreate.tsx`, `StepDone.tsx`
  - Service: `aiRecipes.service.ts`, Hook: `useAIRecipes.ts`, Types: `aiRecipe.ts`

### 18. Recipe Collections (Complete)
- **User-organized recipe groups** — named collections (e.g., "Favorites", "Quick Weeknight Dinners") for easy recipe organization
- **Full CRUD** with soft delete/restore/permanent delete at `/collections` and `/collections/:id`
- **Collection list page** (`CollectionsPage`): Active/deleted tabs, card grid with name, description, recipe count, create modal
- **Collection detail page** (`CollectionDetailPage`): Recipe grid with tags/servings/times, add recipes via RecipePicker modal, remove with hover X button, "Add to Meal Plan" button on each recipe card (same pattern as RecipesPage), edit name/description modal
- **AddToCollectionModal:** Toggle-on-check pattern — checkboxes for each active collection with immediate add/remove mutations, inline "create new" section
- **Integration points:**
  - RecipesPage: "Collection" button on each recipe card + collection dropdown near search bar (navigates to `/collections/:id`)
  - RecipeDetailPage: "Collection" button in header + purple collection membership badges below tags (linked to collection pages)
  - Navigation: "Collections" link with FolderHeart icon after Recipes
  - HomePage: Collections card in primary grid with violet gradient (`from-violet-600 to-purple-600`)
- **Backend:** `RecipeCollection` + `RecipeCollectionItem` models (junction table with `@@unique([collectionId, recipeId])`), cascade deletes, ownership checks via userId
- **Key files:**
  - Backend: `collection.service.ts`, `collection.controller.ts`, `collections.ts` (routes), `collection.validator.ts`
  - Frontend: `CollectionsPage.tsx`, `CollectionDetailPage.tsx`, `AddToCollectionModal.tsx`
  - Service: `collections.service.ts`, Hook: `useCollections.ts`, Types: `collection.ts`

## API Endpoints (Complete)

### Recipes (`/api/recipes`)
- `GET /` - List (pagination, search, tags, status filter)
- `GET /:id` - Get single recipe with ingredients and nutrition
- `POST /` - Create recipe
- `PUT /:id` - Update recipe
- `DELETE /:id` - Soft delete (status -> "deleted")
- `POST /:id/restore` - Restore soft-deleted recipe
- `DELETE /:id/permanent` - Permanently delete from database
- `POST /bulk-import` - Import array of recipes
- `POST /bulk-delete` - Delete multiple recipes

### Scraper (`/api/scraper`)
- `POST /recipe` - Scrape single recipe from URL
- `POST /recipes` - Batch scrape multiple URLs (max 50)
- `POST /generate-template` - Generate Excel import template from scraped data

### Meal Plans (`/api/meal-plans`)
- `GET /` - List meal plans (with status filter)
- `GET /:id` - Get plan with all meals and recipes
- `POST /` - Create meal plan
- `PUT /:id` - Update meal plan
- `DELETE /:id` - Delete meal plan
- `PATCH /:id/status` - Update status (active/completed/deleted)
- `POST /:id/recipes` - Add recipe to meal plan
- `PUT /:id/recipes/:recipeId` - Update meal (date, mealType, servings, notes, completed)
- `DELETE /:id/recipes/:recipeId` - Remove meal from plan
- `GET /:id/nutrition` - Aggregated nutrition summary

### Shopping Lists (`/api/shopping-lists`)
- `GET /` - List all shopping lists (with status filter)
- `GET /:id` - Get shopping list with items grouped by category
- `POST /generate` - Generate from meal plan(s)
- `POST /generate-from-recipes` - Generate from recipe IDs
- `POST /generate-split` - Generate split shopping lists by date-range trips (body: `{ mealPlanIds, trips: [{name, startDate, endDate}] }`)
- `POST /custom` - Create custom shopping list
- `GET /meal-plan/:mealPlanId` - Get or auto-create for meal plan
- `PUT /:id` - Update shopping list name
- `POST /:id/complete` - Mark as completed
- `POST /:id/restore` - Restore to active
- `POST /:id/add-from-recipes` - Add ingredients from recipes with full unit conversion (body: `{ recipeIds: string[] }`)
- `POST /:id/items` - Add item (merges if same ingredient+unit)
- `POST /:id/items/:itemId/toggle` - Toggle item checked status
- `PUT /:id/items/:itemId` - Update item quantity
- `DELETE /:id/items/:itemId` - Remove item
- `DELETE /:id` - Soft delete
- `DELETE /:id/permanent` - Permanently delete

### Cooking Plans (`/api/cooking-plans`)
- `GET /` - List cooking plans (with status filter: `?status=active` or `?status=deleted`)
- `GET /:id` - Get cooking plan by ID (returns mealPlanIds and cookDays as arrays)
- `POST /` - Create cooking plan (body: `{ name, mealPlanIds: string[], cookDays: string[] }`)
- `PUT /:id` - Update cooking plan name
- `DELETE /:id` - Soft delete (status -> "deleted")
- `DELETE /:id/permanent` - Permanently delete from database
- `POST /:id/restore` - Restore soft-deleted cooking plan

### Collections (`/api/collections`)
- `GET /recipe/:recipeId/collections` - Get collections a recipe belongs to (must be before `/:id`)
- `GET /` - List collections (with `?status=active|deleted`)
- `GET /:id` - Get collection with full recipe data
- `POST /` - Create collection (body: `{ name, description? }`)
- `PUT /:id` - Update collection name/description
- `DELETE /:id` - Soft delete
- `DELETE /:id/permanent` - Permanently delete
- `POST /:id/restore` - Restore soft-deleted collection
- `POST /:id/recipes` - Add single recipe (body: `{ recipeId }`)
- `POST /:id/recipes/batch` - Add multiple recipes (body: `{ recipeIds }`)
- `DELETE /:id/recipes/:recipeId` - Remove recipe from collection

### Ingredients (`/api/ingredients`)
- `GET /` - List ingredients (with search, limit 100)
- `GET /:id` - Get ingredient by ID
- `GET /:id/recipes` - Get all active recipes using this ingredient (returns recipeId, recipeTitle, quantity, unit, notes, servings, tags)
- `PUT /:id` - Update ingredient name/category/tags
- `DELETE /:id` - Delete (validates not used in recipes)
- `POST /bulk-import` - Bulk import with duplicate checking
- `POST /bulk-delete` - Bulk delete with usage validation

### AI Meal Plan (`/api/ai-meal-plan`)
- `POST /generate` - Generate meal plan from preferences (body: `{ preferenceId, startDate, endDate, pinnedMeals? }`)
- `POST /swap` - Get 3 alternative meals for a slot (body: `{ preferenceId, date, mealType, currentRecipeTitle, existingPlanContext? }`)
- `POST /recipe-details` - Generate full recipe details for an AI-suggested dish (body: `{ title, description?, servings?, cuisineHint? }`)

### AI Recipes (`/api/ai-recipes`)
- `POST /generate` - Generate recipe suggestions (body: `{ count, concept, baseRecipeId?, mealTypes?, specificTaste?, ingredientLikes?, ingredientDislikes?, dietaryRestrictions?, allergies?, cuisinePreferences?, caloriesMin?, caloriesMax?, preferredMethods?, maxPrepTime?, maxCookTime?, otherRemarks? }`)

### Meal Plan Preferences (`/api/meal-plan-preferences`)
- `GET /` - List user's preference profiles
- `GET /:id` - Get single preference profile
- `POST /` - Create preference profile
- `PUT /:id` - Update preference profile
- `DELETE /:id` - Delete preference profile

### Auth (`/api/auth`)
- `POST /login` - Verify password, return token (body: `{ password }`)
- `GET /check` - Validate existing token (header: `Authorization: Bearer <token>`)

### Health (`/api/health`)
- `GET /` - Health check (no auth required)

## Frontend Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | HomePage | Landing page with quick links to all features |
| `/recipes` | RecipesPage | Browse, search, filter recipes |
| `/recipes/new` | RecipeFormPage | Create new recipe |
| `/recipes/import-urls` | UrlImportPage | Scrape recipes from URLs, review & import individually |
| `/recipes/:id` | RecipeDetailPage | View recipe details |
| `/recipes/:id/edit` | RecipeFormPage | Edit existing recipe |
| `/meal-plans` | MealPlansPage | List all meal plans |
| `/meal-plans/:id` | MealPlanDetailPage | View/manage meals in a plan |
| `/meal-plans/:mealPlanId/shopping` | ShoppingListPage | Shopping list for a meal plan |
| `/ingredients` | IngredientsPage | Manage master ingredient database, click ingredient to see recipes |
| `/shopping-lists` | ShoppingListsPage | List all shopping lists |
| `/shopping-lists/:id` | ShoppingListPage | View/edit specific shopping list |
| `/cooking-plans` | CookingPlansPage | List saved cooking plans (active/deleted tabs) |
| `/cooking-plan/new` | CookingPlanPage | Create new cooking plan |
| `/cooking-plans/:id` | CookingPlanPage | View saved cooking plan (read-only) |
| `/collections` | CollectionsPage | List/create recipe collections (active/deleted tabs) |
| `/collections/:id` | CollectionDetailPage | View collection with recipe grid, add/remove |
| `/ai-meal-plan` | AIMealPlanWizardPage | AI-powered meal plan generation wizard (5 steps) |
| `/recipes/ai-generate` | AIRecipeGeneratorPage | AI recipe generator wizard (4 steps) |
| `/preferences` | PreferencesPage | List saved preference profiles with edit/delete |
| `/preferences/new` | PreferenceEditPage | Create new preference profile |
| `/preferences/:id` | PreferenceEditPage | Edit existing preference profile |
| `/developer` | DeveloperPage | Developer tools hub |
| `/developer/assets` | AssetsLibraryPage | UI component showcase with live demos |
| `/developer/tags` | TagManagerPage | Drag-and-drop tag assignment for recipes |
| `/developer/ingredients` | IngredientRefinementPage | Documentation for ingredient data cleanup and AI prompt |

## Database Schema (13 Models)

| Model | Table | Key Fields | Notes |
|-------|-------|-----------|-------|
| User | users | id, email, name | Default dev user: `temp-user-1` |
| Recipe | recipes | title, servings, instructions (JSON string), tags (comma-separated), status, imageUrl, sourceUrl | Soft delete via status field. sourceUrl stores original recipe URL for scraped recipes. |
| Ingredient | ingredients | name (unique), category, tags | Master ingredient list |
| RecipeIngredient | recipe_ingredients | recipeId, ingredientId, quantity (Float), unit, notes | Unique constraint on (recipeId, ingredientId) |
| RecipeNutrition | recipe_nutrition | recipeId (unique), calories, protein, carbs, fat, fiber, sugar, sodium | All fields optional |
| MealPlan | meal_plans | name, startDate, endDate, status | Status: active/completed/deleted |
| MealPlanRecipe | meal_plan_recipes | mealPlanId, recipeId, date, mealType, servings, notes, completed | mealType: breakfast/lunch/dinner/snack |
| CookingPlan | cooking_plans | name, mealPlanIds (comma-separated), cookDays (comma-separated dates), status | Status: active/deleted. Schedule computed client-side. |
| ShoppingList | shopping_lists | name, mealPlanId (optional), status | Can be linked to meal plan or standalone |
| ShoppingListItem | shopping_list_items | shoppingListId, ingredientId, quantity, unit, checked | Checked = purchased |
| MealPlanPreference | meal_plan_preferences | userId, profileName, dietaryRestrictions, allergies, cuisinePreferences, caloriesMin/Max, proteinPercent, carbsPercent, fatPercent, recipeSource, mealVariety, durationWeeks, durationDays, repeatWeekly, includedMeals, maxPrepTimeWeekday/Weekend, maxCookTimeWeekday/Weekend, cookDaysPerWeek, quickMealMaxMinutes, defaultServings, cookingFreeDays, preferredMethods, season | AI meal plan preferences profile |
| RecipeCollection | recipe_collections | userId, name, description?, status | User-organized recipe groups |
| RecipeCollectionItem | recipe_collection_items | collectionId, recipeId, addedAt | Junction: recipes in a collection, @@unique([collectionId, recipeId]) |

### Database Notes (PostgreSQL)
- **Migrated from SQLite to PostgreSQL** in Feb 2026 for Railway cloud deployment
- **Local dev:** PostgreSQL 16 via Docker Compose (`docker-compose.yml` at project root)
- **Production:** Railway Postgres addon (internal URL via `DATABASE_URL` env var)
- `instructions` stored as JSON string, `tags` as comma-separated string (legacy from SQLite era)
- `mealPlanIds` and `cookDays` in CookingPlan also comma-separated strings
- **Quantities** - All limited to 2 decimal places (Float type, rounded in service layer)

### Default User
Hardcoded user ID: `temp-user-1`, email: `demo@mealplan.app`. Created by seed script.

## Code Conventions

### Backend
- **Controllers:** Validate input, call service, return `{ status: 'success', data: ... }`
- **Services:** Business logic, return data or throw errors
- **Validators:** Zod schemas for request validation
- **Error handling:** `AppError` class with HTTP status code, caught by global error handler
- **Soft deletes:** Status field (`active`/`deleted`) instead of removing rows
- **Note:** Ingredient controller uses Prisma directly (no separate service file); all other resources follow the controller → service pattern
- **Ingredient names** are normalized to lowercase on storage

### Frontend
- **React Query hooks** follow `use[Resource][Action]` pattern
- **API services** return unwrapped data (Axios response.data)
- **Error handling:** `ApiError` class in `api.ts` preserves backend `response.data` (including Zod field errors); hooks use `buildErrorToast()` to show summary toast for validation errors while form pages display field-level details inline
- **Page components** handle data fetching via hooks
- **Child components** are presentational, receive props
- **Forms** use react-hook-form with Zod resolvers
- **Notifications** via react-hot-toast
- **Icons** from lucide-react
- **Theme-aware form elements:** Raw `<input>`/`<select>`/`<textarea>` must include `text-text-primary bg-surface` for dark theme visibility. Prefer using the UI library components (`Input`, `Select`, `TextArea`) which already have this. If using raw elements (e.g., quick-add inline forms), always add these classes.

### File Naming
- **Backend:** camelCase (e.g., `recipe.service.ts`, `unitConversion.ts`)
- **Frontend components:** PascalCase (e.g., `RecipeCard.tsx`, `ShoppingListBuilder.tsx`)
- **Frontend hooks:** `use` prefix (e.g., `useRecipes.ts`)
- **Frontend types:** domain name (e.g., `recipe.ts`, `shoppingList.ts`)

## React Query Hooks Reference

### useRecipes.ts
`useRecipes()`, `useRecipe(id)`, `useCreateRecipe()`, `useUpdateRecipe()`, `useDeleteRecipe()`, `useRestoreRecipe()`, `usePermanentDeleteRecipe()`, `useBulkImportRecipes()`

### useMealPlans.ts
`useMealPlans()`, `useMealPlan(id)`, `useCreateMealPlan()`, `useUpdateMealPlan()`, `useDeleteMealPlan()`, `useAddRecipeToMealPlan()`, `useUpdateMealPlanRecipe()`, `useRemoveRecipeFromMealPlan()`, `useGetMealPlanNutrition()`, `useUpdateMealPlanStatus()`

### useShoppingLists.ts
`useShoppingLists()`, `useShoppingListById(id)`, `useShoppingList(mealPlanId)`, `useGenerateShoppingList()`, `useGenerateFromRecipes()`, `useCreateCustomShoppingList()`, `useGenerateSplitShoppingList()`, `useToggleShoppingListItem()`, `useUpdateShoppingListItem()`, `useAddItemToList()`, `useRemoveItemFromList()`, `useUpdateShoppingList()`, `useDeleteShoppingList()`, `usePermanentDeleteShoppingList()`, `useCompleteShoppingList()`, `useRestoreShoppingList()`

### useCookingPlans.ts
`useCookingPlans()`, `useCookingPlan(id)`, `useCreateCookingPlan()`, `useUpdateCookingPlan()`, `useDeleteCookingPlan()`, `usePermanentDeleteCookingPlan()`, `useRestoreCookingPlan()`

### useIngredients.ts
`useIngredients()`, `useIngredient(id)`, `useIngredientRecipes(ingredientId)`

### useCollections.ts
`useCollections(status?)`, `useCollection(id)`, `useCreateCollection()`, `useUpdateCollection()`, `useDeleteCollection()`, `usePermanentDeleteCollection()`, `useRestoreCollection()`, `useAddRecipeToCollection()`, `useRemoveRecipeFromCollection()`, `useCollectionsForRecipe(recipeId)`

### useAIRecipes.ts
`useGenerateRecipeSuggestions()`

## Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| @prisma/client | Database ORM |
| cheerio | HTML parsing for recipe scraping |
| puppeteer | Headless Chromium for Cloudflare-protected sites (akispetretzikis.com, argiro.gr) |
| express | Web framework |
| express-async-errors | Async error handling |
| cors | Cross-origin requests |
| helmet | Security headers |
| zod | Input validation |
| date-fns | Date utilities |
| @anthropic-ai/sdk | Claude AI API for meal plan generation |
| dotenv | Environment variables |

### Frontend
| Package | Purpose |
|---------|---------|
| react, react-dom | UI framework |
| react-router-dom | Client-side routing |
| @tanstack/react-query | Server state management and caching |
| react-hook-form | Form state management |
| @hookform/resolvers | Zod integration for forms |
| zod | Validation schemas |
| zustand | Client state management |
| axios | HTTP client |
| lucide-react | Icon library |
| clsx, class-variance-authority, tailwind-merge | CSS utility helpers |
| react-hot-toast | Toast notifications |
| date-fns | Date utilities |
| vite-plugin-pwa | PWA support (service worker, manifest generation) |

### Root
| Package | Purpose |
|---------|---------|
| xlsx | Excel file generation (for recipe scraper templates) |
| tsx | TypeScript execution |

## Development Environment

### Node.js
- **Version:** v24.12.0
- **npm:** v11.6.2
- **Location:** `C:\Program Files\nodejs`
- **Important:** PATH may not include Node.js in Claude sessions - use full paths

### CORS
Backend allows multiple frontend ports: 5173-5177 (for when Vite auto-increments ports), plus LAN IP `192.168.1.73:5173`

### React Query Defaults
- Stale time: 5 minutes
- Retry: 1
- No refetch on window focus

## Cloud Deployment (Railway)

### Architecture
Single Railway service: backend Express server serves the built frontend as static files in production. No separate frontend service needed.

- **Railway URL:** `https://mealplan-production-d4cc.up.railway.app`
- **GitHub repo:** `ParisB81/MealPlan` (auto-deploys on push to `master`)
- **Railway project:** "protective-vibrancy" with PostgreSQL addon

### How It Works in Production
1. `npm install` + `npm run build` builds both backend (TypeScript → JS) and frontend (Vite → `packages/frontend/dist/`)
2. `npm start` runs `prisma migrate deploy` then starts `packages/backend/dist/server.js`
3. Backend serves API routes at `/api/*`
4. Backend serves frontend static files from `packages/frontend/dist/`
5. SPA catch-all: any non-`/api` GET request returns `index.html`

### Key Files
- **`railway.toml`** — Build command, start command, healthcheck config (120s timeout)
- **`nixpacks.toml`** — System Chromium + apt dependencies for Puppeteer, env vars for skipping bundled download
- **`package.json` (root)** — `"start"` and `"postinstall"` scripts for Railway
- **`packages/backend/src/server.ts`** — Production static file serving + `0.0.0.0` bind; health endpoint registered BEFORE auth middleware
- **`packages/frontend/src/services/api.ts`** — API base URL defaults to `/api` (same-origin in production)

### Railway Environment Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (auto from Postgres addon) | Internal Railway Postgres URL |
| `NODE_ENV` | `production` | Enables static file serving |
| `PORT` | (auto-set by Railway) | Usually 3000 |
| `APP_PASSWORD` | User's chosen password | **Must be set manually** — protects all API endpoints |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required for AI Meal Plan generation (Claude API) |

### Deployment Workflow

**CRITICAL — Pre-push type check:** Always run `npx tsc --noEmit` in `packages/frontend` before committing and pushing. The dev server (`tsx`) transpiles without type-checking, so type errors (unused variables, type mismatches, missing imports) only surface during the production `tsc` build on Railway. This has caused multiple failed deployments. Common issues caught by `tsc` but not `tsx`:
- `noUnusedLocals: true` — unused variables/imports cause build failure
- Narrow union types (e.g., `'Spring' | 'Summer'`) vs generic `string` — strict assignability checks
- Missing or mismatched prop types in component interfaces

```bash
# ALWAYS run before pushing:
cd packages/frontend && npx tsc --noEmit

# Then commit and push:
git add <files> && git commit -m "feat: description"
git push origin master
# Railway auto-deploys within 2-3 minutes
```

### Puppeteer on Railway (Linux)
The recipe scraper uses cross-platform spawning (`os.platform()` detection):
- **Windows:** `wmic process call create` for fully independent child processes
- **Linux (Railway):** Standard `spawn()` with `{detached: true}` + `unref()`
- **`nixpacks.toml`** installs system Chromium + all required libraries (libnss3, libgbm1, etc.)
- **`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`** set via nixpacks — skips bundled Chromium download (~300MB)
- **`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`** set via nixpacks — all `puppeteer.launch()` calls use system Chromium when this env var is set
- All three `puppeteer.launch()` sites (in `workers/puppeteerWorker.ts` and `utils/puppeteerWorker.ts`) pass `executablePath` from env var

## Authentication System

### Overview
Simple password-based auth protecting the entire app. Set `APP_PASSWORD` env var to enable (no auth if unset).

### Flow
1. User visits app → frontend checks `localStorage` for saved token
2. If token exists → validates via `GET /api/auth/check` with Bearer header
3. If no token or invalid → shows `LoginPage` with password input
4. User enters password → `POST /api/auth/login` → server checks against `APP_PASSWORD`
5. If correct → server returns SHA-256 hash token → frontend stores in `localStorage`
6. All subsequent API calls include `Authorization: Bearer <token>` via Axios interceptor
7. `requireAuth` middleware validates token on all `/api/*` routes (except `/api/health`, `/api/auth/*`). **Important:** Health endpoint is registered BEFORE the auth middleware in `server.ts` (not just path-checked in middleware), ensuring Railway healthchecks always pass
8. 401 response interceptor auto-logs out and shows login screen

### Key Files
| File | Purpose |
|------|---------|
| `packages/backend/src/middleware/auth.ts` | `loginHandler`, `checkAuthHandler`, `requireAuth` middleware |
| `packages/frontend/src/contexts/AuthContext.tsx` | `AuthProvider`, `useAuth` hook, Axios interceptors |
| `packages/frontend/src/pages/LoginPage.tsx` | Password form UI |
| `packages/frontend/src/App.tsx` | `AuthProvider` wrapper, conditional rendering |

### Token Generation
```typescript
// Deterministic — same password always produces same token
crypto.createHash('sha256').update(password + '_mealplan_auth').digest('hex')
```

### Auth API Endpoints
- `POST /api/auth/login` — Body: `{ password }` → Returns: `{ token }` or 401
- `GET /api/auth/check` — Header: `Authorization: Bearer <token>` → Returns: `{ authenticated: true }` or 401

## Mobile-First UI

### Overview
All pages use responsive Tailwind breakpoints (`sm:`, `md:`, `lg:`) for mobile-first design. Phone is the primary device.

### Navigation
- **Mobile (<md):** Top bar with "MealPlan" title + hamburger icon → slide-in drawer from right (w-72)
- **Desktop (md+):** Horizontal nav bar with all links
- Drawer closes on: link click, backdrop click, Escape key, route change
- `sticky top-0 z-40` for persistent nav on scroll

### Key Mobile Patterns
- **Touch targets:** All interactive elements min 44px (`min-h-[44px]`)
- **Modals:** Fullscreen on mobile (`h-screen`), windowed on desktop
- **Page padding:** `py-4 md:py-8` (reduced on mobile)
- **Headings:** `text-xl md:text-2xl` or `text-2xl md:text-3xl`
- **Active states:** `active:scale-95` on buttons for touch feedback
- **Safe areas:** CSS variables for notched phones (`env(safe-area-inset-*)`)

### PWA Configuration
- **Plugin:** `vite-plugin-pwa` with Workbox GenerateSW strategy
- **Manifest:** Name "MealPlan", theme color `#2563eb`, standalone display
- **Service Worker:** Caches static assets, NetworkFirst for API calls
- **Icons:** 192x192 and 512x512 in `packages/frontend/public/`
- **Install:** "Add to Home Screen" on Android Chrome
- **Cache invalidation:** If users see stale content after deploy, clear site data in browser settings

## Backup: mealplanoriginal

A backup of the pre-mobile/pre-cloud app lives at `C:\00 Paris\mealplanoriginal\`:
- **Created from:** git commit `86a31bf` (before mobile transformation)
- **Uses SQLite** (original `dev.db` file)
- **Non-conflicting ports:** Backend on 3100, Frontend on 5183
- **Has its own CLAUDE.md** with paths updated to `mealplanoriginal`
- **Fully independent** — can run alongside the main MealPlan project

## Project Status

### Completed Phases

**Phase 0: Project Setup** - Monorepo, Express, Prisma, React, Vite, Tailwind, 9 database tables

**Phase 1: Recipe Management** - Full CRUD, search, pagination, bulk operations, soft delete/restore, ingredient deduplication, "Start from existing recipe" feature, field-specific validation

**Phase 2: Nutritional Information** - Per-recipe nutrition, per-serving calculations, meal plan aggregation

**Phase 3: Weekly Meal Planning** - Meal plan CRUD, meal types, servings, completion tracking, status management, nutrition summaries, add/edit/remove recipes via modal UI

**Phase 4: Shopping List Generation** - Generate from meal plans/recipes/custom, intelligent ingredient aggregation via unified unit conversion (metric+imperial merged, always displays metric), category grouping, check-off functionality, item add/remove/update

**Recipe Scraper & URL Import** - Scrape from bigrecipe.com, allrecipes.com, akispetretzikis.com, and argiro.gr; JSON-LD + HTML fallback + Puppeteer for Cloudflare-protected sites; Greek-to-English unit mapping (75+ entries); unit normalization pipeline (~80 entries); Windows `start` command for isolated child processes (solves backend freeze); async job system with frontend polling; Excel template generation; mandatory Review & Import flow (bulk direct import removed); sodium auto-normalized to mg

**UI Component Library** - Button, Card, Input, TextArea, Modal, Badge, Select, Alert components

**Ingredient Management** - Master database, autocomplete components, bulk import/delete, usage validation, click-to-view recipes modal

**Recipe Enhancements** - Export to Excel, tag search (single + multi-tag AND filter), Add to Meal Plan from recipe cards/detail pages

**Cooking Plans** - Persistable cooking schedules with CRUD + soft delete/restore, schedule computed from saved meal plan IDs + cook days, list page with active/deleted tabs

**Developer Tools** - Developer hub page, Assets Library with interactive UI component showcase

**Validation Error Display** - ApiError class preserving backend response data, toast popup with error count, inline field-level error display with human-readable paths, per-ingredient-row red highlighting

**Meal Plan Calendar** - Interactive monthly calendar on MealPlanDetailPage with meal-type color dots, click-to-scroll navigation, month arrows, today indicator

**Tag Manager** - Drag-and-drop tag assignment developer tool with 80+ predefined tags in 6 color-coded categories (Meal, Base, Duration, Country, Store, Method), recipe search/filter, duplicate prevention, quick removal

**Ingredient Data Pipeline** - USDA FoodData Central SR Legacy integration; `process-usda.ts` script reads downloaded CSV files, filters to raw/basic ingredient categories, deduplicates, joins with nutrition data (7 nutrients per 100g), and generates Excel + JSON import files; 2,592 ingredients with 100% nutrition coverage; public domain data (CC0 1.0)

**Source URL Enrichment** - Script at `scripts/enrich-source-urls.ts` to batch-update existing recipes with their original source URLs:
- Reads URLs from Excel file
- For Akis URLs: Uses greeklish-to-English slug mapping (90+ mappings) to match recipes
- For allrecipes.com URLs: Scrapes title and matches exactly
- Updates matched recipes via `PUT /api/recipes/:id`
- Generates JSON report with matches, no-matches, and errors

**Auto-Tagging** - Automatic tag assignment on recipe creation via `autoTagger.ts`; adds source site tags from `sourceUrl` + infers Meal, Base, Duration, Country, Store, Method category tags from title/description/ingredients/times; additive-only, conservative for Store/Method

**PostgreSQL Migration** - Migrated from SQLite to PostgreSQL for Railway cloud deployment; Docker Compose for local dev; all data migrated (265 recipes, 3,255 ingredients, meal plans, shopping lists)

**Cloud Deployment (Railway)** - Single-service architecture (backend serves frontend static files); auto-deploy on push to master; Railway Postgres addon; healthcheck with 120s timeout; cross-platform Puppeteer spawning (Windows wmic / Linux spawn)

**Mobile-First UI Overhaul** - Hamburger + drawer navigation on mobile; fullscreen modals; 44px touch targets on all interactive elements; responsive padding/headings; active:scale-95 touch feedback; safe area insets for notched phones

**PWA Support** - vite-plugin-pwa with Workbox; manifest for Android home screen installation; service worker with NavigateFallback for SPA routing; 192x192 and 512x512 app icons

**Password Authentication** - SHA-256 token-based auth via `APP_PASSWORD` env var; login page; Axios interceptors for Bearer token; auto-logout on 401; protects all API endpoints

**Shopping List Second-Pass Merge** - Fixed ingredient duplication (e.g., garlic appearing twice) by adding post-override merge that combines items with same ingredientId + unit after ingredient-specific overrides are applied

**Tag Autocomplete** - `TagAutocomplete` component on recipe form with grouped dropdown (6 categories), color-coded suggestions from 97-tag library, keyboard navigation, existing tag exclusion; replaces plain text input; color-coded tag badges on form via `getCategoryForTag()`

**Review & Import Flow** - Removed bulk direct import from UrlImportPage; each scraped recipe now requires individual review via "Review & Import" button that navigates to RecipeFormPage with prefilled data via `location.state`; RecipeFormPage detects prefill, populates all fields, shows info banner

**Case-Insensitive Recipe Search** - Fixed PostgreSQL case-sensitive `contains` by adding Prisma `mode: 'insensitive'` to all search fields (title, description, tags); also added ingredient name search so searching "chicken" finds recipes containing that ingredient

**Recipe Card Tag Highlighting** - Search results show matched tag as a colored badge (using `getCategoryForTag()`) with `+N more` counter for remaining tags; helps users see why a recipe matched their search

**Shopping List Add-from-Recipes Fix** - Adding a recipe to an existing shopping list previously bypassed the unit conversion pipeline (stored raw recipe units like `lb` instead of converting to metric). Fixed by adding `POST /api/shopping-lists/:id/add-from-recipes` endpoint that runs recipes through `aggregateIngredients()` before adding items, ensuring imperial→metric conversion and ingredient-specific overrides

**Clickable Meal Plan Cards** - MealPlansPage cards are fully clickable on mobile (entire card navigates to detail page, not just the title link)

**Theme System** - 55 CSS custom properties drive all colors; 5 predefined themes (Classic, Ocean, Forest, Sunset, Midnight) + 3 user-customizable slots; HSL-based auto-derivation from 6 key colors with dark mode auto-detection; ThemePicker in nav bar + mobile drawer; CustomThemeEditor in Assets Library; FOUC prevention via localStorage cache; all ~30 files migrated from hardcoded colors to semantic tokens

**Tabbed Recipe Form** - RecipeFormPage converted from single long scroll to 4-tab interface (Details, Ingredients, Instructions, Nutrition); sticky tab bar below nav; red error dot indicators on tabs with validation issues; auto-navigation to first error tab on submit; mobile-responsive shorter labels; `noValidate` prevents hidden `required` inputs from blocking submission; form data preserved across tab switches; works with create, edit, URL import prefill, and "start from existing recipe" flows

**Shopping List Print Improvements** - Print-optimized layout with `@media print` Tailwind variants: progress bar hidden, real checkboxes replaced with Unicode □/☑, tightened spacing on all elements (cards, categories, items, page margins), dotted leader lines between ingredient names and quantities for readability

**Themed Shopping List Button** - Meal plan detail page Shopping List button uses `hero-shopping` theme color (changes per theme: rose in Classic, indigo in Ocean, etc.) instead of generic secondary variant

**AI-Powered Meal Plan Generation** - Full wizard (5 steps) with Anthropic Claude integration for generating personalized meal plans; preference profiles with dietary restrictions, cuisine preferences, calorie/macro targets, cooking time limits; flexible duration (1-28 days) with preset chips; pinned meals (pre-assign library recipes); AI estimates per-serving nutrition for all meals; meal swapping with 3 alternatives; recipe detail generation constrained to DB ingredient list (~1,025 ingredients); auto "AI" tag on generated recipes; batch cooking support; rate limiting

**AI Meal Plan Wizard Restructure** - Merged old Steps 1-2 (Preferences + Nutrition/Duration) into new Step 1 "Plan Setup" with collapsible accordion sections (Collapsible UI component) + new Step 2 "Taste & Diet" with shared selector components; added cooking-free days (calendar picker replacing legacy cookDaysPerWeek) and preferred cooking methods fields to MealPlanPreference model; extracted 6 reusable selector components into `components/ai-shared/` directory shared between AI Meal Plan and AI Recipe Generator wizards

**AI Recipe Generator** - Standalone recipe generation at `/recipes/ai-generate` with 4-step wizard (Concept → Preferences → Review & Create → Done); generates 1-5 recipe suggestions via Claude; supports "alternative version of existing recipe" via RecipePicker; load-only profile support (pre-fills from saved profiles without saving back); creates full recipes via existing recipe-details endpoint → RecipeFormPage prefill; sessionStorage persistence; emerald accent color; shares rate limiter with AI Meal Plan; entry points on RecipesPage header + HomePage card

**Nutrition Calculation Fix** - Fixed critical bug where plan nutrition summary divided per-serving values by recipe servings (double-division); corrected formula: `per_serving_cal × servings_eaten`; added daily nutrition breakdown table to MealPlanDetailPage with per-day calories/protein/carbs/fat; changed label from "Weekly" to "Plan" Nutrition Summary; added coverage indicator showing how many meals had nutrition data

**Source Tag Category** - Added "Source" tag category (purple) to tagDefinitions.ts with tags: AI, Akis Petretzikis, Allrecipes, Argiro Barbarigou, Big Recipe

**Railway Nixpacks + Puppeteer Fix** - Created `nixpacks.toml` to install system Chromium + dependencies for Puppeteer on Railway Linux; `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` and `PUPPETEER_EXECUTABLE_PATH` env vars skip bundled download and use system Chromium; all `puppeteer.launch()` calls pass `executablePath` when env var is set

**Railway Healthcheck Auth Fix** - Fixed deployment failure caused by health endpoint being blocked by `requireAuth` middleware; moved `/api/health` route registration before auth middleware in `server.ts`; also fixed `req.path` comparison in `requireAuth` (Express strips mount prefix: `/api/health` → `/health` inside middleware mounted at `/api`)

**Startup Logging** - Added `ANTHROPIC_API_KEY` and `APP_PASSWORD` presence indicators to server startup log for production debugging

**Recipe Collections** - User-organized recipe groups with full CRUD + soft delete/restore; CollectionsPage with card grid (active/deleted tabs), CollectionDetailPage with recipe grid and RecipePicker integration; AddToCollectionModal with toggle-on-check pattern (immediate mutations); integrated into RecipesPage ("Collection" button + dropdown), RecipeDetailPage ("Collection" button + purple membership badges), Navigation (FolderHeart icon), HomePage (violet gradient card in primary grid); 2 new Prisma models (RecipeCollection, RecipeCollectionItem junction table); 11 REST endpoints at `/api/collections`

**Recipe Advanced Filters** - Collapsible filter panel on RecipesPage with 6 client-side filters: Max Calories (per serving), Min Protein (g), Max Carbs (g), Max Fat (g), Max Total Time (min), Max Prep Time (min). Uses `useMemo` to filter the already-fetched full recipe array (no backend changes). Recipes without nutrition/time data are excluded when the corresponding filter is active. Filter toggle button with `SlidersHorizontal` icon + active count badge; smooth CSS grid animation for panel expand/collapse; "Showing X of Y" counter + "Clear all filters" link. Responsive grid: 6 cols desktop, 3 tablet, 2 mobile. Theme-aware inputs with `bg-surface text-text-primary`.

**Standalone Preference Profiles Page** - Dedicated page at `/preferences` for managing AI meal plan preference profiles independently of the wizard. PreferencesPage lists saved profiles with badges (recipe source, dietary restrictions, cuisines) and edit/delete actions. PreferenceEditPage (`/preferences/new` and `/preferences/:id`) provides full create/edit form with 5 collapsible sections: Meals & Servings (included meals, recipe source, default servings, meal variety), Taste & Diet (5 shared ai-shared selector components), Cooking Time Limits (weekday/weekend prep/cook), Nutrition Targets (calorie range, macro split with sum validation), Plan Defaults (duration presets, repeat weekly, quick meal max time). Reuses all existing backend CRUD endpoints and React Query hooks — no backend changes needed. "Preferences" card added to HomePage secondary utilities grid (expanded to 3 columns). `cookingFreeDays` field preserved but not editable (requires plan date range context for calendar picker).

**Per-Day Add Meal Button** - Each day card on MealPlanDetailPage now has a `PlusCircle` button in the top-right corner. Clicking it opens the AddRecipeModal with that day's date pre-filled. AddRecipeModal gained an optional `defaultDate` prop that sets the initial date for both the detail form (step 2) and quick-add inline form (step 1). The header "Add Recipe" button continues to default to today's date.

**Exclusive Accordion Sections** - All preference/settings forms now use exclusive accordion behavior (only one section open at a time, all start closed). Implemented via controlled `Collapsible` components with a shared `openSection` state. Applied to: PreferenceEditPage (5 sections), StepPlanSetup (6 sections), StepTasteDiet (4 sections, Cards→Collapsibles), StepRecipePreferences (7 sections, Cards→Collapsibles). Related items grouped together (e.g., Dietary Restrictions + Allergies, Calories + Time Limits) to reduce section count.

**AI Generate Button on MealPlansPage** - Purple "AI Generate" button (with Sparkles icon) added next to "+ Create Meal Plan" on MealPlansPage, linking to `/ai-meal-plan`. Mirrors the emerald "AI Generate" button pattern on RecipesPage. "AI Planner" removed from Navigation menu (both desktop and mobile drawer) since it's now accessible contextually from MealPlansPage.

**Preference Profile Duplication** - Two entry points for creating a profile from an existing one: (1) **Duplicate button** (Copy icon) on PreferencesPage profile cards — navigates to `/preferences/new` with all data pre-filled via `location.state.prefill`, name appended with " (copy)". (2) **"Start from existing profile" dropdown** on PreferenceEditPage (shown only when creating new) — loads selected profile's settings into the form, preserves any name already typed. Both create new profiles without modifying the source.

**Diet Goal Calculator** - Self-contained frontend-only component (`DietGoalCalculator.tsx`) that calculates TDEE using the Mifflin-St Jeor equation (BMR = 10×weight + 6.25×height − 5×age ± gender constant, × activity multiplier). Goal presets: Lose weight (−500 kcal, 30/40/30 macros), Maintain (0, 25/50/25), Build muscle (+300, 35/40/25). Hidden by default behind "Need help figuring out your targets?" link in PreferenceEditPage's Nutrition Targets section. On Apply, fills existing calorie and macro form fields — no backend, no database, no persistence.

**Season-Aware Ingredient Suggestions** - `season` field (Spring/Summer/Autumn/Winter, nullable) added to `MealPlanPreference` model via Prisma migration. `SeasonSelector` component in `ai-shared/` (single-select, teal accent, follows chip button pattern). Wired into both StepTasteDiet (AI wizard) and PreferenceEditPage (standalone). Backend `formatPreferenceForPrompt()` in `aiMealPlan.service.ts` injects seasonal context into the AI prompt with Greece-specific prioritize/avoid ingredient lists per season (e.g., Spring: prioritize artichokes, peas, asparagus; avoid watermelon, figs). Key files: `SeasonSelector.tsx`, `aiMealPlan.service.ts` (SEASONAL_INGREDIENTS), `mealPlanPreference.service.ts`, `mealPlanPreference.validator.ts`, `mealPlanPreference.ts` (types).

**Shopping List Splitting by Date Range** - In ShoppingListBuilder modal (Meal Plans tab), after selecting plans, toggle between "One list" and "Split by shopping trips". Split mode shows frequency presets (every 2/3/4/7 days) + custom input. `useMemo` computes trip date ranges from selected plans' combined date range ÷ frequency, with live preview. Backend `POST /generate-split` endpoint receives `{ mealPlanIds, trips: [{name, startDate, endDate}] }`, filters `MealPlanRecipe` rows by date range per trip, calls existing `aggregateIngredients()` per trip (no aggregation changes), creates one `ShoppingList` per trip. Key files: `ShoppingListBuilder.tsx` (split UI), `ShoppingListsPage.tsx` (wiring), `shoppingList.service.ts` (backend generateSplitFromMealPlans), `shoppingList.controller.ts`, `shoppingLists.ts` (route).

### Future Enhancements
- Drag-and-drop meal plan interface
- Recipe images upload
- Support for more recipe websites beyond bigrecipe.com, allrecipes.com, akispetretzikis.com, argiro.gr
- Meal plan templates

## Troubleshooting

### Backend freezes mid-session (common — happens after Puppeteer activity)
If `curl http://localhost:3000/api/health` times out, find and kill the process then restart:
```bash
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess"
powershell -Command "Stop-Process -Id <PID> -Force"
# then restart backend in background (see Quick Start)
```
Frontend Vite server can also die silently — verify with `curl -s http://localhost:5173 | head -3`.

### "This site can't be reached" at localhost:5173
Frontend dev server stopped. Restart:
```bash
cd "C:\00 Paris\MealPlan\packages\frontend"
"C:\Program Files\nodejs\node.exe" "../../node_modules/vite/bin/vite.js"
```

### API returns 404
Backend server stopped or route not registered. Check:
1. `curl http://localhost:3000/api/health`
2. Verify route in `packages/backend/src/server.ts`
3. Restart backend if needed

### Prisma type errors after schema change
```bash
npm run prisma:generate
```
If the Prisma engine DLL is locked by a running backend process, use `--no-engine` flag:
```bash
cd packages/backend
npx prisma generate --no-engine
```
This generates TypeScript types without touching the locked DLL. Restart the backend to pick up changes.

### Database issues / migration conflicts
1. Delete `packages/backend/prisma/migrations` folder
2. Run `npm run prisma:migrate` with name "init"
3. Run seed script

### PostgreSQL not running
If backend fails to start with connection errors:
```bash
docker compose -f "C:\00 Paris\MealPlan\docker-compose.yml" up -d
```
Check status: `docker ps` should show a `postgres:16-alpine` container.

### Service worker serving stale content
After deploying fixes, users may see old cached versions:
1. **Chrome Desktop:** DevTools → Application → Storage → Clear site data
2. **Android Chrome:** Settings → Site settings → find the URL → Clear & reset
3. **Dev mode:** Check "Bypass for network" in DevTools → Application → Service Workers

### Dark theme: raw form inputs need explicit text color
Raw `<input>`, `<select>`, `<textarea>` elements default to browser dark text — invisible on dark custom themes. Always add `text-text-primary bg-surface` to raw form elements. The UI library components (`Input.tsx`, `Select.tsx`) already have this. When adding new raw form elements, test against a dark custom theme before committing.

### Railway build fails but dev server works fine
The dev server uses `tsx` which **transpiles only** (no type checking). The production build uses `tsc` which enforces all strict checks. Always run `cd packages/frontend && npx tsc --noEmit` before pushing to catch type errors early.

### Backend must be manually restarted
After backend code changes, kill and restart the process. Frontend HMR works automatically.

### Port already in use
If port 3000 or 5173 is busy, kill the existing process or Vite will auto-increment to 5174+.
To find and kill the process on port 3000:
```bash
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess"
powershell -Command "Stop-Process -Id <PID> -Force"
```

## Known Issues

### Railway Healthcheck Auth Failure (Resolved)
**Problem:** Railway deployments failed at the "Network > Healthcheck" stage. Build and deploy succeeded, but the server returned 401 for `/api/health`, causing Railway to mark the deployment as failed.

**Root Cause:** Two compounding issues:
1. The `/api/health` route was registered AFTER `app.use('/api', requireAuth)` in `server.ts`
2. Inside `requireAuth`, the path check `req.path === '/api/health'` never matched because Express strips the mount prefix when middleware is mounted with a path — `req.path` was `/health`, not `/api/health`

**Fix:**
1. Moved health route registration BEFORE auth middleware in `server.ts`
2. Fixed path comparisons in `requireAuth` to check both stripped (`/health`) and full (`/api/health`) paths

**Lesson:** When Express middleware is mounted with `app.use('/prefix', middleware)`, inside that middleware `req.path` is relative to the mount point (prefix is stripped). Use `req.originalUrl` for the full path, or register routes that need to bypass middleware BEFORE the middleware.

### React Rules of Hooks in Production (Resolved)
**Problem:** Navigation.tsx had `return null` before `useEffect` hooks. This worked in development but caused React Error #310 in production (minified build), making all pages blank when navigating.

**Root Cause:** React's rules of hooks require hooks to be called in the same order every render. Conditional `return` before hooks means hooks are skipped on some renders.

**Fix:** Move all early returns AFTER all hook calls. Always ensure `useEffect`, `useState`, etc. come before any conditional `return`.

**Lesson:** Always test production builds (`vite preview`) before deploying, not just dev mode.

### Puppeteer Backend Freeze (Resolved)

**Problem (Historical):** When using Puppeteer (headless Chrome) to scrape Cloudflare-protected sites (akispetretzikis.com, argiro.gr), the Express backend would freeze and stop responding to all requests. This happened even when Puppeteer ran in an isolated child process using `spawn()`.

**Root Cause:** Node.js `spawn()` on Windows maintains some connection to child processes even with `detached: true` and `stdio: 'ignore'`. This caused the Express event loop to block when Chrome processes were running.

**Solution:** Use Windows `wmic process call create` to spawn completely independent processes:
```javascript
// Old approach (caused freezes):
spawn(nodePath, [tsxPath, workerScript, url, siteType, outputFile], {
  stdio: ['ignore', 'ignore', 'ignore'],
  detached: true,
  windowsHide: true,
});

// New approach (works reliably):
// 1. Write a batch file with the command
const batchFile = path.join(os.tmpdir(), `puppeteer-worker-${jobId}.bat`);
const batchContent = `@echo off\r\n"${nodePath}" "${tsxPath}" "${workerScript}" "${url}" "${siteType}" "${outputFile}"\r\n`;
fs.writeFileSync(batchFile, batchContent);

// 2. Use wmic to spawn the batch file as a completely independent process
exec(`wmic process call create "${batchFile}"`, { windowsHide: true });
```

The `wmic process call create` command spawns a process that is completely independent from the current process tree. Unlike `spawn()` with `detached: true` or `cmd.exe /c start`, `wmic` creates a process that has no connection to the parent, avoiding any event loop blocking.

**Current Status:** Both Akis and Argiro scraping work reliably:
- **Akis:** Tries API first (fast), falls back to Puppeteer if Cloudflare blocks
- **Argiro:** Uses Puppeteer (no API available)
- **bigrecipe.com & allrecipes.com:** Use JSON-LD + Cheerio (no Puppeteer needed)

**Files Involved:**
- `packages/backend/src/services/recipeScraper.service.ts` - Main scraper service with `startPuppeteerJob()` and `runPuppeteerInChildProcess()`
- `packages/backend/src/workers/puppeteerWorker.ts` - Isolated Puppeteer worker
- `packages/backend/src/routes/scraper.ts` - API endpoints including async job system
- `packages/frontend/src/pages/UrlImportPage.tsx` - Frontend with job polling

### Shopping List Add-from-Recipe Unit Conversion Bypass (Resolved)

**Problem:** When adding a recipe to an existing shopping list via the "Add from Recipe" picker on `ShoppingListPage`, ingredients were stored with their raw recipe units (e.g., `1.5 lb` ground lamb) instead of being converted to metric (e.g., `680.39 g`). This also caused duplicate entries when the same ingredient appeared in different unit systems (e.g., garlic as cloves, tsp, and tbsp — all stored separately).

**Root Cause:** `handleAddFromRecipe` in `ShoppingListPage.tsx` looped through each recipe ingredient and called `addItem.mutateAsync()` individually, which sent each ingredient to `POST /api/shopping-lists/:id/items` with the raw recipe unit. The `addItemToList` backend method stores whatever unit it receives — no conversion pipeline.

**Fix:** Added `POST /api/shopping-lists/:id/add-from-recipes` endpoint that runs recipes through the full `aggregateIngredients()` pipeline (convertToBase → applyIngredientOverride → convertFromBase → second-pass merge) before adding items. Frontend `handleAddFromRecipe` now calls this single endpoint instead of looping per-ingredient.

**Files:** `shoppingList.service.ts` (new `addFromRecipes` method), `shoppingList.controller.ts`, `shoppingLists.ts` (route), `shoppingLists.service.ts` (frontend), `ShoppingListPage.tsx`

## Bulk DB Operations (Data Cleanup / Refinement)

### Use Prisma scripts directly — never loop rapid API calls
Looping `PUT /api/recipes/:id` rapidly causes backend timeout/freeze. For bulk updates, write a `.ts` script in the project root and run it from the backend directory (so Prisma resolves correctly):
```bash
cd "C:\00 Paris\MealPlan\packages\backend"
"C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" "../../my-script.ts"
```

### Merging ingredients: unique constraint gotcha
`RecipeIngredient` has a unique constraint on `(recipeId, ingredientId)`. When re-pointing rows to a new ingredientId during a merge, check for conflicts first — if the target ingredient already exists in the same recipe, **DELETE** the duplicate row instead of updating. Same applies to `ShoppingListItem` on `(shoppingListId, ingredientId)`.

### Ingredient refinement (run after bulk recipe imports)
The 7-step process (fix units → merge plurals → remove noise → resolve vague → translate → merge duplicates → verify integrity) is documented at `/developer/ingredients`. Shopping list category display order:
`produce → pulses → dairy → meat → seafood → pantry → grains → oils → nuts → herbs → spices → Other`
Items within each category are sorted **alphabetically** by ingredient name.

## Git Workflow
- **Main branch:** `master`
- **Remote:** `origin` → `github.com/ParisB81/MealPlan`
- **Commit messages:** Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Deployment:** Push to `master` triggers automatic Railway deployment (2-3 min)
- **Auth:** GitHub CLI (`gh auth setup-git`) configured for credential management

## Adding New Features (Pattern)

1. **Backend first:**
   - Validator (Zod schema) in `packages/backend/src/validators/`
   - Service (business logic) in `packages/backend/src/services/`
   - Controller (HTTP handlers) in `packages/backend/src/controllers/`
   - Routes in `packages/backend/src/routes/`
   - Register route in `packages/backend/src/server.ts`
   - Restart backend server

2. **Frontend second:**
   - Types in `packages/frontend/src/types/`
   - API service in `packages/frontend/src/services/`
   - React Query hooks in `packages/frontend/src/hooks/`
   - Components in `packages/frontend/src/components/`
   - Page in `packages/frontend/src/pages/`
   - Route in `packages/frontend/src/App.tsx`

---

**Last Updated:** 2026-03-15
**Project Version:** 2.8.0
**All Phases Complete** (Phases 0-4 + Scraper + UI Library + Ingredient Management + Cooking Plans + Developer Tools + Recipe Enhancements + Akis Scraper + Argiro Scraper + Validation Error Display + Meal Plan Calendar + Tag Manager + Ingredient Data Pipeline + Sodium Normalization + Unit Normalization + Scraper Architecture + Source URL Tracking + Source URL Enrichment Script + Unified Metric Aggregation + Can Size Extraction + Ingredient Recipes Modal + Auto-Tagging + Ingredient Refinement Pipeline + Ingredient Unit Overrides + Shopping List Alpha Sort + **PostgreSQL Migration** + **Railway Cloud Deployment** + **Mobile-First UI** + **PWA Support** + **Password Authentication** + **Shopping List Second-Pass Merge** + **Tag Autocomplete** + **Review & Import Flow** + **Case-Insensitive Search** + **Shopping List Add-from-Recipes Fix** + **Theme System** + **Tabbed Recipe Form** + **Shopping List Print** + **Themed Shopping Button** + **AI-Powered Meal Plan Generation** + **Nutrition Calculation Fix** + **Source Tag Category** + **Railway Nixpacks/Puppeteer** + **Railway Healthcheck Auth Fix** + **AI Meal Plan Wizard Restructure** + **AI Recipe Generator** + **Recipe Collections** + **Recipe Advanced Filters** + **Standalone Preference Profiles Page** + **Per-Day Add Meal Button** + **Exclusive Accordion Sections** + **AI Generate on MealPlansPage** + **Preference Profile Duplication** + **Diet Goal Calculator** + **Season-Aware Ingredient Suggestions** + **Shopping List Splitting by Date Range**)
