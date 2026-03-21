import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, SlidersHorizontal, Code2 } from 'lucide-react';

const TABS = [
  {
    to: '/plan-my-meals',
    label: 'Plans',
    icon: CalendarDays,
    matches: ['/plan-my-meals', '/meal-plans', '/shopping-lists', '/cooking-plan'],
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
    matches: ['/developer'],
  },
];

export default function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border-default"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ to, label, icon: Icon, matches }) => {
          const active = matches.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 min-w-[68px] px-2 py-2 rounded-xl transition-colors active:bg-hover-bg ${
                active ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-semibold leading-tight">{label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
