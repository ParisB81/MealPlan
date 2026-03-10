import { useState, useEffect, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Button, Card } from '../components/ui';
import StepPreferences from '../components/ai-meal-plan/StepPreferences';
import StepNutrition from '../components/ai-meal-plan/StepNutrition';
import StepReviewPlan from '../components/ai-meal-plan/StepReviewPlan';
import StepCreateRecipes from '../components/ai-meal-plan/StepCreateRecipes';
import StepConfirmation from '../components/ai-meal-plan/StepConfirmation';
import type {
  CreatePreferenceInput,
  GeneratedPlan,
  AIRecipeEntry,
  MealType,
  PinnedMeal,
} from '../types/mealPlanPreference';

// Error boundary to catch render crashes and show recovery UI
class WizardErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AI Wizard crash:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <p className="text-xs text-text-muted mb-6">
              This may be caused by unexpected AI response data. Try starting over.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset();
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Start Over
            </Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

export type WizardStep = 'preferences' | 'nutrition' | 'review' | 'recipes' | 'confirmation';

const STEP_ORDER: WizardStep[] = ['preferences', 'nutrition', 'review', 'recipes', 'confirmation'];
const STEP_LABELS: Record<WizardStep, string> = {
  preferences: 'Preferences',
  nutrition: 'Targets',
  review: 'Review',
  recipes: 'Recipes',
  confirmation: 'Create',
};

const SESSION_KEY = 'ai_meal_plan_wizard_state';

interface WizardState {
  preferenceId: string | null;
  preferences: CreatePreferenceInput;
  startDate: string;
  endDate: string;
  pinnedMeals: PinnedMeal[];
  generatedPlan: GeneratedPlan | null;
  recipeQueue: AIRecipeEntry[];
  createdRecipeIds: Record<string, string>;
  planDescription: string;
}

const defaultPreferences: CreatePreferenceInput = {
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
  quickMealMaxMinutes: null,
  defaultServings: 4,
  durationWeeks: 1,
  durationDays: 7,
  repeatWeekly: false,
  mealVariety: 3,
  includedMeals: ['breakfast', 'lunch', 'dinner'] as MealType[],
};

