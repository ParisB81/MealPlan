import { useState } from 'react';
import { Button, Card } from '../ui';
import RecipePicker from '../RecipePicker';
import type { Recipe } from '../../types/recipe';
import { ChevronRight, X } from 'lucide-react';

interface Props {
  count: number;
  concept: string;
  baseRecipeId: string | null;
  baseRecipeTitle: string | null;
  onCountChange: (n: number) => void;
  onConceptChange: (c: string) => void;
  onBaseRecipeChange: (id: string | null, title: string | null) => void;
  onNext: () => void;
}

export default function StepConcept({
  count,
  concept,
  baseRecipeId,
  baseRecipeTitle,
  onCountChange,
  onConceptChange,
  onBaseRecipeChange,
  onNext,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectRecipe = (recipe: Recipe) => {
    onBaseRecipeChange(recipe.id, recipe.title);
    setShowPicker(false);
  };

  const canProceed = concept.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* How many recipes */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          How many recipes to generate?
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onCountChange(n)}
              className={`w-12 h-12 rounded-lg text-lg font-semibold transition-colors ${
                count === n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-alt text-text-secondary hover:bg-emerald-100'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      {/* Concept description */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Describe what you're looking for *
        </label>
        <textarea
          value={concept}
          onChange={(e) => onConceptChange(e.target.value)}
          placeholder="e.g., Quick weeknight pasta dishes with lots of vegetables, something healthy but satisfying"
          rows={4}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
          maxLength={1000}
        />
        <p className="text-xs text-text-muted mt-1">{concept.length}/1000</p>
      </Card>

      {/* Alternative version of existing recipe (optional) */}
      <Card>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Base on existing recipe? (optional)
        </label>
        <p className="text-xs text-text-muted mb-3">
          Select a recipe to create a variation or alternative version of it.
        </p>
        {baseRecipeId && baseRecipeTitle ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="flex-1 text-sm text-text-primary font-medium truncate">{baseRecipeTitle}</span>
            <button
              onClick={() => onBaseRecipeChange(null, null)}
              className="p-1 hover:bg-red-100 rounded text-text-muted hover:text-red-500 transition-colors"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowPicker(true)}
            className="text-emerald-600 hover:bg-emerald-50"
          >
            Select a recipe...
          </Button>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canProceed}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Next: Preferences
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Recipe picker modal */}
      <RecipePicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectRecipe={handleSelectRecipe}
      />
    </div>
  );
}
