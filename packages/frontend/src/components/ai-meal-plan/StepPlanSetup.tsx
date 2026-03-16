import { useState } from 'react';
import { Button, Collapsible } from '../ui';
import { usePreferences, useCreatePreference, useUpdatePreference } from '../../hooks/useMealPlanPreferences';
import { useCollections } from '../../hooks/useCollections';
import { CookingFreeDaysPicker } from '../ai-shared';
import RecipePicker from '../RecipePicker';
import type { CreatePreferenceInput, MealType, PinnedMeal } from '../../types/mealPlanPreference';
import type { Recipe } from '../../types/recipe';
import { Save, ChevronRight, Plus, X, Pin } from 'lucide-react';
import { format, addDays } from 'date-fns';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', color: 'bg-amber-100 text-amber-800' },
  { value: 'lunch', label: 'Lunch', color: 'bg-green-100 text-green-800' },
  { value: 'dinner', label: 'Dinner', color: 'bg-blue-100 text-blue-800' },
  { value: 'snack', label: 'Snack', color: 'bg-purple-100 text-purple-800' },
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

interface Props {
  preferences: CreatePreferenceInput;
  preferenceId: string | null;
  startDate: string;
  endDate: string;
  pinnedMeals: PinnedMeal[];
  onUpdate: (prefs: CreatePreferenceInput) => void;
  onPreferenceIdChange: (id: string | null) => void;
  onDatesChange: (start: string, end: string) => void;
  onPinnedMealsChange: (pins: PinnedMeal[]) => void;
  onNext: () => void;
}

