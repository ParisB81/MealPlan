import { useState } from 'react';
import { Button, Card } from '../ui';
import { usePreferences, useCreatePreference, useUpdatePreference } from '../../hooks/useMealPlanPreferences';
import { TAG_CATEGORIES } from '../../data/tagDefinitions';
import type { CreatePreferenceInput, MealType } from '../../types/mealPlanPreference';
import { Save, ChevronRight } from 'lucide-react';

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free',
  'Low-carb', 'Keto', 'Paleo', 'Mediterranean', 'Whole30',
];

const ALLERGY_OPTIONS = [
  'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Eggs', 'Milk/Dairy',
  'Wheat/Gluten', 'Soy', 'Sesame',
];

const CUISINE_OPTIONS = TAG_CATEGORIES.find(c => c.name === 'Country')?.tags || [];

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

interface Props {
  preferences: CreatePreferenceInput;
  preferenceId: string | null;
  onUpdate: (prefs: CreatePreferenceInput) => void;
  onPreferenceIdChange: (id: string | null) => void;
  onNext: () => void;
}

export default function StepPreferences({ preferences, preferenceId, onUpdate, onPreferenceIdChange, onNext }: Props) {
  const { data: savedProfiles = [] } = usePreferences();
  const createPref = useCreatePreference();
  const updatePref = useUpdatePreference();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(preferenceId || '');

  const handleLoadProfile = (profileId: string) => {
    if (!profileId) {
      setSelectedProfileId('');
      onPreferenceIdChange(null);
      return;
    }
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      onPreferenceIdChange(profileId);
      onUpdate({
        name: profile.name,
        recipeSource: profile.recipeSource,
        dietaryRestrictions: profile.dietaryRestrictions,
        cuisinePreferences: profile.cuisinePreferences,
        allergies: profile.allergies,
        ingredientLikes: profile.ingredientLikes,
        ingredientDislikes: profile.ingredientDislikes,
        weekdayMaxPrep: profile.weekdayMaxPrep,
        weekdayMaxCook: profile.weekdayMaxCook,
        weekendMaxPrep: profile.weekendMaxPrep,
        weekendMaxCook: profile.weekendMaxCook,
        caloriesMin: profile.caloriesMin,
        caloriesMax: profile.caloriesMax,
        proteinPercent: profile.proteinPercent,
        carbsPercent: profile.carbsPercent,
        fatPercent: profile.fatPercent,
        cookDaysPerWeek: profile.cookDaysPerWeek,
        quickMealMaxMinutes: profile.quickMealMaxMinutes,
        defaultServings: profile.defaultServings,
        durationWeeks: profile.durationWeeks,
        durationDays: profile.durationDays,
        repeatWeekly: profile.repeatWeekly,
        mealVariety: profile.mealVariety,
        includedMeals: profile.includedMeals,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!preferences.name) return;
    try {
      if (selectedProfileId) {
        await updatePref.mutateAsync({ id: selectedProfileId, input: preferences });
      } else {
        const created = await createPref.mutateAsync(preferences);
        setSelectedProfileId(created.id);
        onPreferenceIdChange(created.id);
      }
    } catch { /* handled by hook */ }
  };

  const toggleArrayItem = (field: 'dietaryRestrictions' | 'cuisinePreferences' | 'allergies', item: string) => {
    const current = (preferences[field] || []) as string[];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    onUpdate({ ...preferences, [field]: updated });
  };

  const toggleMealType = (meal: MealType) => {
    const current = preferences.includedMeals || ['breakfast', 'lunch', 'dinner'];
    const updated = current.includes(meal)
      ? current.filter(m => m !== meal)
      : [...current, meal];
    if (updated.length === 0) return; // Must include at least one
    onUpdate({ ...preferences, includedMeals: updated as MealType[] });
  };

  const canProceed = preferences.name && preferences.name.length > 0;

  return (
    <div className="space-y-6">
      {/* Load existing profile */}
      {savedProfiles.length > 0 && (
        <Card>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Load saved preference profile
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => handleLoadProfile(e.target.value)}
            className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
          >
            <option value="">Create new profile</option>
            {savedProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Card>
      )}

      {/* Profile name */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Profile name *
        </label>
        <input
          type="text"
          value={preferences.name || ''}
          onChange={(e) => onUpdate({ ...preferences, name: e.target.value })}
          placeholder="e.g., Paris's weight loss plan"
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
        />
      </Card>

      {/* Recipe source mode */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Recipe source
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onUpdate({ ...preferences, recipeSource: 'library_only' })}
            className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
              preferences.recipeSource === 'library_only'
                ? 'border-purple-500 bg-purple-50'
                : 'border-border-default hover:border-purple-300'
            }`}
          >
            <div className="font-medium text-text-primary">Library only</div>
            <div className="text-sm text-text-secondary mt-1">Use only your existing recipes</div>
          </button>
          <button
            onClick={() => onUpdate({ ...preferences, recipeSource: 'library_and_ai' })}
            className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
              preferences.recipeSource === 'library_and_ai'
                ? 'border-purple-500 bg-purple-50'
                : 'border-border-default hover:border-purple-300'
            }`}
          >
            <div className="font-medium text-text-primary">Library + AI</div>
            <div className="text-sm text-text-secondary mt-1">Your recipes plus AI-created dishes from world cuisines</div>
          </button>
        </div>
      </Card>

      {/* Meal types */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Meals to include
        </label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(m => (
            <button
              key={m.value}
              onClick={() => toggleMealType(m.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                (preferences.includedMeals || []).includes(m.value)
                  ? 'bg-purple-500 text-white'
                  : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Dietary restrictions */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Dietary restrictions
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleArrayItem('dietaryRestrictions', opt)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                (preferences.dietaryRestrictions || []).includes(opt)
                  ? 'bg-green-500 text-white'
                  : 'bg-surface-alt text-text-secondary hover:bg-green-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Allergies */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Allergies
        </label>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleArrayItem('allergies', opt)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                (preferences.allergies || []).includes(opt)
                  ? 'bg-red-500 text-white'
                  : 'bg-surface-alt text-text-secondary hover:bg-red-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Cuisine preferences */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Preferred cuisines
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleArrayItem('cuisinePreferences', opt)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                (preferences.cuisinePreferences || []).includes(opt)
                  ? 'bg-purple-500 text-white'
                  : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Ingredient preferences */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Ingredient preferences (more of)
        </label>
        <textarea
          value={preferences.ingredientLikes || ''}
          onChange={(e) => onUpdate({ ...preferences, ingredientLikes: e.target.value })}
          placeholder="e.g., more lentils, chickpeas, leafy greens, olive oil"
          rows={2}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface mb-4"
        />
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Ingredient preferences (less or none of)
        </label>
        <textarea
          value={preferences.ingredientDislikes || ''}
          onChange={(e) => onUpdate({ ...preferences, ingredientDislikes: e.target.value })}
          placeholder="e.g., no cilantro, less red meat, avoid processed sugar"
          rows={2}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
        />
      </Card>

      {/* Batch cooking & servings */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Cooking lifestyle
        </label>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">How many days per week do you cook?</label>
            <div className="flex flex-wrap gap-2">
              {[null, 1, 2, 3, 4, 5, 6, 7].map(n => (
                <button
                  key={n ?? 'any'}
                  onClick={() => onUpdate({ ...preferences, cookDaysPerWeek: n })}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    preferences.cookDaysPerWeek === n
                      ? 'bg-purple-500 text-white'
                      : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
                  }`}
                >
                  {n === null ? 'Any' : `${n}×`}
                </button>
              ))}
            </div>
            {preferences.cookDaysPerWeek && preferences.cookDaysPerWeek < 7 && (
              <p className="text-xs text-text-muted mt-2">
                On non-cook days, the AI will plan quick meals (leftovers, salads, no-cook options).
              </p>
            )}
          </div>
          {preferences.cookDaysPerWeek && preferences.cookDaysPerWeek < 7 && (
            <div>
              <label className="text-xs text-text-muted mb-1 block">Max time for non-cook-day meals (total prep+cook minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={preferences.quickMealMaxMinutes ?? ''}
                onChange={(e) => onUpdate({ ...preferences, quickMealMaxMinutes: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 10"
                className="w-24 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-text-muted mb-1 block">Default servings per recipe</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 6].map(n => (
                <button
                  key={n}
                  onClick={() => onUpdate({ ...preferences, defaultServings: n })}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    (preferences.defaultServings || 4) === n
                      ? 'bg-purple-500 text-white'
                      : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
                  }`}
                >
                  {n} {n === 1 ? 'serving' : 'servings'}
                </button>
              ))}
            </div>
            {(preferences.defaultServings || 4) === 1 && (
              <p className="text-xs text-text-muted mt-1">Single portions — perfect for living alone.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Cooking time constraints */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Cooking time limits (minutes)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-text-muted mb-2 uppercase">Weekday</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary w-12">Prep</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.weekdayMaxPrep ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, weekdayMaxPrep: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary w-12">Cook</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.weekdayMaxCook ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, weekdayMaxCook: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted mb-2 uppercase">Weekend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary w-12">Prep</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.weekendMaxPrep ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, weekendMaxPrep: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary w-12">Cook</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.weekendMaxCook ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, weekendMaxCook: e.target.value ? Number(e.target.value) : null })}
                  placeholder="—"
                  className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleSaveProfile}
          disabled={!preferences.name || createPref.isPending || updatePref.isPending}
        >
          <Save className="w-4 h-4 mr-1.5" />
          {selectedProfileId ? 'Update Profile' : 'Save Profile'}
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canProceed}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next: Targets
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
