import { Link } from 'react-router-dom';
import { Card } from '../components/ui';
import ThemePicker from '../components/ThemePicker';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <header className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          Welcome to MealPlan
        </h1>
        <p className="text-xl text-text-secondary">
          Plan your meals, organize recipes, and generate shopping lists
        </p>
      </header>

      {/* Primary feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Link to="/recipes">
          <Card hoverable className="bg-hero-recipes border border-hero-recipes-border">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Recipes
            </h2>
            <p className="text-white/80">
              Browse, create, and manage your recipe collection
            </p>
          </Card>
        </Link>

        <Link to="/collections">
          <Card hoverable className="bg-gradient-to-r from-violet-600 to-purple-600 border border-violet-500">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Collections
            </h2>
            <p className="text-white/80">
              Organize recipes into themed groups like Favorites
            </p>
          </Card>
        </Link>

        <Link to="/meal-plans">
          <Card hoverable className="bg-hero-mealplans border border-hero-mealplans-border">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Meal Plans
            </h2>
            <p className="text-white/80">
              Plan your weekly meals and track nutrition
            </p>
          </Card>
        </Link>

        <Link to="/shopping-lists">
          <Card hoverable className="bg-hero-shopping border border-hero-shopping-border">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Shopping Lists
            </h2>
            <p className="text-white/80">
              Auto-generate shopping lists from your meal plans
            </p>
          </Card>
        </Link>

        <Link to="/cooking-plans">
          <Card hoverable className="bg-hero-cooking border border-hero-cooking-border">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Cooking Plans
            </h2>
            <p className="text-white/80">
              Save and manage your cooking schedules across meal plans
            </p>
          </Card>
        </Link>
      </div>

      {/* AI features — two featured cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
        <Link to="/ai-meal-plan">
          <Card hoverable className="bg-gradient-to-r from-purple-600 to-violet-600 border border-purple-500">
            <h2 className="text-2xl font-semibold text-white mb-2">
              AI Meal Planner
            </h2>
            <p className="text-white/80">
              Set your preferences and let AI generate a personalized meal plan
            </p>
          </Card>
        </Link>
        <Link to="/recipes/ai-generate">
          <Card hoverable className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500">
            <h2 className="text-2xl font-semibold text-white mb-2">
              AI Recipe Generator
            </h2>
            <p className="text-white/80">
              Describe a dish concept and let AI create recipes for you
            </p>
          </Card>
        </Link>
      </div>

      {/* Secondary utilities — aligned row below */}
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mt-8">
        <Link to="/ingredients">
          <Card hoverable className="bg-surface-alt border border-border-default">
            <h2 className="text-lg font-semibold text-text-muted mb-1">
              Ingredients
            </h2>
            <p className="text-sm text-text-muted">
              Manage ingredient database
            </p>
          </Card>
        </Link>

        <Link to="/developer">
          <Card hoverable className="bg-surface-alt border border-dashed border-border-strong">
            <h2 className="text-lg font-semibold text-text-muted mb-1">
              Developer Tools
            </h2>
            <p className="text-sm text-text-muted">
              Components &amp; patterns
            </p>
          </Card>
        </Link>
      </div>

      {/* Theme Picker on home page (since nav is hidden here) */}
      <div className="flex justify-center mt-10">
        <div className="bg-surface border border-border-default rounded-lg px-4 py-3 shadow-sm">
          <ThemePicker inline />
        </div>
      </div>
    </div>
  );
}
