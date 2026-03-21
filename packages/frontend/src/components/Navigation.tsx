import { useLocation, Link } from 'react-router-dom';
import { CalendarDays, BookOpen, SlidersHorizontal, Code2 } from 'lucide-react';
import ThemePicker from './ThemePicker';

const NAV_TABS = [
  {
    to: '/plan-my-meals',
    label: 'Plans',
    icon: CalendarDays,
    matches: ['/plan-my-meals', '/meal-plans', '/shopping-lists', '/cooking-plan', '/ai-meal-plan'],
  },
  {
    to: '/recipes-collections',
    label: 'Recipes',
    icon: BookOpen,
    matches: ['/recipes-collections', '/recipes', '/collections'],
  },
  {
    to: '/preferences',
    label: 'Preferences',
    icon: SlidersHorizontal,
    matches: ['/preferences'],
  },
  {
    to: '/developer',
    label: 'Developer',
    icon: Code2,
    matches: ['/developer', '/ingredients'],
  },
];

export default function Navigation() {
  const { pathname } = useLocation();

  // Hide navigation on home page
  if (pathname === '/') return null;

  return (
    <nav className="bg-surface shadow-sm border-b border-border-default sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">

        {/* Desktop nav — 4 hub tabs matching mobile tab bar */}
        <div className="hidden md:flex items-center gap-1">
          <div className="flex-1 flex items-center gap-1">
            {NAV_TABS.map(({ to, label, icon: Icon, matches }) => {
              const active = matches.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-accent bg-accent-light'
                      : 'text-text-secondary hover:text-accent hover:bg-hover-bg'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
          <ThemePicker />
        </div>

        {/* Mobile header — logo + theme picker only (MobileTabBar handles navigation) */}
        <div className="flex md:hidden items-center justify-between">
          <Link to="/" className="font-bold text-lg text-text-primary">
            MealPlan
          </Link>
          <ThemePicker />
        </div>

      </div>
    </nav>
  );
}
