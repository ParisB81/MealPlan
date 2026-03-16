import { Link } from 'react-router-dom';
import { Card } from '../components/ui';
import ThemePicker from '../components/ThemePicker';
import { UtensilsCrossed, FolderHeart, CalendarDays, ShoppingCart, CookingPot, Settings2, Sparkles, Salad, Wrench } from 'lucide-react';

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

      {/* Primary feature cards — all neutral, icons carry section color */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Link to="/recipes">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-recipes flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Recipes</h2>
                <p className="text-text-secondary text-sm">Browse, create, and manage your recipe collection</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/collections">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-collections flex items-center justify-center flex-shrink-0">
                <FolderHeart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Collections</h2>
                <p className="text-text-secondary text-sm">Organize recipes into themed groups</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/meal-plans">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-mealplans flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Meal Plans</h2>
                <p className="text-text-secondary text-sm">Plan your weekly meals and track nutrition</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/shopping-lists">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-shopping flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Shopping Lists</h2>
                <p className="text-text-secondary text-sm">Auto-generate lists from your meal plans</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/cooking-plans">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-cooking flex items-center justify-center flex-shrink-0">
                <CookingPot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Cooking Plans</h2>
                <p className="text-text-secondary text-sm">Save and manage your cooking schedules</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/preferences">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-prefs flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">Preferences</h2>
                <p className="text-text-secondary text-sm">Manage your taste &amp; diet profiles</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* AI features — two cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
        <Link to="/ai-meal-plan">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-ai flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">AI Meal Planner</h2>
                <p className="text-text-secondary text-sm">Let AI generate a personalized meal plan</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/recipes/ai-generate">
          <Card hoverable>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sec-ai-recipes flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-0.5">AI Recipe Generator</h2>
                <p className="text-text-secondary text-sm">Describe a concept and get AI recipes</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Secondary utilities */}
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mt-8">
        <Link to="/ingredients">
          <Card hoverable className="bg-surface-alt">
            <div className="flex items-center gap-2.5">
              <Salad className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-text-secondary">Ingredients</h2>
                <p className="text-xs text-text-muted">Manage database</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/developer">
          <Card hoverable className="bg-surface-alt border-dashed">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-text-secondary">Developer</h2>
                <p className="text-xs text-text-muted">Components &amp; patterns</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Theme Picker on home page (since nav is hidden here) */}
      <div className="flex justify-center mt-10">
        <div className="bg-surface border border-border-default rounded-xl px-4 py-3 shadow-sm">
          <ThemePicker inline />
        </div>
      </div>
    </div>
  );
}
