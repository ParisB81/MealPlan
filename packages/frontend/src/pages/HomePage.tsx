import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to MealPlan
        </h1>
        <p className="text-xl text-gray-600">
          Plan your meals, organize recipes, and generate shopping lists
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Link to="/meal-plans">
          <Card hoverable>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Meal Plans
            </h2>
            <p className="text-gray-600">
              Plan your weekly meals and track nutrition
            </p>
          </Card>
        </Link>

        <Link to="/cooking-plans">
          <Card hoverable>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Cooking Plans
            </h2>
            <p className="text-gray-600">
              Save and manage your cooking schedules across meal plans
            </p>
          </Card>
        </Link>

        <Link to="/shopping-lists">
          <Card hoverable>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Shopping Lists
            </h2>
            <p className="text-gray-600">
              Auto-generate shopping lists from your meal plans
            </p>
          </Card>
        </Link>

        <Link to="/recipes">
          <Card hoverable>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Recipes
            </h2>
            <p className="text-gray-600">
              Browse, create, and manage your recipe collection
            </p>
          </Card>
        </Link>

        <Link to="/ingredients">
          <Card hoverable>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Ingredients
            </h2>
            <p className="text-gray-600">
              Manage your ingredient database and categories
            </p>
          </Card>
        </Link>
      </div>

      {/* Developer Section */}
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-dashed border-gray-300">
        <Link to="/developer">
          <Card hoverable className="max-w-xs mx-auto border border-dashed border-gray-300 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-500 mb-1">
              Developer Tools
            </h2>
            <p className="text-sm text-gray-400">
              Inspect site design, components &amp; patterns
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
