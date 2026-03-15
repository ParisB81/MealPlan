import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, CalendarDays, ShoppingCart, UtensilsCrossed, Salad, CookingPot, Wrench, FolderHeart, Settings2 } from 'lucide-react';
import ThemePicker from './ThemePicker';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/recipes', label: 'Recipes', icon: UtensilsCrossed, match: '/recipes' },
  { to: '/collections', label: 'Collections', icon: FolderHeart, match: '/collections' },
  { to: '/meal-plans', label: 'Meal Plans', icon: CalendarDays, match: '/meal-plans' },
  { to: '/shopping-lists', label: 'Shopping Lists', icon: ShoppingCart, match: '/shopping-lists' },
  { to: '/cooking-plans', label: 'Cooking Plans', icon: CookingPot, match: '/cooking-plan' },
{ to: '/preferences', label: 'Preferences', icon: Settings2, match: '/preferences' },
  { to: '/ingredients', label: 'Ingredients', icon: Salad, match: '/ingredients' },
  { to: '/developer', label: 'Developer', icon: Wrench, match: '/developer' },
];

export default function Navigation() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isDrawerOpen]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  // Hide navigation on home page (after all hooks)
  if (location.pathname === '/') return null;

  const isActive = (link: typeof navLinks[0]) =>
    link.match ? location.pathname.startsWith(link.match) : false;

  return (
    <nav className="bg-surface shadow-sm border-b border-border-default sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop nav (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex-1 flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-text-secondary hover:text-accent active:text-accent-hover font-medium flex items-center gap-1.5 transition-colors ${
                    isActive(link) ? 'text-accent' : ''
                  }`}
                >
                  {link.to === '/' && <Icon className="w-5 h-5" />}
                  {link.label}
                </Link>
              );
            })}
          </div>
          {/* Theme Picker (desktop) */}
          <ThemePicker />
        </div>

        {/* Mobile nav header (hidden on desktop) */}
        <div className="flex md:hidden items-center justify-between">
          <Link to="/" className="font-bold text-lg text-text-primary">
            MealPlan
          </Link>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary active:text-accent rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-72 bg-surface shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <span className="font-bold text-lg text-text-primary">Menu</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted active:text-text-primary rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors active:bg-hover-bg ${
                      active
                        ? 'text-accent bg-accent-light'
                        : 'text-text-secondary'
                    }`}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            {/* Theme Picker (mobile drawer) */}
            <div className="border-t border-border-default">
              <ThemePicker inline />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
