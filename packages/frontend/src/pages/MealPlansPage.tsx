import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMealPlans, useCreateMealPlan, useUpdateMealPlanStatus, useDeleteMealPlan } from '../hooks/useMealPlans';
import { format, addDays } from 'date-fns';
import type { MealPlanStatus } from '../types/mealPlan';
import { Button, Card, Input, Modal } from '../components/ui';

export default function MealPlansPage() {
  const [activeTab, setActiveTab] = useState<MealPlanStatus>('active');
  const { data: mealPlans, isLoading } = useMealPlans(activeTab);
  const createMealPlan = useCreateMealPlan();
  const updateStatus = useUpdateMealPlanStatus();
  const deleteMealPlan = useDeleteMealPlan();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const navigate = useNavigate();

  const handleCreateWeeklyPlan = () => {
    const today = new Date();
    const name = newPlanName || `Week of ${format(today, 'MMM d')}`;
    const startDate = today.toISOString();
    const endDate = addDays(today, 6).toISOString();

    createMealPlan.mutate(
      { name, startDate, endDate },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewPlanName('');
        },
      }
    );
  };

  const handleMoveToCompleted = (planId: string) => {
    if (confirm('Mark this meal plan as completed?')) {
      updateStatus.mutate({ id: planId, input: { status: 'completed' } });
    }
  };

  const handleDelete = (planId: string) => {
    if (confirm('Move this meal plan to deleted?')) {
      updateStatus.mutate({ id: planId, input: { status: 'deleted' } });
    }
  };

  const handlePermanentDelete = (planId: string) => {
    if (confirm('Permanently delete this meal plan? This cannot be undone.')) {
      deleteMealPlan.mutate(planId);
    }
  };

  const handleRestoreToActive = (planId: string) => {
    updateStatus.mutate({ id: planId, input: { status: 'active' } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Meal Plans</h1>
            <p className="text-gray-600 mt-1">
              {mealPlans?.length || 0} meal plans
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            + Create Meal Plan
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            {(['active', 'completed', 'deleted'] as MealPlanStatus[]).map((tab) => (
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

        {/* Create Form Modal */}
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Create New Meal Plan"
          size="md"
          footer={
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleCreateWeeklyPlan}
                loading={createMealPlan.isPending}
              >
                {createMealPlan.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          }
        >
          <p className="text-gray-600 mb-4">
            Create a weekly meal plan starting today
          </p>
          <Input
            label="Plan Name (optional)"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            placeholder={`Week of ${format(new Date(), 'MMM d')}`}
          />
        </Modal>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#x231B;</div>
            <p className="text-gray-600">Loading meal plans...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!mealPlans || mealPlans.length === 0) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">&#x1F4C5;</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab} meal plans
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'active'
                ? 'Create your first weekly meal plan to get started!'
                : activeTab === 'completed'
                ? 'Completed meal plans will appear here.'
                : 'Deleted meal plans will appear here.'}
            </p>
          </div>
        )}

        {/* Meal Plans List */}
        {!isLoading && mealPlans && mealPlans.length > 0 && (
          <div className="grid gap-4">
            {mealPlans.map((plan) => (
              <Card
                key={plan.id}
                hoverable
                className="cursor-pointer"
                onClick={() => navigate(`/meal-plans/${plan.id}`)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {format(new Date(plan.startDate), 'MMM d')} -{' '}
                      {format(new Date(plan.endDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {plan.meals.length} meals planned
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => navigate(`/meal-plans/${plan.id}`)}>
                      View
                    </Button>

                    {activeTab === 'active' && (
                      <>
                        <Button size="sm" variant="success" onClick={() => handleMoveToCompleted(plan.id)}>
                          Complete
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(plan.id)}>
                          Delete
                        </Button>
                      </>
                    )}

                    {activeTab === 'completed' && (
                      <>
                        <Button size="sm" onClick={() => handleRestoreToActive(plan.id)}>
                          Restore
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(plan.id)}>
                          Delete
                        </Button>
                      </>
                    )}

                    {activeTab === 'deleted' && (
                      <>
                        <Button size="sm" onClick={() => handleRestoreToActive(plan.id)}>
                          Restore
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handlePermanentDelete(plan.id)}>
                          Permanent Delete
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
    </div>
  );
}
