import { useState } from 'react';
import { Button, Card } from '../ui';
import { useCreateMealPlan, useAddRecipeToMealPlan } from '../../hooks/useMealPlans';
import type { GeneratedPlan, AIRecipeEntry } from '../../types/mealPlanPreference';
import { ChevronLeft, Loader2, CheckCircle, CalendarDays, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

function safeFormatDate(dateStr: string, pattern: string): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, pattern) : dateStr;
  } catch {
    return dateStr;
  }
}

interface Props {
  plan: GeneratedPlan;
  planDescription: string;
  recipeQueue: AIRecipeEntry[];
  createdRecipeIds: Record<string, string>;
  startDate: string;
  endDate: string;
  onBack: () => void;
  onComplete: (mealPlanId: string) => void;
}

export default function StepConfirmation({
  plan, planDescription, recipeQueue,
  startDate: startDateProp, endDate: endDateProp,
  onBack, onComplete,
}: Props) {
  const createMealPlan = useCreateMealPlan();
  const addRecipe = useAddRecipeToMealPlan();
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);

  // Derive dates from plan days if props are empty (safety net)
  const startDate = startDateProp || plan.days[0]?.date || new Date().toISOString().slice(0, 10);
  const endDate = endDateProp || plan.days[plan.days.length - 1]?.date || startDate;

  // Count meals that will be included
  const skippedTitles = new Set(
    recipeQueue.filter(r => r.status === 'skipped').map(r => r.title)
  );
  let totalMeals = 0;
  let skippedMeals = 0;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      totalMeals++;
      if (meal.newRecipeTitle && skippedTitles.has(meal.newRecipeTitle)) {
        skippedMeals++;
      }
    }
  }
  const includedMeals = totalMeals - skippedMeals;

  // Map new recipe tempKeys to created recipe IDs
  const titleToRecipeId = new Map<string, string>();
  for (const entry of recipeQueue) {
    if (entry.status === 'created' && entry.createdRecipeId) {
      titleToRecipeId.set(entry.title, entry.createdRecipeId);
    }
  }

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // 1. Create the meal plan
      const mealPlan = await createMealPlan.mutateAsync({
        name: planDescription || `AI Meal Plan - ${safeFormatDate(startDate, 'MMM d')} to ${safeFormatDate(endDate, 'MMM d')}`,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      // 2. Add each meal to the plan (continue on individual failures)
      let addedCount = 0;
      let failedCount = 0;
      for (const day of plan.days) {
        for (const meal of day.meals) {
          // Skip meals whose new recipes were skipped/removed
          if (meal.newRecipeTitle && skippedTitles.has(meal.newRecipeTitle)) {
            continue;
          }

          // Resolve recipe ID
          let recipeId: string | undefined;
          if (meal.existingRecipeId) {
            recipeId = meal.existingRecipeId;
          } else if (meal.newRecipeTitle) {
            recipeId = titleToRecipeId.get(meal.newRecipeTitle);
          }

          if (!recipeId) {
            console.warn(`Could not resolve recipe ID for: ${meal.existingRecipeTitle || meal.newRecipeTitle}`);
            failedCount++;
            continue;
          }

          try {
            await addRecipe.mutateAsync({
              mealPlanId: mealPlan.id,
              input: {
                recipeId,
                date: new Date(day.date).toISOString(),
                mealType: meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
                servings: 1,
              },
            });
            addedCount++;
          } catch (err) {
            console.warn(`Failed to add meal (${meal.existingRecipeTitle || meal.newRecipeTitle}):`, err);
            failedCount++;
          }
        }
      }

      setMealPlanId(mealPlan.id);
      setCreated(true);
      if (failedCount > 0) {
        toast.success(`Meal plan created with ${addedCount} meals (${failedCount} could not be added)`);
      } else {
        toast.success(`Meal plan created with ${addedCount} meals!`);
      }

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        onComplete(mealPlan.id);
      }, 3000);
    } catch (error) {
      toast.error('Failed to create meal plan');
      setIsCreating(false);
    }
  };

  if (created && mealPlanId) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Meal Plan Created!</h2>
        <p className="text-text-secondary mb-6">{planDescription}</p>
        <p className="text-sm text-text-muted mb-4">Redirecting to your meal plan...</p>
        <Button
          variant="primary"
          onClick={() => onComplete(mealPlanId)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <CalendarDays className="w-4 h-4 mr-1.5" />
          View Meal Plan Now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Ready to create your meal plan
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Name</span>
            <span className="text-text-primary font-medium">{planDescription || 'AI Meal Plan'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Date range</span>
            <span className="text-text-primary">
              {safeFormatDate(startDate, 'MMM d')} — {safeFormatDate(endDate, 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Total meals</span>
            <span className="text-text-primary">{includedMeals}</span>
          </div>
          {skippedMeals > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Skipped meals</span>
              <span className="text-text-muted">{skippedMeals}</span>
            </div>
          )}
          {recipeQueue.filter(r => r.status === 'created').length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">New recipes created</span>
              <span className="text-purple-600 font-medium">
                {recipeQueue.filter(r => r.status === 'created').length}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Warning if all meals were removed */}
      {includedMeals === 0 && (
        <Card>
          <div className="flex items-start gap-3 text-amber-600">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No meals to include</p>
              <p className="text-sm text-text-secondary mt-1">
                All recipes were removed. Go back to replace them with recipes from your library, or create the AI-suggested recipes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isCreating}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={isCreating || includedMeals === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Create Meal Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
