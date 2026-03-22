import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Collapsible } from '../components/ui';
import {
  usePreference,
  usePreferences,
  useCreatePreference,
  useUpdatePreference,
} from '../hooks/useMealPlanPreferences';
import { useCollections } from '../hooks/useCollections';
import {
  DietaryRestrictionsSelector,
  AllergiesSelector,
  CuisineSelector,
  IngredientPreferencesFields,
  CookingMethodSelector,
  SeasonSelector,
} from '../components/ai-shared';
import type { CreatePreferenceInput, MealType } from '../types/mealPlanPreference';
import DietGoalCalculator from '../components/DietGoalCalculator';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const DURATION_PRESETS = [3, 5, 7, 14, 21];

const VARIETY_LABELS = [
  '',
  'Minimal — repeat a few dishes all week',
  'Low — some repetition, 3-5 different per meal type',
  'Moderate — balanced mix of variety and repeats',
  'High — mostly different dishes each day',
  'Maximum — every meal is unique',
];

const DEFAULT_FORM: CreatePreferenceInput = {
  name: '',
  recipeSource: 'library_and_ai',
  dietaryRestrictions: [],
  cuisinePreferences: [],
  allergies: [],
  ingredientLikes: '',
  ingredientDislikes: '',
  weekdayMaxPrep: null,
  weekdayMaxCook: null,
  weekendMaxPrep: null,
  weekendMaxCook: null,
  caloriesMin: null,
  caloriesMax: null,
  proteinPercent: null,
  carbsPercent: null,
  fatPercent: null,
  cookDaysPerWeek: null,
  cookingFreeDays: '',
  quickMealMaxMinutes: null,
  defaultServings: 4,
  numberOfPersons: 1,
  durationWeeks: 1,
  durationDays: 7,
  repeatWeekly: false,
  mealVariety: 3,
  includedMeals: ['breakfast', 'lunch', 'dinner'],
  preferredMethods: [],
  season: null,
};

