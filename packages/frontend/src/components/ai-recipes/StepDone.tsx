import { Link } from 'react-router-dom';
import { Button, Card } from '../ui';
import type { AIRecipeQueueEntry } from '../../types/aiRecipe';
import { CheckCircle, ChefHat, ExternalLink } from 'lucide-react';

interface Props {
  queue: AIRecipeQueueEntry[];
  onStartOver: () => void;
}

export default function StepDone({ queue, onStartOver }: Props) {
  const created = queue.filter(q => q.status === 'created');
  const skipped = queue.filter(q => q.status === 'skipped');

  return (
    <div className="space-y-6">
      <Card className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">All Done!</h2>
        <p className="text-text-secondary">
          {created.length > 0
            ? `${created.length} recipe${created.length !== 1 ? 's' : ''} created successfully.`
            : 'No recipes were created.'}
          {skipped.length > 0 && ` ${skipped.length} skipped.`}
        </p>
      </Card>

      {/* Created recipes links */}
      {created.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-text-secondary mb-3">Created recipes</h3>
          <div className="space-y-2">
            {created.map(entry => (
              <Link
                key={entry.tempKey}
                to={`/recipes/${entry.createdRecipeId}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-hover-bg transition-colors"
              >
                <ChefHat className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-sm text-text-primary font-medium">{entry.title}</span>
                <ExternalLink className="w-4 h-4 text-text-muted" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="primary"
          onClick={onStartOver}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Generate More Recipes
        </Button>
        <Link to="/recipes">
          <Button variant="secondary" className="w-full">
            Back to Recipes
          </Button>
        </Link>
      </div>
    </div>
  );
}
