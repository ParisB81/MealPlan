import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCookingPlans,
  useDeleteCookingPlan,
  useRestoreCookingPlan,
  usePermanentDeleteCookingPlan,
} from '../hooks/useCookingPlans';
import { Button, Card } from '../components/ui';
import { ChefHat, Plus, Trash2, RotateCcw } from 'lucide-react';
import type { CookingPlanStatus } from '../types/cookingPlan';

export default function CookingPlansPage() {
  const [activeTab, setActiveTab] = useState<CookingPlanStatus>('active');
  const { data: plans, isLoading } = useCookingPlans(activeTab);
  const navigate = useNavigate();

  const deletePlan = useDeleteCookingPlan();
  const restorePlan = useRestoreCookingPlan();
  const permanentDeletePlan = usePermanentDeleteCookingPlan();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete cooking plan "${name}"?`)) {
      deletePlan.mutate(id);
    }
  };

  const handleRestore = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    restorePlan.mutate(id);
  };

  const handlePermanentDelete = (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
      permanentDeletePlan.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <Link to="/plan-my-meals" className="inline-flex items-center text-accent hover:text-accent-hover mb-6">
        ← Back to Plans
      </Link>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-text-secondary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Cooking Plans</h1>
            <p className="text-text-secondary mt-1">
              {plans?.length || 0} cooking plan{plans?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link to="/cooking-plan/new">
          <Button>
            <Plus className="w-4 h-4 mr-2 inline" />
            New Cooking Plan
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border-default">
        <nav className="flex gap-8">
          {(['active', 'deleted'] as CookingPlanStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-strong'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-text-secondary">Loading cooking plans...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!plans || plans.length === 0) && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-card-cooking-meta mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No {activeTab} cooking plans
          </h3>
          <p className="text-text-secondary mb-6">
            {activeTab === 'active'
              ? 'Create a cooking plan to organize your cooking schedule!'
              : 'Deleted cooking plans will appear here.'}
          </p>
          {activeTab === 'active' && (
            <Link to="/cooking-plan/new">
              <Button>
                <Plus className="w-4 h-4 mr-2 inline" />
                Create Your First Cooking Plan
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Plan list */}
      {!isLoading && plans && plans.length > 0 && (
        <div className="grid gap-4">
          {plans.map((plan) => (
              <Card
                key={plan.id}
                hoverable
                className="cursor-pointer bg-card-cooking border border-card-cooking-border"
                onClick={() => navigate(`/cooking-plans/${plan.id}`)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-card-cooking-text mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-card-cooking-meta">
                      <span>
                        {plan.mealPlanIds.length} meal plan
                        {plan.mealPlanIds.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {plan.cookDays.length} cook day
                        {plan.cookDays.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-card-cooking-meta">
                        Created {formatDate(plan.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'active' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => handleDelete(e, plan.id, plan.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {activeTab === 'deleted' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => handleRestore(e, plan.id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1 inline" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) =>
                            handlePermanentDelete(e, plan.id, plan.name)
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1 inline" />
                          Permanent
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
          ))}
        </div>
      )}
    </div>
  );
}
