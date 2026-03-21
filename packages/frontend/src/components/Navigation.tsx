import { useLocation, Link } from 'react-router-dom';
import { Home, CalendarDays, ShoppingCart, UtensilsCrossed, Salad, CookingPot, Wrench, FolderHeart, Settings2 } from 'lucide-react';
import ThemePicker from './ThemePicker';

// Groups: content | planning | utility
const navGroups = [
  {
    links: [
      { to: '/', label: 'Home', icon: Home },
      { to: '/recipes', label: 'Recipes', icon: UtensilsCrossed, match: '/recipes' },
      { to: '/collections', label: 'Collections', icon: FolderHeart, match: '/collections' },
    ],
  },
  {
    links: [
      { to: '/meal-plans', label: 'Meal Plans', icon: CalendarDays, match: '/meal-plans' },
      { to: '/shopping-lists', label: 'Shopping', icon: ShoppingCart, match: '/shopping-lists' },
      { to: '/cooking-plans', label: 'Cooking', icon: CookingPot, match: '/cooking-plan' },
    ],
  },
  {
    links: [
      { to: '/preferences', label: 'Preferences', icon: Settings2, match: '/preferences' },
      { to: '/ingredients', label: 'Ingredients', icon: Salad, match: '/ingredients' },
      { to: '/developer', label: 'Developer', icon: Wrench, match: '/developer' },
    ],
  },
];

const navLinks = navGroups.flatMap((g) => g.links);

export default function Navigation() {
  const location = useLocation();

  // Hide navigation on home page (after all hooks)
  if (location.pathname === '/') return null;

  const isActive = (link: typeof navLinks[0]) =>
    link.match ? location.pathname.startsWith(link.match) : false;

  return (
    <nav className="bg-surface shadow-sm border-b border-border-default sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop nav (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1">
          <div className="flex-1 flex items-center gap-1">
            {navGroups.map((group, gi) => (
              <div key={gi} className="flex items-center gap-1">
                {gi > 0 && (
                  <div className="w-px h-5 bg-border-default mx-1.5" />
                )}
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'text-accent bg-accent-light'
                          : 'text-text-secondary hover:text-accent hover:bg-hover-bg'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Theme Picker (desktop) */}
          <ThemePicker />
        </div>

        {/* Mobile nav header — logo + theme picker only (bottom tab bar handles navigation) */}
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
