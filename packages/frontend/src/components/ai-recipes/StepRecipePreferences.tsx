import { useState } from 'react';
import { Button, Card, Collapsible } from '../ui';
import { usePreferences } from '../../hooks/useMealPlanPreferences';
import {
  DietaryRestrictionsSelector,
  AllergiesSelector,
  CuisineSelector,
  IngredientPreferencesFields,
  CookingMethodSelector,
} from '../ai-shared';
import type { GenerateRecipeSuggestionsInput } from '../../types/aiRecipe';
import type { MealType } from '../../types/mealPlanPreference';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

interface Props {
  input: GenerateRecipeSuggestionsInput;
  onUpdate: (input: GenerateRecipeSuggestionsInput) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function StepRecipePreferences({
  input,
  onUpdate,
  onBack,
  onGenerate,
  isGenerating,
}: Props) {
  const { data: savedProfiles = [] } = usePreferences();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSection(prev => prev === key ? null : key);
  };

  const handleLoadProfile = (profileId: string) => {
    if (!profileId) return;
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      onUpdate({
        ...input,
        dietaryRestrictions: profile.dietaryRestrictions,
        allergies: profile.allergies,
        cuisinePreferences: profile.cuisinePreferences,
        ingredientLikes: profile.ingredientLikes,
        ingredientDislikes: profile.ingredientDislikes,
        preferredMethods: profile.preferredMethods || [],
        maxPrepTime: profile.weekdayMaxPrep,
        maxCookTime: profile.weekdayMaxCook,
        caloriesMin: profile.caloriesMin,
        caloriesMax: profile.caloriesMax,
      });
    }
  };

  const toggleMealType = (meal: MealType) => {
    const current = input.mealTypes || [];
    const updated = current.includes(meal)
      ? current.filter(m => m !== meal)
      : [...current, meal];
    onUpdate({ ...input, mealTypes: updated });
  };

  return (
    <div className="space-y-4">
      {/* Load from saved profile */}
      {savedProfiles.length > 0 && (
        <Card>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Pre-fill from saved profile (optional)
          </label>
          <select
            onChange={(e) => handleLoadProfile(e.target.value)}
            defaultValue=""
            className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
          >
            <option value="">Select a profile...</option>
            {savedProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            This pre-fills preferences below. Changes won't be saved back to the profile.
          </p>
        </Card>
      )}

      {/* Meal Types & Taste */}
      <Collapsible
        title="Meal Types & Taste"
        subtitle={(input.mealTypes || []).length > 0 ? `${(input.mealTypes || []).length} selected` : 'optional'}
        open={openSection === 'meals'}
        onToggle={() => toggleSection('meals')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Meal types
            </label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleMealType(m.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    (input.mealTypes || []).includes(m.value)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-surface-alt text-text-secondary hover:bg-emerald-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Specific taste or flavor profile
            </label>
            <textarea
              value={input.specificTaste || ''}
              onChange={(e) => onUpdate({ ...input, specificTaste: e.target.value })}
              placeholder="e.g., smoky and spicy, light and refreshing, rich and creamy"
              rows={2}
              className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              maxLength={500}
            />
          </div>
        </div>
      </Collapsible>

      {/* Dietary Restrictions & Allergies */}
      <Collapsible
        title="Dietary Restrictions & Allergies"
        subtitle="optional"
        open={openSection === 'dietary'}
        onToggle={() => toggleSection('dietary')}
      >
        <div className="space-y-6">
          <DietaryRestrictionsSelector
            selected={input.dietaryRestrictions || []}
            onChange={(val) => onUpdate({ ...input, dietaryRestrictions: val })}
          />
          <AllergiesSelector
            selected={input.allergies || []}
            onChange={(val) => onUpdate({ ...input, allergies: val })}
          />
        </div>
      </Collapsible>

      {/* Cuisines */}
      <Collapsible
        title="Cuisine Preferences"
        subtitle={(input.cuisinePreferences || []).length > 0 ? `${(input.cuisinePreferences || []).length} selected` : 'optional'}
        open={openSection === 'cuisines'}
        onToggle={() => toggleSection('cuisines')}
      >
        <CuisineSelector
          selected={input.cuisinePreferences || []}
          onChange={(val) => onUpdate({ ...input, cuisinePreferences: val })}
        />
      </Collapsible>

      {/* Ingredient preferences */}
      <Collapsible
        title="Ingredient Preferences"
        subtitle="optional"
        open={openSection === 'ingredients'}
        onToggle={() => toggleSection('ingredients')}
      >
        <IngredientPreferencesFields
          likes={input.ingredientLikes || ''}
          dislikes={input.ingredientDislikes || ''}
          onLikesChange={(val) => onUpdate({ ...input, ingredientLikes: val })}
          onDislikesChange={(val) => onUpdate({ ...input, ingredientDislikes: val })}
        />
      </Collapsible>

      {/* Cooking methods */}
      <Collapsible
        title="Cooking Methods"
        subtitle={(input.preferredMethods || []).length > 0 ? `${(input.preferredMethods || []).length} selected` : 'optional'}
        open={openSection === 'methods'}
        onToggle={() => toggleSection('methods')}
      >
        <CookingMethodSelector
          selected={input.preferredMethods || []}
          onChange={(val) => onUpdate({ ...input, preferredMethods: val })}
        />
      </Collapsible>

      {/* Calorie range & Time limits */}
      <Collapsible
        title="Calories & Time Limits"
        subtitle="optional"
        open={openSection === 'limits'}
        onToggle={() => toggleSection('limits')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Calorie range per serving
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={input.caloriesMin ?? ''}
                onChange={(e) => onUpdate({ ...input, caloriesMin: e.target.value ? Number(e.target.value) : null })}
                placeholder="Min"
                className="w-28 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
              <span className="text-text-muted">to</span>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={input.caloriesMax ?? ''}
                onChange={(e) => onUpdate({ ...input, caloriesMax: e.target.value ? Number(e.target.value) : null })}
                placeholder="Max"
                className="w-28 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
              <span className="text-sm text-text-muted">kcal</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Time limits
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Max prep time (min)</label>
                <input
                  type="number"
                  min="0"
                  value={input.maxPrepTime ?? ''}
                  onChange={(e) => onUpdate({ ...input, maxPrepTime: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-full border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Max cook time (min)</label>
                <input
                  type="number"
                  min="0"
                  value={input.maxCookTime ?? ''}
                  onChange={(e) => onUpdate({ ...input, maxCookTime: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-full border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
            </div>
          </div>
        </div>
      </Collapsible>

      {/* Other remarks */}
      <Collapsible
        title="Other Remarks"
        subtitle="optional"
        open={openSection === 'remarks'}
        onToggle={() => toggleSection('remarks')}
      >
        <textarea
          value={input.otherRemarks || ''}
          onChange={(e) => onUpdate({ ...input, otherRemarks: e.target.value })}
          placeholder="e.g., kid-friendly, budget-friendly, impress dinner guests"
          rows={2}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
          maxLength={1000}
        />
      </Collapsible>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate Recipes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