export default function AIMealPlanWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check for returning from RecipeFormPage
  const returnedRecipeId = (location.state as any)?.createdRecipeId;
  const returnedTempKey = (location.state as any)?.tempKey;

  const [step, setStep] = useState<WizardStep>('preferences');
  const [state, setState] = useState<WizardState>(() => {
    // Try to restore from sessionStorage
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* fall through */ }
    }
    return {
      preferenceId: null,
      preferences: defaultPreferences,
      startDate: '',
      endDate: '',
      pinnedMeals: [],
      generatedPlan: null,
      recipeQueue: [],
      createdRecipeIds: {},
      planDescription: '',
    };
  });

  // Restore step from sessionStorage
  useEffect(() => {
    const savedStep = sessionStorage.getItem(SESSION_KEY + '_step');
    if (savedStep && STEP_ORDER.includes(savedStep as WizardStep)) {
      setStep(savedStep as WizardStep);
    }
  }, []);

  // Handle return from RecipeFormPage
  useEffect(() => {
    if (returnedRecipeId && returnedTempKey) {
      setState(prev => ({
        ...prev,
        recipeQueue: prev.recipeQueue.map(r =>
          r.tempKey === returnedTempKey
            ? { ...r, status: 'created' as const, createdRecipeId: returnedRecipeId }
            : r
        ),
        createdRecipeIds: {
          ...prev.createdRecipeIds,
          [returnedTempKey]: returnedRecipeId,
        },
      }));
      setStep('recipes');
      // Clear the location state to prevent re-processing
      window.history.replaceState({}, document.title);
    }
  }, [returnedRecipeId, returnedTempKey]);

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    sessionStorage.setItem(SESSION_KEY + '_step', step);
  }, [state, step]);

  // Clear sessionStorage on unmount when wizard completes
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY + '_step');
  };

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (nextStep: WizardStep) => {
    setStep(nextStep);
    window.scrollTo(0, 0);
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-7 h-7 text-purple-500" />
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          AI Meal Planner
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEP_ORDER.map((s, i) => {
          const isActive = s === step;
          const isCompleted = i < currentStepIndex;
          return (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <div className={`w-6 md:w-10 h-0.5 ${isCompleted ? 'bg-purple-500' : 'bg-border-default'}`} />
              )}
              <button
                onClick={() => i <= currentStepIndex && goToStep(s)}
                disabled={i > currentStepIndex}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive ? 'bg-purple-500 text-white' : ''}
                  ${isCompleted ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer' : ''}
                  ${!isActive && !isCompleted ? 'bg-surface-alt text-text-muted' : ''}
                `}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${isActive ? 'bg-white/20' : isCompleted ? 'bg-purple-200' : 'bg-border-default'}
                `}>
                  {isCompleted ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <WizardErrorBoundary onReset={() => {
        clearSession();
        setState({
          preferenceId: null,
          preferences: defaultPreferences,
          startDate: '',
          endDate: '',
          pinnedMeals: [],
          generatedPlan: null,
          recipeQueue: [],
          createdRecipeIds: {},
          planDescription: '',
        });
        setStep('preferences');
      }}>
      {step === 'preferences' && (
        <StepPreferences
          preferences={state.preferences}
          preferenceId={state.preferenceId}
          onUpdate={(prefs) => updateState({ preferences: prefs })}
          onPreferenceIdChange={(id) => updateState({ preferenceId: id })}
          onNext={() => goToStep('nutrition')}
        />
      )}

      {step === 'nutrition' && (
        <StepNutrition
          preferences={state.preferences}
          startDate={state.startDate}
          endDate={state.endDate}
          pinnedMeals={state.pinnedMeals}
          preferenceId={state.preferenceId}
          onPreferenceIdChange={(id) => updateState({ preferenceId: id })}
          onUpdate={(prefs) => updateState({ preferences: prefs })}
          onDatesChange={(start, end) => updateState({ startDate: start, endDate: end })}
          onPinnedMealsChange={(pins) => updateState({ pinnedMeals: pins })}
          onBack={() => goToStep('preferences')}
          onGenerate={(plan) => {
            // Collect meal types per unique new recipe title
            const titleMealTypes = new Map<string, Set<string>>();
            for (const day of plan.days) {
              for (const meal of day.meals) {
                if (meal.newRecipeTitle) {
                  if (!titleMealTypes.has(meal.newRecipeTitle)) {
                    titleMealTypes.set(meal.newRecipeTitle, new Set());
                  }
                  titleMealTypes.get(meal.newRecipeTitle)!.add(meal.mealType);
                }
              }
            }

            // Build recipe queue from new recipes in the plan
            const newRecipes: AIRecipeEntry[] = [];
            const seenTitles = new Set<string>();
            for (const day of plan.days) {
              for (const meal of day.meals) {
                if (meal.newRecipeTitle && !seenTitles.has(meal.newRecipeTitle)) {
                  seenTitles.add(meal.newRecipeTitle);
                  newRecipes.push({
                    tempKey: `new-${newRecipes.length}-${Date.now()}`,
                    title: meal.newRecipeTitle,
                    description: meal.newRecipeDescription || undefined,
                    cuisineTag: meal.cuisineTag || undefined,
                    estimatedPrepTime: meal.estimatedPrepTime,
                    estimatedCookTime: meal.estimatedCookTime,
                    mealTypes: Array.from(titleMealTypes.get(meal.newRecipeTitle) || []) as any[],
                    status: 'pending',
                  });
                }
              }
            }
            updateState({
              generatedPlan: plan,
              recipeQueue: newRecipes,
              planDescription: plan.description,
            });
            goToStep('review');
          }}
        />
      )}

      {step === 'review' && state.generatedPlan && (
        <StepReviewPlan
          plan={state.generatedPlan}
          planDescription={state.planDescription}
          recipeQueue={state.recipeQueue}
          preferenceId={state.preferenceId}
          preferences={state.preferences}
          pinnedMeals={state.pinnedMeals}
          onPlanUpdate={(plan) => updateState({ generatedPlan: plan })}
          onDescriptionChange={(desc) => updateState({ planDescription: desc })}
          onRecipeQueueUpdate={(queue) => updateState({ recipeQueue: queue })}
          onBack={() => goToStep('nutrition')}
          onNext={() => {
            // If no new recipes to create, skip to confirmation
            const pendingRecipes = state.recipeQueue.filter(r => r.status === 'pending');
            if (pendingRecipes.length === 0) {
              goToStep('confirmation');
            } else {
              goToStep('recipes');
            }
          }}
        />
      )}

      {step === 'recipes' && (
        <StepCreateRecipes
          recipeQueue={state.recipeQueue}
          createdRecipeIds={state.createdRecipeIds}
          preferences={state.preferences}
          onQueueUpdate={(queue) => updateState({ recipeQueue: queue })}
          onCreatedIdsUpdate={(ids) => updateState({ createdRecipeIds: ids })}
          onBack={() => goToStep('review')}
          onNext={() => goToStep('confirmation')}
        />
      )}

      {step === 'confirmation' && state.generatedPlan && (
        <StepConfirmation
          plan={state.generatedPlan}
          planDescription={state.planDescription}
          recipeQueue={state.recipeQueue}
          createdRecipeIds={state.createdRecipeIds}
          startDate={state.startDate}
          endDate={state.endDate}
          onBack={() => goToStep(state.recipeQueue.length > 0 ? 'recipes' : 'review')}
          onComplete={(mealPlanId) => {
            clearSession();
            navigate(`/meal-plans/${mealPlanId}`);
          }}
        />
      )}
      </WizardErrorBoundary>
    </div>
  );
}