export default function PreferenceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !id;

  const prefill = isNew ? (location.state as any)?.prefill as CreatePreferenceInput | undefined : undefined;

  const { data: existingPref, isLoading } = usePreference(isNew ? null : id!);
  const { data: savedProfiles = [] } = usePreferences();
  const { data: collections = [] } = useCollections('active');
  const createPref = useCreatePreference();
  const updatePref = useUpdatePreference();

  const [form, setForm] = useState<CreatePreferenceInput>(prefill ? { ...DEFAULT_FORM, ...prefill } : { ...DEFAULT_FORM });
  const [hasLoaded, setHasLoaded] = useState(!!prefill);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSection(prev => prev === key ? null : key);
  };

  useEffect(() => {
    if (existingPref && !hasLoaded) {
      setForm({
        name: existingPref.name,
        recipeSource: existingPref.recipeSource,
        sourceCollectionId: existingPref.sourceCollectionId,
        dietaryRestrictions: existingPref.dietaryRestrictions,
        cuisinePreferences: existingPref.cuisinePreferences,
        allergies: existingPref.allergies,
        ingredientLikes: existingPref.ingredientLikes,
        ingredientDislikes: existingPref.ingredientDislikes,
        weekdayMaxPrep: existingPref.weekdayMaxPrep,
        weekdayMaxCook: existingPref.weekdayMaxCook,
        weekendMaxPrep: existingPref.weekendMaxPrep,
        weekendMaxCook: existingPref.weekendMaxCook,
        caloriesMin: existingPref.caloriesMin,
        caloriesMax: existingPref.caloriesMax,
        proteinPercent: existingPref.proteinPercent,
        carbsPercent: existingPref.carbsPercent,
        fatPercent: existingPref.fatPercent,
        cookDaysPerWeek: existingPref.cookDaysPerWeek,
        cookingFreeDays: existingPref.cookingFreeDays,
        quickMealMaxMinutes: existingPref.quickMealMaxMinutes,
        defaultServings: existingPref.defaultServings,
        numberOfPersons: existingPref.numberOfPersons,
        durationWeeks: existingPref.durationWeeks,
        durationDays: existingPref.durationDays,
        repeatWeekly: existingPref.repeatWeekly,
        mealVariety: existingPref.mealVariety,
        includedMeals: existingPref.includedMeals,
        preferredMethods: existingPref.preferredMethods,
        season: existingPref.season ?? null,
      });
      setHasLoaded(true);
    }
  }, [existingPref, hasLoaded]);

  const update = (partial: Partial<CreatePreferenceInput>) => {
    setForm(prev => ({ ...prev, ...partial }));
  };

  const handleLoadFromProfile = (profileId: string) => {
    if (!profileId) return;
    const profile = savedProfiles.find(p => p.id === profileId);
    if (!profile) return;
    setForm({
      name: form.name || `${profile.name} (copy)`,
      recipeSource: profile.recipeSource,
      sourceCollectionId: profile.sourceCollectionId,
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
      cookingFreeDays: profile.cookingFreeDays,
      quickMealMaxMinutes: profile.quickMealMaxMinutes,
      defaultServings: profile.defaultServings,
      numberOfPersons: profile.numberOfPersons,
      durationWeeks: profile.durationWeeks,
      durationDays: profile.durationDays,
      repeatWeekly: profile.repeatWeekly,
      mealVariety: profile.mealVariety,
      includedMeals: profile.includedMeals,
      preferredMethods: profile.preferredMethods,
      season: profile.season ?? null,
    });
  };

  const toggleMealType = (meal: MealType) => {
    const current = form.includedMeals || ['breakfast', 'lunch', 'dinner'];
    const updated = current.includes(meal)
      ? current.filter(m => m !== meal)
      : [...current, meal];
    if (updated.length === 0) return;
    update({ includedMeals: updated as MealType[] });
  };

  const days = form.durationDays || (form.durationWeeks || 1) * 7;
  const macroTotal = (form.proteinPercent || 0) + (form.carbsPercent || 0) + (form.fatPercent || 0);
  const macroValid = macroTotal === 0 || macroTotal === 100;
  const canSave = form.name && form.name.length > 0 && macroValid;
  const isSaving = createPref.isPending || updatePref.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      if (isNew) {
        await createPref.mutateAsync(form);
      } else {
        await updatePref.mutateAsync({ id: id!, input: form });
      }
      navigate('/preferences');
    } catch {
      // Hook's onError already shows a toast
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-text-muted text-center py-12">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/preferences" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Sparkles className="w-6 h-6 text-sec-prefs" />
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          {isNew ? 'New Preference Profile' : `Edit: ${existingPref?.name || ''}`}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Profile name */}
        <div className="bg-surface rounded-lg shadow px-6 py-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Profile name *
          </label>
          <input
            type="text"
            value={form.name || ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g., Paris's weight loss plan"
            className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface text-base md:text-sm font-medium"
          />
        </div>

        {/* Start from existing profile (only when creating new) */}
        {isNew && savedProfiles.length > 0 && (
          <div className="bg-surface rounded-lg shadow px-6 py-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Start from existing profile (optional)
            </label>
            <select
              onChange={(e) => handleLoadFromProfile(e.target.value)}
              defaultValue=""
              className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
            >
              <option value="">Select a profile to copy from...</option>
              {savedProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              Loads all settings from the selected profile. You can then customize and save as a new profile.
            </p>
          </div>
        )}

        {/* Section 1: Meals & Servings */}
        <Collapsible
          title="Meals & Servings"
          subtitle={`${(form.includedMeals || ['breakfast', 'lunch', 'dinner']).length} meals, ${form.defaultServings || 4} servings${(form.numberOfPersons || 1) > 1 ? `, ${form.numberOfPersons} persons` : ''}`}
          open={openSection === 'meals'}
          onToggle={() => toggleSection('meals')}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-3 block">Meals to include</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMealType(m.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      (form.includedMeals || []).includes(m.value)
                        ? 'bg-sec-prefs text-white'
                        : 'bg-surface-alt text-text-secondary hover:bg-sec-prefs-light'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-3 block">Recipe source</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => update({ recipeSource: 'library_only', sourceCollectionId: null })}
                  className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                    form.recipeSource === 'library_only'
                      ? 'border-sec-prefs bg-sec-prefs-light'
                      : 'border-border-default hover:border-sec-prefs'
                  }`}
                >
                  <div className="font-medium text-text-primary">Library only</div>
                  <div className="text-sm text-text-secondary mt-1">Use only your existing recipes</div>
                </button>
                <button
                  type="button"
                  onClick={() => update({ recipeSource: 'library_and_ai', sourceCollectionId: null })}
                  className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                    form.recipeSource === 'library_and_ai'
                      ? 'border-sec-prefs bg-sec-prefs-light'
                      : 'border-border-default hover:border-sec-prefs'
                  }`}
                >
                  <div className="font-medium text-text-primary">Library + AI</div>
                  <div className="text-sm text-text-secondary mt-1">Your recipes plus AI-created dishes</div>
                </button>
                <button
                  type="button"
                  onClick={() => update({ recipeSource: 'collection_only' })}
                  className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                    form.recipeSource === 'collection_only'
                      ? 'border-sec-prefs bg-sec-prefs-light'
                      : 'border-border-default hover:border-sec-prefs'
                  }`}
                >
                  <div className="font-medium text-text-primary">Collection only</div>
                  <div className="text-sm text-text-secondary mt-1">Use recipes from one collection</div>
                </button>
              </div>
              {form.recipeSource === 'collection_only' && (
                <div className="mt-3">
                  <select
                    value={form.sourceCollectionId || ''}
                    onChange={(e) => update({ sourceCollectionId: e.target.value || null })}
                    className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface text-sm"
                  >
                    <option value="">Select a collection...</option>
                    {collections.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.recipeCount} recipes)</option>
                    ))}
                  </select>
                  {!form.sourceCollectionId && (
                    <p className="text-xs text-amber-600 mt-1">Please select a collection to continue.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">Default servings per recipe</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update({ defaultServings: n })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      (form.defaultServings || 4) === n
                        ? 'bg-sec-prefs text-white'
                        : 'bg-surface-alt text-text-secondary hover:bg-sec-prefs-light'
                    }`}
                  >
                    {n} {n === 1 ? 'serving' : 'servings'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">Number of persons eating</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full border border-border text-text-primary flex items-center justify-center hover:bg-surface-hover active:scale-95 disabled:opacity-40"
                  onClick={() => update({ numberOfPersons: Math.max(1, (form.numberOfPersons || 1) - 1) })}
                  disabled={(form.numberOfPersons || 1) <= 1}
                >−</button>
                <span className="text-lg font-semibold text-text-primary w-8 text-center">{form.numberOfPersons || 1}</span>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full border border-border text-text-primary flex items-center justify-center hover:bg-surface-hover active:scale-95 disabled:opacity-40"
                  onClick={() => update({ numberOfPersons: Math.min(12, (form.numberOfPersons || 1) + 1) })}
                  disabled={(form.numberOfPersons || 1) >= 12}
                >+</button>
              </div>
              <p className="text-xs text-text-muted mt-1">Nutrition summary will be shown per person</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Meal variety: {form.mealVariety || 3}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={form.mealVariety || 3}
                onChange={(e) => update({ mealVariety: Number(e.target.value) })}
                className="w-full accent-sec-prefs"
              />
              <p className="text-sm text-text-muted mt-1">
                {VARIETY_LABELS[form.mealVariety || 3]}
              </p>
            </div>
          </div>
        </Collapsible>

        {/* Section 2: Taste & Diet */}
        <Collapsible title="Taste & Diet" open={openSection === 'taste'} onToggle={() => toggleSection('taste')}>
          <div className="space-y-6">
            <DietaryRestrictionsSelector
              selected={form.dietaryRestrictions || []}
              onChange={(val) => update({ dietaryRestrictions: val })}
            />
            <AllergiesSelector
              selected={form.allergies || []}
              onChange={(val) => update({ allergies: val })}
            />
            <CuisineSelector
              selected={form.cuisinePreferences || []}
              onChange={(val) => update({ cuisinePreferences: val })}
            />
            <IngredientPreferencesFields
              likes={form.ingredientLikes || ''}
              dislikes={form.ingredientDislikes || ''}
              onLikesChange={(val) => update({ ingredientLikes: val })}
              onDislikesChange={(val) => update({ ingredientDislikes: val })}
            />
            <CookingMethodSelector
              selected={form.preferredMethods || []}
              onChange={(val) => update({ preferredMethods: val })}
            />
            <SeasonSelector
              selected={form.season ?? null}
              onChange={(val) => update({ season: val })}
            />
          </div>
        </Collapsible>

        {/* Section 3: Cooking Time Limits */}
        <Collapsible title="Cooking Time Limits" subtitle="optional" open={openSection === 'time'} onToggle={() => toggleSection('time')}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-text-muted mb-2 uppercase">Weekday</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary w-12">Prep</label>
                  <input
                    type="number"
                    min="0"
                    value={form.weekdayMaxPrep ?? ''}
                    onChange={(e) => update({ weekdayMaxPrep: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary w-12">Cook</label>
                  <input
                    type="number"
                    min="0"
                    value={form.weekdayMaxCook ?? ''}
                    onChange={(e) => update({ weekdayMaxCook: e.target.value ? Number(e.target.value) : null })}
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
                    value={form.weekendMaxPrep ?? ''}
                    onChange={(e) => update({ weekendMaxPrep: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary w-12">Cook</label>
                  <input
                    type="number"
                    min="0"
                    value={form.weekendMaxCook ?? ''}
                    onChange={(e) => update({ weekendMaxCook: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-20 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">Time in minutes. Leave blank for no limit.</p>
        </Collapsible>

        {/* Section 4: Nutrition Targets */}
        <Collapsible title="Nutrition Targets" subtitle="optional" open={openSection === 'nutrition'} onToggle={() => toggleSection('nutrition')}>
          <div className="space-y-4">
            <DietGoalCalculator
              onApply={(calories, protein, carbs, fat) => {
                update({ caloriesMin: calories, caloriesMax: calories, proteinPercent: protein, carbsPercent: carbs, fatPercent: fat });
              }}
              onApplyWithPersons={(calories, protein, carbs, fat, persons) => {
                update({ caloriesMin: calories, caloriesMax: calories, proteinPercent: protein, carbsPercent: carbs, fatPercent: fat, numberOfPersons: persons });
              }}
            />
            <div>
              <label className="text-sm font-medium text-text-secondary mb-3 block">Daily calorie target</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="800"
                  max="5000"
                  step="50"
                  value={form.caloriesMin ?? ''}
                  onChange={(e) => update({ caloriesMin: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Min"
                  className="w-28 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
                />
                <span className="text-text-muted">to</span>
                <input
                  type="number"
                  min="800"
                  max="5000"
                  step="50"
                  value={form.caloriesMax ?? ''}
                  onChange={(e) => update({ caloriesMax: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Max"
                  className="w-28 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
                />
                <span className="text-sm text-text-muted">kcal/day</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-3 block">Macro split (must sum to 100%)</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Protein %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.proteinPercent ?? ''}
                    onChange={(e) => update({ proteinPercent: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Carbs %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.carbsPercent ?? ''}
                    onChange={(e) => update({ carbsPercent: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Fat %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.fatPercent ?? ''}
                    onChange={(e) => update({ fatPercent: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
                  />
                </div>
              </div>
              {macroTotal > 0 && (
                <p className={`text-sm mt-2 ${macroValid ? 'text-green-600' : 'text-red-500'}`}>
                  Total: {macroTotal}% {macroValid ? '✓' : '(must equal 100%)'}
                </p>
              )}
            </div>
          </div>
        </Collapsible>

        {/* Section 5: Plan Defaults */}
        <Collapsible title="Plan Defaults" subtitle="optional" open={openSection === 'defaults'} onToggle={() => toggleSection('defaults')}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Default duration (days)</label>
              <input
                type="number"
                min="1"
                max="28"
                value={days}
                onChange={(e) => {
                  const d = Math.max(1, Math.min(28, Number(e.target.value) || 1));
                  update({ durationDays: d, durationWeeks: Math.ceil(d / 7) });
                }}
                className="w-24 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
              <div className="flex gap-2 mt-2">
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update({ durationDays: d, durationWeeks: Math.ceil(d / 7) })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      days === d
                        ? 'bg-sec-prefs text-white'
                        : 'bg-surface-alt text-text-secondary hover:bg-sec-prefs-light'
                    }`}
                  >
                    {d}d{d === 7 ? ' (1w)' : d === 14 ? ' (2w)' : d === 21 ? ' (3w)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {days >= 7 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.repeatWeekly || false}
                  onChange={(e) => update({ repeatWeekly: e.target.checked })}
                  className="rounded border-border-default"
                />
                <span className="text-sm text-text-secondary">Repeat weekly (design 7 days, repeat for duration)</span>
              </label>
            )}

            <div>
              <label className="text-xs text-text-muted mb-1 block">Quick meal max time (minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={form.quickMealMaxMinutes ?? ''}
                onChange={(e) => update({ quickMealMaxMinutes: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 10"
                className="w-24 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
              />
              <p className="text-xs text-text-muted mt-1">Max time for cooking-free day meals.</p>
            </div>
          </div>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <Link to="/preferences">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Profiles
            </Button>
          </Link>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {isNew ? 'Create Profile' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
