import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function IngredientRefinementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-5xl">
        {/* Back Link */}
        <Link
          to="/developer"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Developer Tools
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Ingredient Refinement</h1>
          <p className="text-lg text-gray-600">
            Documentation and guidelines for cleaning up and standardizing ingredient data.
          </p>
        </header>

        {/* Scope Section */}
        <Card className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Scope</h2>
          <p className="text-gray-700 mb-4">
            Ingredient refinement is a periodic maintenance task that ensures data quality and consistency
            across the recipe database. This process addresses issues that arise from:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li><strong>Recipe scraping:</strong> Automated imports from external websites may include malformed ingredient names, prep instructions embedded in names, or non-English text</li>
            <li><strong>Manual entry:</strong> Users may enter ingredients inconsistently (plurals, abbreviations, variations)</li>
            <li><strong>Data drift:</strong> Over time, duplicate or near-duplicate ingredients accumulate</li>
          </ul>
          <p className="text-gray-700 mt-4">
            The goal is to maintain a clean, deduplicated ingredient database where each ingredient has
            exactly one canonical name, and all recipe references point to the correct ingredient.
          </p>
        </Card>

        {/* Actions List Section */}
        <Card className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Refinement Actions</h2>
          <p className="text-gray-600 mb-6">
            The following actions are performed in order during ingredient refinement. Each action
            includes updating all affected recipes and shopping lists.
          </p>

          <div className="space-y-6">
            {/* Action 1 */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">1. Fix Invalid Units</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> Scraped recipes often contain long-form units
                (e.g., "tablespoon" instead of "tbsp") or invalid units that don't match the app's unit system.
              </p>
              <p className="text-gray-700">
                Identify recipe ingredients with units not in the valid units list. Map common variations
                to standard abbreviations (tablespoon→tbsp, teaspoon→tsp, pound→lb, ounce→oz).
                For unusual units like can sizes, convert to "piece" with descriptive notes.
              </p>
            </div>

            {/* Action 2 */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">2. Merge Plural Forms</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> The same ingredient may exist as both
                singular and plural (e.g., "carrot" and "carrots"), causing fragmentation.
              </p>
              <p className="text-gray-700">
                Find all plural ingredient names where a singular form exists. Merge the plural into the
                singular by updating all recipe ingredient references and combining quantities where the
                same recipe has both forms with matching units. Delete the plural ingredient after merging.
              </p>
            </div>

            {/* Action 3 */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">3. Remove Noise from Names</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> Scraped ingredient names often include
                preparation instructions, notes, or descriptors that should be separate from the ingredient name.
              </p>
              <p className="text-gray-700">
                Clean up ingredient names containing:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-1">
                <li>Parenthetical notes: "cod ((fresh or frozen), boneless)" → "cod"</li>
                <li>Prep instructions: "shredded kale" → "kale"</li>
                <li>Percentages: "heavy cream 35%" → "heavy cream"</li>
                <li>"Homemade" prefix: "homemade mayonnaise" → "mayonnaise"</li>
                <li>"Or" alternatives: "lavash or pita bread" → "pita bread"</li>
                <li>Garbage fragments: "to taste", "and half", "beaten" → delete or replace contextually</li>
              </ul>
            </div>

            {/* Action 4 */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">4. Resolve Vague Ingredient Names</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> Generic names like "powder", "sauce", or "oil"
                are meaningless without context and indicate parsing errors.
              </p>
              <p className="text-gray-700">
                Identify vague ingredient names (powder, paste, sauce, oil, juice, broth, stock, seeds, wine).
                For each usage, examine the recipe context to determine the correct specific ingredient
                (e.g., "powder" in a Moroccan stew → "cayenne pepper"). Update each recipe individually,
                then delete the vague ingredient once all usages are resolved.
              </p>
            </div>

            {/* Action 5 */}
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">5. Translate Non-English Ingredients</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> Recipes scraped from Greek or other
                non-English sites may retain ingredient names in the original language.
              </p>
              <p className="text-gray-700">
                Find all ingredients containing non-ASCII characters (Greek: Unicode range \u0370-\u03FF).
                Map each to its English equivalent and merge into the existing English ingredient if one
                exists. Common Greek mappings include: αλάτι→salt, ελαιόλαδο→olive oil, σκόρδο→garlic,
                κρεμμύδι→onion, πιπέρι→pepper.
              </p>
            </div>

            {/* Action 6 */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">6. Merge Duplicate Ingredients</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> Different naming conventions or typos
                can create multiple entries for the same ingredient.
              </p>
              <p className="text-gray-700">
                Identify and merge duplicates such as: "vegetable stock pot" → "vegetable stock",
                "pinch of cayenne pepper" → "cayenne pepper", "water to cover" → "water".
                When merging, update all recipe references and combine quantities where appropriate.
              </p>
            </div>

            {/* Action 7 */}
            <div className="border-l-4 border-gray-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">7. Verify Recipe Integrity</h3>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium">Rationale:</span> After refinement, ensure no recipes
                lost ingredients or have broken references.
              </p>
              <p className="text-gray-700">
                Check for recipes with zero or very few ingredients (may indicate data loss).
                Verify that context-specific fixes were applied correctly by spot-checking affected recipes.
                Re-scrape any recipes that appear to have missing data.
              </p>
            </div>
          </div>
        </Card>

        {/* Prompt Section */}
        <Card className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">AI Prompt for Refinement</h2>
          <p className="text-gray-600 mb-4">
            Use the following prompt with Claude to perform ingredient refinement after adding new recipes:
          </p>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap">
{`Please perform ingredient refinement on the MealPlan database. Follow these steps in order:

1. **Find Invalid Units**: Query all recipe ingredients and identify those with units not in the valid units list (see packages/backend/src/utils/validUnits.ts). Export to Excel for review if needed. Fix by mapping to standard units (tablespoon→tbsp, teaspoon→tsp, etc.) or converting to "piece" with notes.

2. **Find Plural Duplicates**: Query ingredients where both singular and plural forms exist (e.g., "carrot" and "carrots"). Merge plurals into singulars, updating all recipe and shopping list references. Combine quantities when a recipe has both forms with the same unit.

3. **Find Noisy Names**: Query ingredients containing:
   - Parentheses (likely notes that should be separate)
   - "homemade" prefix
   - Percentages (e.g., "35%")
   - "or" (alternatives)
   - Prep words (shredded, chopped, diced, beaten, etc.)
   Clean these by extracting the base ingredient name.

4. **Find Vague Names**: Query ingredients named: powder, paste, sauce, oil, juice, broth, stock, seeds, wine, seasoning, threads, shredded. For each usage, examine the recipe to determine the correct specific ingredient. Update contextually, then delete the vague ingredient.

5. **Find Non-English Names**: Query ingredients containing Greek characters (\\u0370-\\u03FF) or other non-ASCII text. Translate to English and merge with existing English ingredients.

6. **Find Garbage Fragments**: Query ingredients that are clearly fragments or garbage: "to taste", "and half", "beaten", "cooled", etc. Delete these entries, but first check if any recipe would be left without a critical ingredient - if so, replace with the appropriate ingredient contextually.

7. **Verify Results**:
   - Check for recipes with 0-2 ingredients (may indicate data loss)
   - Verify affected recipes have correct ingredient references
   - Report total ingredients before and after refinement

For each merge/fix, always:
- Update RecipeIngredient references first
- Update ShoppingListItem references second
- Combine quantities when same recipe has duplicate with same unit
- Delete the old ingredient only after all references are updated

Report a summary of all changes made.`}
          </div>
        </Card>

        {/* Technical Notes */}
        <Card>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technical Notes</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900">Database Constraints</h3>
              <p>
                The <code className="bg-gray-100 px-1 rounded">Ingredient.name</code> field has a unique constraint.
                When merging ingredients, you cannot simply rename if the target name already exists —
                you must update all foreign key references first, then delete the old ingredient.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Foreign Key References</h3>
              <p>
                Ingredients are referenced by two tables:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li><code className="bg-gray-100 px-1 rounded">RecipeIngredient</code> — links ingredients to recipes</li>
                <li><code className="bg-gray-100 px-1 rounded">ShoppingListItem</code> — links ingredients to shopping lists</li>
              </ul>
              <p className="mt-2">
                Both must be updated before an ingredient can be deleted, or the delete will fail with a
                foreign key constraint error.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Quantity Combining</h3>
              <p>
                When merging two ingredient entries in the same recipe:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>If units match: Add the quantities together</li>
                <li>If units differ: Keep both as separate entries (different units may be intentional)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Scripts Location</h3>
              <p>
                Refinement scripts are stored in <code className="bg-gray-100 px-1 rounded">scripts/</code> at the project root.
                Key scripts include:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li><code className="bg-gray-100 px-1 rounded">find-invalid-units.ts</code> — exports invalid units to Excel</li>
                <li><code className="bg-gray-100 px-1 rounded">fix-invalid-units.ts</code> — applies unit corrections</li>
                <li><code className="bg-gray-100 px-1 rounded">fix-ingredient-names.ts</code> — general ingredient cleanup</li>
                <li><code className="bg-gray-100 px-1 rounded">fix-vague-ingredients.ts</code> — context-specific vague name fixes</li>
                <li><code className="bg-gray-100 px-1 rounded">check-recipe-ingredients.ts</code> — verification script</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