export default function StepPlanSetup({
  preferences,
  preferenceId,
  startDate,
  endDate,
  pinnedMeals,
  onUpdate,
  onPreferenceIdChange,
  onDatesChange,
  onPinnedMealsChange,
  onNext,
}: Props) {
  const { data: savedProfiles = [] } = usePreferences();
  const { data: collections = [] } = useCollections('active');
  const createPref = useCreatePreference();
  const updatePref = useUpdatePreference();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(preferenceId || '');
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSection(prev => prev === key ? null : key);
  };

  // Recipe picker for pinned meals
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ recipe: Recipe; mealType: MealType; count: number } | null>(null);

  // Computed dates
  const days = preferences.durationDays || (preferences.durationWeeks || 1) * 7;
  const effectiveStartDate = startDate || format(new Date(), 'yyyy-MM-dd');
  const effectiveEndDate = endDate || format(addDays(new Date(effectiveStartDate), days - 1), 'yyyy-MM-dd');
  const includedMeals = preferences.includedMeals || ['breakfast', 'lunch', 'dinner'];

  // Cooking-free days (parsed from comma-separated string)
  const cookingFreeDaysList = (preferences.cookingFreeDays || '').split(',').filter(d => d.trim());

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
        durationWeeks: profile.durationWeeks,
        durationDays: profile.durationDays,
        repeatWeekly: profile.repeatWeekly,
        mealVariety: profile.mealVariety,
        includedMeals: profile.includedMeals,
        preferredMethods: profile.preferredMethods,
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

  const handleStartDateChange = (date: string) => {
    const end = format(addDays(new Date(date), days - 1), 'yyyy-MM-dd');
    onDatesChange(date, end);
  };

  const handleDurationDaysChange = (newDays: number) => {
    onUpdate({ ...preferences, durationDays: newDays, durationWeeks: Math.ceil(newDays / 7) });
    const start = effectiveStartDate;
    const end = format(addDays(new Date(start), newDays - 1), 'yyyy-MM-dd');
    onDatesChange(start, end);
  };

  const toggleMealType = (meal: MealType) => {
    const current = preferences.includedMeals || ['breakfast', 'lunch', 'dinner'];
    const updated = current.includes(meal)
      ? current.filter(m => m !== meal)
      : [...current, meal];
    if (updated.length === 0) return;
    onUpdate({ ...preferences, includedMeals: updated as MealType[] });
  };

  // Pinned meal handlers
  const handleRecipeSelected = (recipe: Recipe) => {
    setShowRecipePicker(false);
    setPendingPin({ recipe, mealType: 'lunch', count: 1 });
  };

  const handleConfirmPin = () => {
    if (!pendingPin) return;
    const newPin: PinnedMeal = {
      recipeId: pendingPin.recipe.id,
      recipeTitle: pendingPin.recipe.title,
      mealType: pendingPin.mealType,
      count: pendingPin.count,
    };
    onPinnedMealsChange([...pinnedMeals, newPin]);
    setPendingPin(null);
  };

  const handleRemovePin = (index: number) => {
    onPinnedMealsChange(pinnedMeals.filter((_, i) => i !== index));
  };

  // Validation
  const totalPinnedSlots = pinnedMeals.reduce((sum, p) => sum + p.count, 0);
  const totalAvailableSlots = days * includedMeals.length;
  const pinOverflow = totalPinnedSlots > totalAvailableSlots;
  const macroTotal = (preferences.proteinPercent || 0) + (preferences.carbsPercent || 0) + (preferences.fatPercent || 0);
  const macroValid = macroTotal === 0 || macroTotal === 100;
  const canProceed = preferences.name && preferences.name.length > 0;

  return (
    <div className="space-y-4">
      {/* Load existing profile */}
      {savedProfiles.length > 0 && (
        <div className="bg-surface rounded-lg shadow px-6 py-4">
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
        </div>
      )}

      {/* Profile name */}
      <div className="bg-surface rounded-lg shadow px-6 py-4">
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
      </div>

      {/* Section 1: Plan Dates & Duration */}
      <Collapsible title="Plan Dates" subtitle={effectiveStartDate ? `${days}d from ${effectiveStartDate}` : ''} open={openSection === 'dates'} onToggle={() => toggleSection('dates')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Start date</label>
              <input
                type="date"
                value={effectiveStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Duration (days)</label>
              <input
                type="number"
                min="1"
                max="28"
                value={days}
                onChange={(e) => handleDurationDaysChange(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {DURATION_PRESETS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleDurationDaysChange(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  days === d
                    ? 'bg-purple-500 text-white'
                    : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
                }`}
              >
                {d}d{d === 7 ? ' (1w)' : d === 14 ? ' (2w)' : d === 21 ? ' (3w)' : ''}
              </button>
            ))}
          </div>
          <p className="text-sm text-text-muted">
            {effectiveStartDate} to {effectiveEndDate} ({days} day{days !== 1 ? 's' : ''})
          </p>
          {days >= 7 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.repeatWeekly || false}
                onChange={(e) => onUpdate({ ...preferences, repeatWeekly: e.target.checked })}
                className="rounded border-border-default"
              />
              <span className="text-sm text-text-secondary">Repeat weekly (design 7 days, repeat for duration)</span>
            </label>
          )}
        </div>
      </Collapsible>

      {/* Section 2: Meals & Servings */}
      <Collapsible title="Meals & Servings" subtitle={`${includedMeals.length} meals, ${preferences.defaultServings || 4} servings`} open={openSection === 'meals'} onToggle={() => toggleSection('meals')}>
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
                    includedMeals.includes(m.value)
                      ? 'bg-purple-500 text-white'
                      : 'bg-surface-alt text-text-secondary hover:bg-purple-100'
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
                onClick={() => onUpdate({ ...preferences, recipeSource: 'library_only', sourceCollectionId: null })}
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
                type="button"
                onClick={() => onUpdate({ ...preferences, recipeSource: 'library_and_ai', sourceCollectionId: null })}
                className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                  preferences.recipeSource === 'library_and_ai'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-border-default hover:border-purple-300'
                }`}
              >
                <div className="font-medium text-text-primary">Library + AI</div>
                <div className="text-sm text-text-secondary mt-1">Your recipes plus AI-created dishes</div>
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ ...preferences, recipeSource: 'collection_only' })}
                className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                  preferences.recipeSource === 'collection_only'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-border-default hover:border-purple-300'
                }`}
              >
                <div className="font-medium text-text-primary">Collection only</div>
                <div className="text-sm text-text-secondary mt-1">Use recipes from one collection</div>
              </button>
            </div>
            {preferences.recipeSource === 'collection_only' && (
              <div className="mt-3">
                <select
                  value={preferences.sourceCollectionId || ''}
                  onChange={(e) => onUpdate({ ...preferences, sourceCollectionId: e.target.value || null })}
                  className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface text-sm"
                >
                  <option value="">Select a collection...</option>
                  {collections.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.recipeCount} recipes)</option>
                  ))}
                </select>
                {!preferences.sourceCollectionId && (
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
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Meal variety: {preferences.mealVariety || 3}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={preferences.mealVariety || 3}
              onChange={(e) => onUpdate({ ...preferences, mealVariety: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <p className="text-sm text-text-muted mt-1">
              {VARIETY_LABELS[preferences.mealVariety || 3]}
            </p>
          </div>
        </div>
      </Collapsible>

      {/* Section 3: Pinned Meals */}
      <Collapsible title="Pre-assign Meals" subtitle={pinnedMeals.length > 0 ? `${pinnedMeals.length} pinned` : 'optional'} open={openSection === 'pins'} onToggle={() => toggleSection('pins')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Choose recipes from your library that must be included. The AI will fill the remaining slots.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecipePicker(true)}
              className="text-purple-600 hover:bg-purple-50 shrink-0 ml-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {pinnedMeals.length > 0 && (
            <div className="space-y-2">
              {pinnedMeals.map((pin, i) => {
                const mealOpt = MEAL_TYPE_OPTIONS.find(m => m.value === pin.mealType);
                return (
                  <div key={`${pin.recipeId}-${pin.mealType}-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-surface-alt">
                    <Pin className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="flex-1 text-sm text-text-primary font-medium truncate">{pin.recipeTitle}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mealOpt?.color || ''}`}>
                      {mealOpt?.label || pin.mealType}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">×{pin.count}</span>
                    <button
                      onClick={() => handleRemovePin(i)}
                      className="p-1 hover:bg-red-100 rounded text-text-muted hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pinOverflow && (
            <p className="text-xs text-red-500">
              Too many pinned meals ({totalPinnedSlots}) for {days} days × {includedMeals.length} meals ({totalAvailableSlots} slots).
            </p>
          )}

          {pinnedMeals.length === 0 && (
            <div className="text-center py-4 text-text-muted text-sm border border-dashed border-border-default rounded-lg">
              No pre-assigned meals. The AI will choose all meals.
            </div>
          )}
        </div>

        {/* Pending pin configuration */}
        {pendingPin && (
          <div className="mt-4 p-4 rounded-lg border-purple-200 bg-purple-50/50 border">
            <p className="text-sm font-medium text-text-primary mb-3">
              Configure: <span className="text-purple-600">{pendingPin.recipe.title}</span>
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Meal type</label>
                <select
                  value={pendingPin.mealType}
                  onChange={(e) => setPendingPin({ ...pendingPin, mealType: e.target.value as MealType })}
                  className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface text-sm"
                >
                  {MEAL_TYPE_OPTIONS.filter(m => includedMeals.includes(m.value)).map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">How many times?</label>
                <input
                  type="number"
                  min="1"
                  max={days}
                  value={pendingPin.count}
                  onChange={(e) => setPendingPin({ ...pendingPin, count: Math.max(1, Math.min(days, Number(e.target.value) || 1)) })}
                  className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setPendingPin(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleConfirmPin} className="bg-purple-600 hover:bg-purple-700">
                <Pin className="w-3 h-3 mr-1" />
                Pin to plan
              </Button>
            </div>
          </div>
        )}
      </Collapsible>

      {/* Section 4: Cooking-Free Days */}
      <Collapsible title="Cooking Schedule" subtitle={cookingFreeDaysList.length > 0 ? `${cookingFreeDaysList.length} free days` : 'optional'} open={openSection === 'schedule'} onToggle={() => toggleSection('schedule')}>
        <div className="space-y-4">
          {effectiveStartDate && effectiveEndDate ? (
            <CookingFreeDaysPicker
              startDate={effectiveStartDate}
              endDate={effectiveEndDate}
              selectedDays={cookingFreeDaysList}
              onChange={(newDays) => onUpdate({ ...preferences, cookingFreeDays: newDays.join(',') })}
            />
          ) : (
            <p className="text-sm text-text-muted">Set plan dates above to select cooking-free days.</p>
          )}
          {cookingFreeDaysList.length > 0 && (
            <div>
              <label className="text-xs text-text-muted mb-1 block">Max time for cooking-free-day meals (minutes)</label>
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
        </div>
      </Collapsible>

      {/* Section 5: Cooking Time Limits */}
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
      </Collapsible>

      {/* Section 6: Nutrition Targets */}
      <Collapsible title="Nutrition Targets" subtitle="optional" open={openSection === 'nutrition'} onToggle={() => toggleSection('nutrition')}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-3 block">Daily calorie target</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="800"
                max="5000"
                step="50"
                value={preferences.caloriesMin ?? ''}
                onChange={(e) => onUpdate({ ...preferences, caloriesMin: e.target.value ? Number(e.target.value) : null })}
                placeholder="Min"
                className="w-28 border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
              />
              <span className="text-text-muted">to</span>
              <input
                type="number"
                min="800"
                max="5000"
                step="50"
                value={preferences.caloriesMax ?? ''}
                onChange={(e) => onUpdate({ ...preferences, caloriesMax: e.target.value ? Number(e.target.value) : null })}
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
                  value={preferences.proteinPercent ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, proteinPercent: e.target.value ? Number(e.target.value) : null })}
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
                  value={preferences.carbsPercent ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, carbsPercent: e.target.value ? Number(e.target.value) : null })}
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
                  value={preferences.fatPercent ?? ''}
                  onChange={(e) => onUpdate({ ...preferences, fatPercent: e.target.value ? Number(e.target.value) : null })}
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
          Next: Taste & Diet
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Recipe picker modal */}
      <RecipePicker
        isOpen={showRecipePicker}
        onClose={() => setShowRecipePicker(false)}
        onSelectRecipe={handleRecipeSelected}
      />
    </div>
  );
}
