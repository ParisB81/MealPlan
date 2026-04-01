import { useLocation, Link } from 'react-router-dom';
import { Home, CalendarDays, BookOpen, SlidersHorizontal, Code2 } from 'lucide-react';
import ThemePicker from './ThemePicker';

const NAV_TABS = [
  {
    to: '/',
    label: 'Home',
    icon: Home,
    exact: true,
    matches: ['/'],
  },
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

  return (
    <nav className="bg-surface shadow-sm border-b border-border-default sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">

        {/* Desktop nav — 4 hub tabs matching mobile tab bar */}
        <div className="hidden md:flex items-center gap-1">
          <div className="flex-1 flex items-center gap-1">
            {NAV_TABS.map(({ to, label, icon: Icon, matches, exact }) => {
              const active = exact ? pathname === '/' : matches.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-accent bg-accent-light'
                      : 'text-text-secondary hover:text-accent hover:bg-hover-bg'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {active && <span>{label}</span>}
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
