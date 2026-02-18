import { useState, useEffect } from 'react';
import { useMealPlans, useAddRecipeToMealPlan } from '../hooks/useMealPlans';
import type { AddRecipeToMealPlanInput } from '../types/mealPlan';
import { Modal, Input, TextArea, Select, Button } from './ui';

interface AddToMealPlanModalProps {
  recipeId: string;
  recipeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToMealPlanModal({ recipeId, recipeName, isOpen, onClose }: AddToMealPlanModalProps) {
  const { data: mealPlans, isLoading: loadingPlans } = useMealPlans();
  const addRecipe = useAddRecipeToMealPlan();

  const [selectedMealPlanId, setSelectedMealPlanId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');

  // Filter to only active meal plans
  const activePlans = mealPlans?.filter(p => p.status === 'active') || [];

  useEffect(() => {
    if (!isOpen) {
      setSelectedMealPlanId('');
      setDate(new Date().toISOString().split('T')[0]);
      setMealType('dinner');
      setServings(2);
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMealPlanId) {
      alert('Please select a meal plan');
      return;
    }

    const input: AddRecipeToMealPlanInput = {
      recipeId,
      date: new Date(date).toISOString(),
      mealType,
      servings,
      notes: notes || undefined,
    };

    addRecipe.mutate(
      { mealPlanId: selectedMealPlanId, input },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Meal Plan"
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            loading={addRecipe.isPending}
          >
            {addRecipe.isPending ? 'Adding...' : 'Add to Meal Plan'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipe name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
          <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
            {recipeName}
          </p>
        </div>

        {/* Meal Plan Selection */}
        {loadingPlans ? (
          <p className="text-gray-500">Loading meal plans...</p>
        ) : activePlans.length === 0 ? (
          <p className="text-gray-500">No active meal plans. Create one first.</p>
        ) : (
          <Select
            label="Meal Plan"
            value={selectedMealPlanId}
            onChange={(e) => setSelectedMealPlanId(e.target.value)}
            required
          >
            <option value="">Select a meal plan</option>
            {activePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        )}

        {/* Date */}
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        {/* Meal Type */}
        <Select
          label="Meal Type"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as any)}
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </Select>

        {/* Servings */}
        <Input
          label="Servings"
          type="number"
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value))}
          min={1}
          required
        />

        {/* Notes */}
        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any special notes..."
        />
      </form>
    </Modal>
  );
}
