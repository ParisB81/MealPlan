import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCookingPlans,
  useDeleteCookingPlan,
  useRestoreCookingPlan,
  usePermanentDeleteCookingPlan,
} from '../hooks/useCookingPlans';
import { Button, Card } from '../components/ui';
import { ChefHat, Plus, Eye, Trash2, RotateCcw } from 'lucide-react';
import type { CookingPlanStatus } from '../types/cookingPlan';

export default function CookingPlansPage() {
  const [activeTab, setActiveTab] = useState<CookingPlanStatus>('active');
  const { data: plans, isLoading } = useCookingPlans(activeTab);

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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cooking Plans</h1>
            <p className="text-gray-600 mt-1">
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
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          {(['active', 'deleted'] as CookingPlanStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <p className="text-gray-600">Loading cooking plans...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!plans || plans.length === 0) && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {activeTab} cooking plans
          </h3>
          <p className="text-gray-600 mb-6">
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
            <Link key={plan.id} to={`/cooking-plans/${plan.id}`}>
              <Card hoverable>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        {plan.mealPlanIds.length} meal plan
                        {plan.mealPlanIds.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {plan.cookDays.length} cook day
                        {plan.cookDays.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-400">
                        Created {formatDate(plan.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
