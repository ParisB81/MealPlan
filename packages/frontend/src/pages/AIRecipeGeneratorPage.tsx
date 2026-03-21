import { useState, useEffect } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, FolderHeart } from 'lucide-react';
import StepConcept from '../components/ai-recipes/StepConcept';
import StepRecipePreferences from '../components/ai-recipes/StepRecipePreferences';
import StepReviewCreate from '../components/ai-recipes/StepReviewCreate';
import StepDone from '../components/ai-recipes/StepDone';
import { useGenerateRecipeSuggestions } from '../hooks/useAIRecipes';
import type { AIRecipeSuggestion, AIRecipeQueueEntry, GenerateRecipeSuggestionsInput } from '../types/aiRecipe';

type WizardStep = 'concept' | 'preferences' | 'review' | 'done';

const STEP_ORDER: WizardStep[] = ['concept', 'preferences', 'review', 'done'];
const STEP_LABELS: Record<WizardStep, string> = {
  concept: 'Concept',
  preferences: 'Preferences',
  review: 'Review & Create',
  done: 'Done',
};

const SESSION_KEY = 'ai_recipe_gen_state';

interface WizardState {
  input: GenerateRecipeSuggestionsInput;
  baseRecipeTitle: string | null;
  suggestions: AIRecipeSuggestion[];
  queue: AIRecipeQueueEntry[];
}

const defaultInput: GenerateRecipeSuggestionsInput = {
  count: 3,
  concept: '',
  baseRecipeId: undefined,
  mealTypes: [],
  specificTaste: '',
  ingredientLikes: '',
  ingredientDislikes: '',
  dietaryRestrictions: [],
  allergies: [],
  cuisinePreferences: [],
  caloriesMin: null,
  caloriesMax: null,
  preferredMethods: [],
  maxPrepTime: null,
  maxCookTime: null,
  otherRemarks: '',
};

