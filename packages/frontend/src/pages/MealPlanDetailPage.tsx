import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ShoppingCart, ChevronDown, PlusCircle, ListPlus } from 'lucide-react';
import { useMealPlan, useDeleteMealPlan, useMealPlanNutrition, useRemoveRecipeFromMealPlan, useUpdateMealPlanStatus } from '../hooks/useMealPlans';
import { useGenerateShoppingList, useShoppingLists, useAddFromMealPlan } from '../hooks/useShoppingLists';
import AddRecipeModal from '../components/AddRecipeModal';
import MealPlanCalendar from '../components/MealPlanCalendar';
import { Button, Card, Badge, Modal } from '../components/ui';

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: mealPlan, isLoading, error } = useMealPlan(id);
  const { data: nutrition } = useMealPlanNutrition(id);
  const deleteMealPlan = useDeleteMealPlan();
  const removeRecipe = useRemoveRecipeFromMealPlan();
  const updateStatus = useUpdateMealPlanStatus();
  const generateShoppingList = useGenerateShoppingList();
  const addFromMealPlan = useAddFromMealPlan();
  const { data: existingLists } = useShoppingLists('active');
  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [shoppingDropdownOpen, setShoppingDropdownOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShoppingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateNewList = async () => {
    if (!id) return;
    setShoppingDropdownOpen(false);
    generateShoppingList.mutate(
      { mealPlanIds: [id], name: `${mealPlan?.name || 'Meal Plan'} — Shopping List` },
      { onSuccess: (list) => navigate(`/shopping-lists/${list.id}`) }
    );
  };

  const handleAddToExistingList = (shoppingListId: string) => {
    if (!id) return;
    setIsAddToListModalOpen(false);
    addFromMealPlan.mutate(
      { shoppingListId, mealPlanId: id },
      { onSuccess: () => navigate(`/shopping-lists/${shoppingListId}`) }
    );
  };

  const handleDateClick = useCallback((dateKey: string) => {
    const el = dateRefs.current[dateKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 1500);
    }
  }, []);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    deleteMealPlan.mutate(id, {
      onSuccess: () => {
        navigate('/meal-plans');
      },
    });
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!id || !confirm('Remove this recipe from the meal plan?')) {
      return;
    }

    removeRecipe.mutate({ mealPlanId: id, recipeId });
  };

  const handleMarkAsCompleted = async () => {
    if (!id) return;

    updateStatus.mutate({
      id,
      input: { status: 'completed' },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x231B;</div>
          <p className="text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x274C;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meal plan not found</h2>
          <Link
            to="/meal-plans"
            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to Meal Plans
          </Link>
        </div>
      </div>
    );
  }

  // Group meals by date
  const mealsByDate: Record<string, any[]> = {};
  mealPlan.meals.forEach((meal) => {
    const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
    if (!mealsByDate[dateKey]) {
      mealsByDate[dateKey] = [];
    }
    mealsByDate[dateKey].push(meal);
  });

  // Build calendar data: date -> meal type summary
  const calendarMealsByDate: Record<string, { mealType: string }[]> = {};
  mealPlan.meals.forEach((meal) => {
    const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
    if (!calendarMealsByDate[dateKey]) {
      calendarMealsByDate[dateKey] = [];
    }
    calendarMealsByDate[dateKey].push({ mealType: meal.mealType });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          to="/meal-plans"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          &#x2190; Back to Meal Plans
        </Link>

        {/* Header */}
        <Card className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{mealPlan.name}</h1>
                {mealPlan.status === 'completed' && (
                  <Badge variant="green" size="md">&#x2713; Completed</Badge>
                )}
              </div>
              <p className="text-gray-600">
                {format(new Date(mealPlan.startDate), 'MMMM d')} -{' '}
                {format(new Date(mealPlan.endDate), 'MMMM d, yyyy')}
              </p>
              <p className="text-gray-500 mt-1">{mealPlan.meals.length} meals planned</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => setIsAddRecipeModalOpen(true)}>
                Add Recipe
              </Button>

              {/* Shopping List dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="secondary"
                  onClick={() => setShoppingDropdownOpen(o => !o)}
                  loading={generateShoppingList.isPending || addFromMealPlan.isPending}
                >
                  <ShoppingCart size={16} className="mr-1.5" />
                  Shopping List
                  <ChevronDown size={14} className="ml-1.5" />
                </Button>
                {shoppingDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                      onClick={handleGenerateNewList}
                    >
                      <PlusCircle size={15} className="text-blue-500" />
                      Generate new list
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => { setShoppingDropdownOpen(false); setIsAddToListModalOpen(true); }}
                      disabled={!existingLists || existingLists.length === 0}
                    >
                      <ListPlus size={15} className="text-green-500" />
                      Add to existing list
                      {existingLists && existingLists.length > 0 && (
                        <span className="ml-auto text-xs text-gray-400">{existingLists.length}</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {mealPlan.status !== 'completed' && (
                <Button
                  variant="success"
                  onClick={handleMarkAsCompleted}
                  loading={updateStatus.isPending}
                >
                  Mark as Completed
                </Button>
              )}
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleteMealPlan.isPending}
              >
                Delete Plan
              </Button>
            </div>
          </div>
        </Card>

        {/* Nutrition Summary */}
        {nutrition && nutrition.mealsCount > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Nutrition Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{nutrition.totalCalories}</div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{nutrition.totalProtein}g</div>
                <div className="text-sm text-gray-600">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{nutrition.totalCarbs}g</div>
                <div className="text-sm text-gray-600">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{nutrition.totalFat}g</div>
                <div className="text-sm text-gray-600">Fat</div>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {mealPlan.meals.length === 0 && (
          <Card padding="lg" className="text-center">
            <div className="text-6xl mb-4">&#x1F37D;&#xFE0F;</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No meals planned yet
            </h3>
            <p className="text-gray-600 mb-6">
              Click "Add Recipe" to start planning your meals
            </p>
            <Button size="lg" onClick={() => setIsAddRecipeModalOpen(true)}>
              Add Your First Recipe
            </Button>
          </Card>
        )}

        {/* Meals by Date */}
        {Object.keys(mealsByDate).length > 0 && (
          <div className="space-y-6">
            {Object.entries(mealsByDate).map(([dateKey, meals]) => (
              <Card key={dateKey} ref={(el: HTMLDivElement | null) => { dateRefs.current[dateKey] = el; }} className="transition-all duration-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {format(new Date(dateKey), 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-3">
                  {meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="blue" className="uppercase">
                            {meal.mealType}
                          </Badge>
                          <Link
                            to={`/recipes/${meal.recipe.id}`}
                            className="text-lg font-medium text-gray-900 hover:text-blue-600"
                          >
                            {meal.recipe.title}
                          </Link>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {meal.servings} serving{meal.servings > 1 ? 's' : ''}
                          {meal.notes && ` \u2022 ${meal.notes}`}
                        </p>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleRemoveRecipe(meal.id)}
                        disabled={removeRecipe.isPending}
                        className="ml-4 text-red-600 hover:text-red-700 no-underline hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Calendar */}
        {mealPlan.meals.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Meal Calendar</h2>
            <MealPlanCalendar
              startDate={mealPlan.startDate}
              endDate={mealPlan.endDate}
              mealsByDate={calendarMealsByDate}
              onDateClick={handleDateClick}
            />
          </Card>
        )}

        {/* Add Recipe Modal */}
        {id && (
          <AddRecipeModal
            mealPlanId={id}
            isOpen={isAddRecipeModalOpen}
            onClose={() => setIsAddRecipeModalOpen(false)}
          />
        )}

        {/* Add to Existing Shopping List Modal */}
        <Modal
          isOpen={isAddToListModalOpen}
          onClose={() => setIsAddToListModalOpen(false)}
          title="Add to Existing Shopping List"
          size="sm"
        >
          <p className="text-sm text-gray-600 mb-4">
            Choose a shopping list to add all ingredients from <strong>{mealPlan.name}</strong> to:
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {existingLists && existingLists.length > 0 ? (
              existingLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToExistingList(list.id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">{list.name}</div>
                  {list.mealPlan && (
                    <div className="text-xs text-gray-500 mt-0.5">Linked to: {list.mealPlan.name}</div>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No active shopping lists found.</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setIsAddToListModalOpen(false)}>Cancel</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
