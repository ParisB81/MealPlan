import { Button, Card, Badge } from '../ui';
import { useGenerateRecipeDetails } from '../../hooks/useAIMealPlan';
import { useNavigate } from 'react-router-dom';
import type { AIRecipeSuggestion, AIRecipeQueueEntry } from '../../types/aiRecipe';
import { ChevronLeft, Loader2, ChefHat, Clock, Flame, SkipForward, ExternalLink } from 'lucide-react';

interface Props {
  suggestions: AIRecipeSuggestion[];
  queue: AIRecipeQueueEntry[];
  onQueueUpdate: (queue: AIRecipeQueueEntry[]) => void;
  onBack: () => void;
  onAllDone: () => void;
  mealPlanId?: string | null;
}

export default function StepReviewCreate({
  suggestions,
  queue,
  onQueueUpdate,
  onBack,
  onAllDone,
  mealPlanId,
}: Props) {
  const navigate = useNavigate();
  const generateDetails = useGenerateRecipeDetails();

  const handleCreateRecipe = async (entry: AIRecipeQueueEntry, suggestion: AIRecipeSuggestion) => {
    // Mark as creating
    onQueueUpdate(queue.map(q => q.tempKey === entry.tempKey ? { ...q, status: 'creating' as const } : q));

    try {
      const details = await generateDetails.mutateAsync({
        title: suggestion.title,
        description: suggestion.description,
        cuisineHint: suggestion.cuisineTag,
      });

      // Navigate to recipe form with prefill data — same pattern as URL import
      // Store queue state before navigating so we can restore on return
      sessionStorage.setItem('ai_recipe_gen_return', JSON.stringify({
        tempKey: entry.tempKey,
      }));

      navigate('/recipes/new', {
        state: {
          prefill: details,
          returnTo: '/recipes/ai-generate',
          mealPlanId: mealPlanId || undefined,
        },
      });
    } catch {
      // Reset to pending on failure
      onQueueUpdate(queue.map(q => q.tempKey === entry.tempKey ? { ...q, status: 'pending' as const } : q));
    }
  };

  const handleSkip = (tempKey: string) => {
    onQueueUpdate(queue.map(q => q.tempKey === tempKey ? { ...q, status: 'skipped' as const } : q));
  };

  const allProcessed = queue.every(q => q.status === 'created' || q.status === 'skipped');
  const createdCount = queue.filter(q => q.status === 'created').length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Review the AI suggestions below. Click "Create Recipe" to generate full recipe details and save to your library.
      </p>

      {suggestions.map((suggestion, i) => {
        const entry = queue[i];
        if (!entry) return null;

        return (
          <Card key={entry.tempKey} className={`${
            entry.status === 'created' ? 'ring-2 ring-emerald-300 bg-emerald-50/30' :
            entry.status === 'skipped' ? 'opacity-50' : ''
          }`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-text-primary">{suggestion.title}</h3>
                <p className="text-sm text-text-secondary mt-1">{suggestion.description}</p>
              </div>
              {entry.status === 'created' && (
                <Badge color="green">Created</Badge>
              )}
              {entry.status === 'skipped' && (
                <Badge color="yellow">Skipped</Badge>
              )}
            </div>

            {/* Estimated info */}
            <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-4">
              {suggestion.cuisineTag && (
                <span className="flex items-center gap-1">
                  <ChefHat className="w-3 h-3" />
                  {suggestion.cuisineTag}
                </span>
              )}
              {(suggestion.estimatedPrepTime || suggestion.estimatedCookTime) && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {suggestion.estimatedPrepTime && `${suggestion.estimatedPrepTime}m prep`}
                  {suggestion.estimatedPrepTime && suggestion.estimatedCookTime && ' + '}
                  {suggestion.estimatedCookTime && `${suggestion.estimatedCookTime}m cook`}
                </span>
              )}
              {suggestion.estimatedCalories && (
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  ~{suggestion.estimatedCalories} kcal
                </span>
              )}
            </div>

            {/* Actions */}
            {entry.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateRecipe(entry, suggestion)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ChefHat className="w-4 h-4 mr-1" />
                  Create Recipe
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSkip(entry.tempKey)}
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
              </div>
            )}
            {entry.status === 'creating' && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating full recipe details...
              </div>
            )}
            {entry.status === 'created' && entry.createdRecipeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/recipes/${entry.createdRecipeId}`)}
                className="text-emerald-600"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View Recipe
              </Button>
            )}
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        {allProcessed && (
          <Button
            variant="primary"
            onClick={onAllDone}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createdCount > 0 ? 'Done' : 'Finish'}
          </Button>
        )}
      </div>
    </div>
  );
}
