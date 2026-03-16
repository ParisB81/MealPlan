import { useState } from 'react';
import { Button, Collapsible } from '../ui';
import { useGenerateMealPlan } from '../../hooks/useAIMealPlan';
import { useCreatePreference, useUpdatePreference } from '../../hooks/useMealPlanPreferences';
import {
  DietaryRestrictionsSelector,
  AllergiesSelector,
  CuisineSelector,
  IngredientPreferencesFields,
  CookingMethodSelector,
  SeasonSelector,
} from '../ai-shared';
import type { CreatePreferenceInput, GeneratedPlan, PinnedMeal } from '../../types/mealPlanPreference';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Props {
  preferences: CreatePreferenceInput;
  startDate: string;
  endDate: string;
  pinnedMeals: PinnedMeal[];
  onUpdate: (prefs: CreatePreferenceInput) => void;
  onDatesChange: (start: string, end: string) => void;
  onBack: () => void;
  onGenerate: (plan: GeneratedPlan) => void;
  preferenceId: string | null;
  onPreferenceIdChange: (id: string) => void;
}

export default function StepTasteDiet({
  preferences,
  startDate,
  endDate,
  pinnedMeals,
  onUpdate,
  onDatesChange,
  onBack,
  onGenerate,
  preferenceId,
  onPreferenceIdChange,
}: Props) {
  const generatePlan = useGenerateMealPlan();
  const createPref = useCreatePreference();
  const updatePref = useUpdatePreference();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSection(prev => prev === key ? null : key);
  };

  // Compute effective dates (same logic as StepPlanSetup)
  const days = preferences.durationDays || (preferences.durationWeeks || 1) * 7;
  const effectiveStartDate = startDate || format(new Date(), 'yyyy-MM-dd');
  const effectiveEndDate = endDate || format(addDays(new Date(effectiveStartDate), days - 1), 'yyyy-MM-dd');

  const macroTotal = (preferences.proteinPercent || 0) + (preferences.carbsPercent || 0) + (preferences.fatPercent || 0);
  const macroValid = macroTotal === 0 || macroTotal === 100;

  const includedMeals = preferences.includedMeals || ['breakfast', 'lunch', 'dinner'];
  const totalPinnedSlots = pinnedMeals.reduce((sum, p) => sum + p.count, 0);
  const totalAvailableSlots = days * includedMeals.length;
  const pinOverflow = totalPinnedSlots > totalAvailableSlots;

  const handleGenerate = async () => {
    // 1. Save or update preferences
    let prefId = preferenceId;
    if (!prefId) {
      try {
        const created = await createPref.mutateAsync(preferences);
        prefId = created.id;
        onPreferenceIdChange(prefId);
      } catch {
        return;
      }
    } else {
      try {
        await updatePref.mutateAsync({ id: prefId, input: preferences });
      } catch { /* non-critical */ }
    }

    // 2. Persist effective dates to wizard state
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
      // Hook's onError already shows a toast
    }
  };

  return (
    <div className="space-y-4">
      {/* Dietary Restrictions & Allergies */}
      <Collapsible
        title="Dietary Restrictions & Allergies"
        subtitle="optional"
        open={openSection === 'dietary'}
        onToggle={() => toggleSection('dietary')}
      >
        <div className="space-y-6">
          <DietaryRestrictionsSelector
            selected={preferences.dietaryRestrictions || []}
            onChange={(val) => onUpdate({ ...preferences, dietaryRestrictions: val })}
          />
          <AllergiesSelector
            selected={preferences.allergies || []}
            onChange={(val) => onUpdate({ ...preferences, allergies: val })}
          />
        </div>
      </Collapsible>

      {/* Cuisine preferences & Season */}
      <Collapsible
        title="Cuisine & Season"
        subtitle={(preferences.cuisinePreferences || []).length > 0 ? `${(preferences.cuisinePreferences || []).length} cuisines${preferences.season ? `, ${preferences.season}` : ''}` : preferences.season || 'optional'}
        open={openSection === 'cuisines'}
        onToggle={() => toggleSection('cuisines')}
      >
        <div className="space-y-6">
          <CuisineSelector
            selected={preferences.cuisinePreferences || []}
            onChange={(val) => onUpdate({ ...preferences, cuisinePreferences: val })}
          />
          <SeasonSelector
            selected={preferences.season ?? null}
            onChange={(val) => onUpdate({ ...preferences, season: val })}
          />
        </div>
      </Collapsible>

      {/* Ingredient preferences */}
      <Collapsible
        title="Ingredient Preferences"
        subtitle="optional"
        open={openSection === 'ingredients'}
        onToggle={() => toggleSection('ingredients')}
      >
        <IngredientPreferencesFields
          likes={preferences.ingredientLikes || ''}
          dislikes={preferences.ingredientDislikes || ''}
          onLikesChange={(val) => onUpdate({ ...preferences, ingredientLikes: val })}
          onDislikesChange={(val) => onUpdate({ ...preferences, ingredientDislikes: val })}
        />
      </Collapsible>

      {/* Preferred cooking methods */}
      <Collapsible
        title="Cooking Methods"
        subtitle={(preferences.preferredMethods || []).length > 0 ? `${(preferences.preferredMethods || []).length} selected` : 'optional'}
        open={openSection === 'methods'}
        onToggle={() => toggleSection('methods')}
      >
        <CookingMethodSelector
          selected={preferences.preferredMethods || []}
          onChange={(val) => onUpdate({ ...preferences, preferredMethods: val })}
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
          onClick={handleGenerate}
          disabled={generatePlan.isPending || (!macroValid && macroTotal > 0) || pinOverflow || (preferences.recipeSource === 'collection_only' && !preferences.sourceCollectionId)}
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
    </div>
  );
}