export default function AIRecipeGeneratorPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const generateSuggestions = useGenerateRecipeSuggestions();

  // Check for return from RecipeFormPage
  const returnedRecipeId = (location.state as any)?.createdRecipeId;

  // Meal plan context: passed via query param when launched from AddRecipeModal
  const [mealPlanId] = useState<string | null>(() => {
    const fromUrl = searchParams.get('mealPlanId');
    if (fromUrl) return fromUrl;
    // Restore from session if returning from RecipeFormPage
    const saved = sessionStorage.getItem(SESSION_KEY + '_mealPlanId');
    return saved || null;
  });

  // Persist mealPlanId across navigations
  useEffect(() => {
    if (mealPlanId) {
      sessionStorage.setItem(SESSION_KEY + '_mealPlanId', mealPlanId);
    }
  }, [mealPlanId]);

  // Check for goal planner prefill
  const goalPrefill = (location.state as any)?.goalPrefill;

  // Post-collection flow: recipes created here get added to this collection
  const [postCollectionId] = useState<string | null>(() => {
    const fromState = (location.state as any)?.postCollectionId;
    if (fromState) return fromState;
    return sessionStorage.getItem(SESSION_KEY + '_postCollectionId');
  });
  const [postCollectionName] = useState<string | null>(() => {
    const fromState = (location.state as any)?.postCollectionName;
    if (fromState) return fromState;
    return sessionStorage.getItem(SESSION_KEY + '_postCollectionName');
  });

  // Persist post-collection context across RecipeFormPage navigations
  useEffect(() => {
    if (postCollectionId) {
      sessionStorage.setItem(SESSION_KEY + '_postCollectionId', postCollectionId);
    }
    if (postCollectionName) {
      sessionStorage.setItem(SESSION_KEY + '_postCollectionName', postCollectionName);
    }
  }, [postCollectionId, postCollectionName]);

  const [step, setStep] = useState<WizardStep>('concept');
  const [state, setState] = useState<WizardState>(() => {
    // Goal planner prefill takes priority — clear any stale session
    if (goalPrefill) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY + '_step');
      window.history.replaceState({}, document.title);
      return {
        input: {
          ...defaultInput,
          concept: goalPrefill.concept || '',
          mealTypes: goalPrefill.mealTypes || [],
          specificTaste: goalPrefill.specificTaste || '',
          dietaryRestrictions: goalPrefill.dietaryRestrictions || [],
          cuisinePreferences: goalPrefill.cuisinePreferences || [],
          preferredMethods: goalPrefill.preferredMethods || [],
          caloriesMin: goalPrefill.caloriesMin ?? null,
          caloriesMax: goalPrefill.caloriesMax ?? null,
        },
        baseRecipeTitle: null,
        suggestions: [],
        queue: [],
      };
    }

    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* fall through */ }
    }
    return {
      input: defaultInput,
      baseRecipeTitle: null,
      suggestions: [],
      queue: [],
    };
  });

  // Restore step
  useEffect(() => {
    const savedStep = sessionStorage.getItem(SESSION_KEY + '_step');
    if (savedStep && STEP_ORDER.includes(savedStep as WizardStep)) {
      setStep(savedStep as WizardStep);
    }
  }, []);

  // Handle return from RecipeFormPage with created recipe
  useEffect(() => {
    if (returnedRecipeId) {
      const returnData = sessionStorage.getItem('ai_recipe_gen_return');
      if (returnData) {
        try {
          const { tempKey } = JSON.parse(returnData);
          setState(prev => ({
            ...prev,
            queue: prev.queue.map(q =>
              q.tempKey === tempKey
                ? { ...q, status: 'created' as const, createdRecipeId: returnedRecipeId }
                : q
            ),
          }));
          sessionStorage.removeItem('ai_recipe_gen_return');
        } catch { /* ignore */ }
      }
      // Auto-add to collection if post-collection flow is active
      if (postCollectionId) {
        import('../services/collections.service').then(({ collectionsService }) => {
          collectionsService.addRecipe(postCollectionId, returnedRecipeId).catch(() => {
            // Silently ignore — recipe was still created successfully
          });
        });
      }
      setStep('review');
      window.history.replaceState({}, document.title);
    }
  }, [returnedRecipeId, postCollectionId]);

  // Persist state
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    sessionStorage.setItem(SESSION_KEY + '_step', step);
  }, [state, step]);

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY + '_step');
    sessionStorage.removeItem(SESSION_KEY + '_mealPlanId');
    sessionStorage.removeItem(SESSION_KEY + '_postCollectionId');
    sessionStorage.removeItem(SESSION_KEY + '_postCollectionName');
    sessionStorage.removeItem('ai_recipe_gen_return');
  };

  const goToStep = (nextStep: WizardStep) => {
    setStep(nextStep);
    window.scrollTo(0, 0);
  };

  const handleGenerate = async () => {
    try {
      const suggestions = await generateSuggestions.mutateAsync(state.input);
      const queue: AIRecipeQueueEntry[] = suggestions.map((s, i) => ({
        tempKey: `ai-recipe-${i}-${Date.now()}`,
        title: s.title,
        description: s.description,
        cuisineTag: s.cuisineTag,
        estimatedPrepTime: s.estimatedPrepTime,
        estimatedCookTime: s.estimatedCookTime,
        status: 'pending' as const,
      }));
      setState(prev => ({ ...prev, suggestions, queue }));
      goToStep('review');
    } catch {
      // Error handled by hook
    }
  };

  const handleStartOver = () => {
    clearSession();
    setState({
      input: defaultInput,
      baseRecipeTitle: null,
      suggestions: [],
      queue: [],
    });
    setStep('concept');
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      <Link to="/recipes-collections" className="inline-flex items-center text-accent hover:text-accent-hover mb-6">
        ← Back to Recipes
      </Link>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-7 h-7 text-emerald-500" />
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          AI Recipe Generator
        </h1>
      </div>

      {/* Post-collection context banner */}
      {postCollectionName && (
        <div className="mb-4 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 flex items-center gap-2">
          <FolderHeart className="w-4 h-4 flex-shrink-0" />
          Recipes will be added to <strong>{postCollectionName}</strong>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEP_ORDER.map((s, i) => {
          const isActive = s === step;
          const isCompleted = i < currentStepIndex;
          return (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <div className={`w-6 md:w-10 h-0.5 ${isCompleted ? 'bg-emerald-500' : 'bg-border-default'}`} />
              )}
              <button
                onClick={() => i <= currentStepIndex && goToStep(s)}
                disabled={i > currentStepIndex}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive ? 'bg-emerald-500 text-white' : ''}
                  ${isCompleted ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer' : ''}
                  ${!isActive && !isCompleted ? 'bg-surface-alt text-text-muted' : ''}
                `}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-200' : 'bg-border-default'}
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
      {step === 'concept' && (
        <StepConcept
          count={state.input.count}
          concept={state.input.concept}
          baseRecipeId={state.input.baseRecipeId || null}
          baseRecipeTitle={state.baseRecipeTitle}
          onCountChange={(n) => setState(prev => ({ ...prev, input: { ...prev.input, count: n } }))}
          onConceptChange={(c) => setState(prev => ({ ...prev, input: { ...prev.input, concept: c } }))}
          onBaseRecipeChange={(id, title) => setState(prev => ({
            ...prev,
            input: { ...prev.input, baseRecipeId: id || undefined },
            baseRecipeTitle: title,
          }))}
          onNext={() => goToStep('preferences')}
        />
      )}

      {step === 'preferences' && (
        <StepRecipePreferences
          input={state.input}
          onUpdate={(input) => setState(prev => ({ ...prev, input }))}
          onBack={() => goToStep('concept')}
          onGenerate={handleGenerate}
          isGenerating={generateSuggestions.isPending}
        />
      )}

      {step === 'review' && state.suggestions.length > 0 && (
        <StepReviewCreate
          suggestions={state.suggestions}
          queue={state.queue}
          onQueueUpdate={(queue) => setState(prev => ({ ...prev, queue }))}
          onBack={() => goToStep('preferences')}
          onAllDone={() => goToStep('done')}
          mealPlanId={postCollectionId ? null : mealPlanId}
        />
      )}

      {step === 'done' && (
        <StepDone
          queue={state.queue}
          onStartOver={handleStartOver}
          mealPlanId={postCollectionId ? null : mealPlanId}
        />
      )}
    </div>
  );
}
