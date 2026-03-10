import { useState } from 'react';
import { Button, Card } from '../ui';
import { useGenerateMealPlan } from '../../hooks/useAIMealPlan';
import { useCreatePreference, useUpdatePreference } from '../../hooks/useMealPlanPreferences';
import type { CreatePreferenceInput, GeneratedPlan, PinnedMeal, MealType } from '../../types/mealPlanPreference';
import RecipePicker from '../RecipePicker';
import type { Recipe } from '../../types/recipe';
import { ChevronLeft, Loader2, Sparkles, Plus, X, Pin } from 'lucide-react';
import { format, addDays } from 'date-fns';

const VARIETY_LABELS = [
  '', // unused index 0
  'Minimal — repeat a few dishes all week',
  'Low — some repetition, 3-5 different per meal type',
  'Moderate — balanced mix of variety and repeats',
  'High — mostly different dishes each day',
  'Maximum — every meal is unique',
];

const DURATION_PRESETS = [3, 5, 7, 14, 21];

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', color: 'bg-amber-100 text-amber-800' },
  { value: 'lunch', label: 'Lunch', color: 'bg-green-100 text-green-800' },
  { value: 'dinner', label: 'Dinner', color: 'bg-blue-100 text-blue-800' },
  { value: 'snack', label: 'Snack', color: 'bg-purple-100 text-purple-800' },
];

interface Props {
  preferences: CreatePreferenceInput;
  startDate: string;
  endDate: string;
  pinnedMeals: PinnedMeal[];
  onUpdate: (prefs: CreatePreferenceInput) => void;
  onDatesChange: (start: string, end: string) => void;
  onPinnedMealsChange: (pins: PinnedMeal[]) => void;
  onBack: () => void;
  onGenerate: (plan: GeneratedPlan) => void;
  preferenceId: string | null;
  onPreferenceIdChange: (id: string) => void;
}

export default function StepNutrition({ preferences, startDate, endDate, pinnedMeals, onUpdate, onDatesChange, onPinnedMealsChange, onBack, onGenerate, preferenceId, onPreferenceIdChange }: Props) {
  const generatePlan = useGenerateMealPlan();
  const createPref = useCreatePreference();
  const updatePref = useUpdatePreference();

  // Recipe picker state for pinned meals
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ recipe: Recipe; mealType: MealType; count: number } | null>(null);

  // Default start date to today if not set
  const effectiveStartDate = startDate || format(new Date(), 'yyyy-MM-dd');
  // Use durationDays if set, otherwise fall back to durationWeeks * 7
  const days = preferences.durationDays || (preferences.durationWeeks || 1) * 7;
  const effectiveEndDate = endDate || format(addDays(new Date(effectiveStartDate), days - 1), 'yyyy-MM-dd');

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

  const handleRecipeSelected = (recipe: Recipe) => {
    setShowRecipePicker(false);
    // Default to lunch, count 1
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

  const handleGenerate = async () => {
    // 1. Save or update preferences
    let prefId = preferenceId;
    if (!prefId) {
      try {
        const created = await createPref.mutateAsync(preferences);
        prefId = created.id;
        // Propagate the new ID back to wizard state so subsequent calls update instead of creating duplicates
        onPreferenceIdChange(prefId);
      } catch {
        return;
      }
    } else {
      // Update the existing profile with latest values
      try {
        await updatePref.mutateAsync({ id: prefId, input: preferences });
      } catch { /* non-critical */ }
    }

    // 2. Persist effective dates to wizard state (they may still be defaults)
    onDatesChange(effectiveStartDate, effectiveEndDate);

    // 3. Generate the meal plan via AI
    try {
      const plan = await generatePlan.mutateAsync({
        preferenceId: prefId,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        pinnedMeals,
      });
      onGenerate(plan);
    } catch {
      // Hook's onError already shows a toast, but ensure user knows plan wasn't generated
    }
  };

  const macroTotal = (preferences.proteinPercent || 0) + (preferences.carbsPercent || 0) + (preferences.fatPercent || 0);
  const macroValid = macroTotal === 0 || macroTotal === 100;

  // Validate pinned meals don't exceed available slots
  const totalPinnedSlots = pinnedMeals.reduce((sum, p) => sum + p.count, 0);
  const includedMeals = preferences.includedMeals || ['breakfast', 'lunch', 'dinner'];
  const totalAvailableSlots = days * includedMeals.length;
  const pinOverflow = totalPinnedSlots > totalAvailableSlots;

  return (
    <div className="space-y-6">
      {/* Date range & duration */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Plan dates
        </label>
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

        {/* Quick duration presets */}
        <div className="flex gap-2 mt-3">
          {DURATION_PRESETS.map(d => (
            <button
              key={d}
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

        <p className="text-sm text-text-muted mt-2">
          {effectiveStartDate} to {effectiveEndDate} ({days} day{days !== 1 ? 's' : ''})
        </p>

        {/* Repeat weekly toggle — only shown for 7+ days */}
        {days >= 7 && (
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.repeatWeekly || false}
              onChange={(e) => onUpdate({ ...preferences, repeatWeekly: e.target.checked })}
              className="rounded border-border-default"
            />
            <span className="text-sm text-text-secondary">Repeat weekly (design 7 days, repeat for duration)</span>
          </label>
        )}
      </Card>

      {/* Pre-assigned meals (pinned recipes) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-purple-500" />
            <label className="text-sm font-medium text-text-secondary">
              Pre-assign meals (optional)
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRecipePicker(true)}
            className="text-purple-600 hover:bg-purple-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add recipe
          </Button>
        </div>
        <p className="text-xs text-text-muted mb-3">
          Choose recipes from your library that must be included in the plan. The AI will fill the remaining slots.
        </p>

        {/* Pinned meals list */}
        {pinnedMeals.length > 0 && (
          <div className="space-y-2 mb-3">
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
          <p className="text-xs text-red-500 mt-1">
            Too many pinned meals ({totalPinnedSlots}) for {days} days × {includedMeals.length} meals ({totalAvailableSlots} total slots).
          </p>
        )}

        {pinnedMeals.length === 0 && (
          <div className="text-center py-4 text-text-muted text-sm border border-dashed border-border-default rounded-lg">
            No pre-assigned meals. The AI will choose all meals.
          </div>
        )}
      </Card>

      {/* Pending pin configuration modal */}
      {pendingPin && (
        <Card className="border-purple-200 bg-purple-50/50">
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
        </Card>
      )}

      {/* Calorie targets */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Daily calorie target (optional)
        </label>
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
      </Card>

      {/* Macro split */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Macro split (optional, must sum to 100%)
        </label>
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
      </Card>

      {/* Meal variety */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
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
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generatePlan.isPending || (!macroValid && macroTotal > 0) || pinOverflow}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {generatePlan.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate Plan
            </>
          )}
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
