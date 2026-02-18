# Tag Manager - Implementation Plan

## Overview
A new developer tool page at `/developer/tags` for drag-and-drop tag management on recipes.
- **Top section:** Tag palette with all predefined tags grouped by 6 categories (Meal, Base, Duration, Country, Store, Method) from `tags.xlsx`
- **Bottom section:** Scrollable/filterable recipe list where each recipe is a drop zone
- **Interaction:** Drag tags from the palette onto recipes; click × to remove tags

## Files to Create (2 new files)

### 1. `packages/frontend/src/data/tagDefinitions.ts`
Static data file with all tag categories and their tags, hardcoded from `tags.xlsx`:
- 6 categories: Meal (blue), Base (green), Duration (yellow), Country (purple), Store (orange), Method (red)
- Each category has: `name`, `color` (Badge variant), `bgColor` (Tailwind bg), `tags[]`
- Helper: `getCategoryForTag(tag)` to look up a tag's color for display on recipes
- Helper: `ALL_TAGS` flat array for search/filter

### 2. `packages/frontend/src/pages/TagManagerPage.tsx`
Main page component (~200 lines):

**Tag Palette (top):**
- 6 color-coded category sections, each with a header and flex-wrap grid of draggable Badge components
- Tags are draggable via HTML5 native drag-and-drop (no external library)
- `cursor-grab` / `active:cursor-grabbing` styling

**Recipe List (bottom):**
- Search input (by name or comma-separated tags — reuses existing backend search/filter)
- Scrollable list (`max-h-[600px] overflow-y-auto`) of recipe rows
- Each row is a drop zone showing: recipe title (linked) + current tags as color-coded removable Badges
- Drop zone visual feedback: `bg-blue-50 ring-2 ring-blue-300` when dragging over
- "Drop here" / "Already has tag" hints visible during drag
- Empty tag state: italic "No tags" label

**Drag & Drop logic:**
- `onDragStart`: store tag name in `dataTransfer`, track `draggedTag` state
- `onDragOver` / `onDragLeave`: track `dragOverRecipeId` state for highlighting
- `onDrop`: read tag from `dataTransfer`, skip if recipe already has it, call `updateRecipe.mutate({ id, input: { tags: [...existing, newTag] } })`
- Tag removal: `onRemove` callback filters out the tag and calls same mutation

**Key architectural insight:** `PUT /api/recipes/:id` with `{ tags: string[] }` only updates the tags field — does NOT touch ingredients or nutrition (verified in backend service). Safe for tags-only updates.

## Files to Modify (2 existing files)

### 3. `packages/frontend/src/pages/DeveloperPage.tsx`
Add a second card in the tools grid linking to `/developer/tags`:
- Emoji: 🏷️
- Title: "Tag Manager"
- Description: about drag-and-drop tag management

### 4. `packages/frontend/src/App.tsx`
- Add import: `import TagManagerPage from './pages/TagManagerPage'`
- Add route: `<Route path="/developer/tags" element={<TagManagerPage />} />`

## No Backend Changes Needed
The existing `PUT /api/recipes/:id` endpoint with `UpdateRecipeInput` (which is `Partial<CreateRecipeInput>`) already supports sending just `{ tags: string[] }`. The backend recipe service only updates tags when present in the body, leaving ingredients/nutrition untouched.

## Implementation Order
1. Create `tagDefinitions.ts` (static data, no dependencies)
2. Create `TagManagerPage.tsx` (uses tagDefinitions + useRecipes/useUpdateRecipe hooks)
3. Modify `DeveloperPage.tsx` (add card link)
4. Modify `App.tsx` (add route)
