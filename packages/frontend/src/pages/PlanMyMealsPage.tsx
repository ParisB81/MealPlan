import { Link } from 'react-router-dom';
import { CalendarDays, ShoppingCart, CookingPot, ChevronRight } from 'lucide-react';

const OPTIONS = [
  {
    to: '/meal-plans',
    icon: CalendarDays,
    iconBg: 'bg-sec-mealplans',
    title: 'Meal Plans',
    desc: 'Create and manage weekly or monthly meal plans',
  },
  {
    to: '/shopping-lists',
    icon: ShoppingCart,
    iconBg: 'bg-sec-shopping',
    title: 'Shopping Lists',
    desc: 'Auto-generate shopping lists from your meal plans',
  },
  {
    to: '/cooking-plans',
    icon: CookingPot,
    iconBg: 'bg-sec-cooking',
    title: 'Cooking Plans',
    desc: 'Schedule and save your cooking sessions',
  },
];

export default function PlanMyMealsPage() {
  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center text-accent hover:text-accent-hover mb-6"
        >
          ← Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-1">Plan my Meals</h1>
          <p className="text-text-secondary text-base">
            Create plans, build shopping lists, and schedule your cooking sessions.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {OPTIONS.map(({ to, icon: Icon, iconBg, title, desc }) => (
            <Link key={to} to={to}>
              <div className="flex items-center gap-4 p-5 bg-surface rounded-2xl border border-border-default shadow-sm active:scale-[0.98] transition-transform">
                <div
                  className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-text-primary text-lg">{title}</div>
                  <div className="text-text-secondary text-base mt-0.5">{desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
