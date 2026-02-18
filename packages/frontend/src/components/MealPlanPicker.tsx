import { useState } from 'react';
import { useMealPlans } from '../hooks/useMealPlans';
import type { MealPlan } from '../types/mealPlan';

interface MealPlanPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMealPlan: (mealPlan: MealPlan) => void;
}

export default function MealPlanPicker({ isOpen, onClose, onSelectMealPlan }: MealPlanPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: mealPlans, isLoading } = useMealPlans();

  if (!isOpen) return null;

  // Filter meal plans based on search term
  const filteredMealPlans = mealPlans?.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Select a Meal Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search meal plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Meal Plan List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading meal plans...</div>
          ) : filteredMealPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No meal plans found matching your search.' : 'No meal plans available.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMealPlans.map((mealPlan) => (
                <button
                  key={mealPlan.id}
                  onClick={() => onSelectMealPlan(mealPlan)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{mealPlan.name}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>{formatDate(mealPlan.startDate)} - {formatDate(mealPlan.endDate)}</span>
                    <span className="capitalize">{mealPlan.status}</span>
                    <span>{mealPlan.meals.length} meal(s)</span>
                  </div>
                  {mealPlan.meals.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      Recipes: {mealPlan.meals.slice(0, 3).map(m => m.recipe.title).join(', ')}
                      {mealPlan.meals.length > 3 && ` +${mealPlan.meals.length - 3} more`}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
