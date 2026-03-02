import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks/useRecipes';
import { CalendarPlus, ExternalLink } from 'lucide-react';
import AddToMealPlanModal from '../components/AddToMealPlanModal';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const deleteRecipe = useDeleteRecipe();
  const [showAddToMealPlan, setShowAddToMealPlan] = useState(false);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    deleteRecipe.mutate(id, {
      onSuccess: () => {
        navigate('/recipes');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-text-secondary">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Recipe not found</h2>
          <p className="text-text-secondary mb-6">The recipe you're looking for doesn't exist.</p>
          <Link
            to="/recipes"
            className="px-4 py-2 bg-btn-primary text-white rounded-lg hover:bg-btn-primary-hover"
          >
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        {/* Back Button */}
        <Link
          to="/recipes"
          className="inline-flex items-center text-accent hover:text-accent-hover mb-6"
        >
          ← Back to Recipes
        </Link>

        {/* Recipe Header */}
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden mb-6">
          {recipe.imageUrl && (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-64 object-cover"
            />
          )}

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{recipe.title}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddToMealPlan(true)}
                  className="inline-flex items-center px-4 py-2 bg-btn-success text-white rounded-lg hover:bg-btn-success-hover"
                >
                  <CalendarPlus className="w-4 h-4 mr-1" />
                  Add to Meal Plan
                </button>
                <Link
                  to={`/recipes/${id}/edit`}
                  className="px-4 py-2 bg-btn-primary text-white rounded-lg hover:bg-btn-primary-hover"
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteRecipe.isPending}
                  className="px-4 py-2 bg-btn-danger text-white rounded-lg hover:bg-btn-danger-hover disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {recipe.description && (
              <p className="text-text-secondary mb-4">{recipe.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex gap-6 text-sm text-text-secondary mb-4">
              {recipe.prepTime && (
                <div>
                  <span className="font-semibold">Prep:</span> {recipe.prepTime} min
                </div>
              )}
              {recipe.cookTime && (
                <div>
                  <span className="font-semibold">Cook:</span> {recipe.cookTime} min
                </div>
              )}
              {totalTime > 0 && (
                <div>
                  <span className="font-semibold">Total:</span> {totalTime} min
                </div>
              )}
              <div>
                <span className="font-semibold">Servings:</span> {recipe.servings}
              </div>
            </div>

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-accent-light text-accent text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Source URL */}
            {recipe.sourceUrl && (
              <div className="mt-4 pt-4 border-t border-border-default">
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-accent hover:text-accent-hover hover:underline"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original Recipe
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Ingredients */}
          <div className="bg-surface rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-text-primary">
                    {item.ingredient.name}
                    {item.notes && ` (${item.notes})`}
                  </span>
                  <span className="text-text-secondary">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Nutrition */}
          {recipe.nutrition && (
            <div className="bg-surface rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-text-primary mb-4">Nutrition <span className="text-base font-normal text-text-muted">(per serving)</span></h2>
              <div className="grid grid-cols-2 gap-4">
                {recipe.nutrition.calories && (
                  <div>
                    <div className="text-sm text-text-secondary">Calories</div>
                    <div className="text-lg font-semibold">{recipe.nutrition.calories}</div>
                  </div>
                )}
                {recipe.nutrition.protein && (
                  <div>
                    <div className="text-sm text-text-secondary">Protein</div>
                    <div className="text-lg font-semibold">{recipe.nutrition.protein}g</div>
                  </div>
                )}
                {recipe.nutrition.carbs && (
                  <div>
                    <div className="text-sm text-text-secondary">Carbs</div>
                    <div className="text-lg font-semibold">{recipe.nutrition.carbs}g</div>
                  </div>
                )}
                {recipe.nutrition.fat && (
                  <div>
                    <div className="text-sm text-text-secondary">Fat</div>
                    <div className="text-lg font-semibold">{recipe.nutrition.fat}g</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-surface rounded-lg shadow p-6 mt-6">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-btn-primary text-white rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <p className="text-text-primary pt-1">{instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Add to Meal Plan Modal */}
        {recipe && (
          <AddToMealPlanModal
            recipeId={recipe.id}
            recipeName={recipe.title}
            isOpen={showAddToMealPlan}
            onClose={() => setShowAddToMealPlan(false)}
          />
        )}
      </div>
    </div>
  );
}
