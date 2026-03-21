import { Link } from 'react-router-dom';
import { UtensilsCrossed, FolderHeart, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const OPTIONS = [
  {
    to: '/recipes',
    icon: UtensilsCrossed,
    iconBg: 'bg-sec-recipes',
    title: 'Recipes Database',
    desc: 'Browse, search, filter and import recipes',
  },
  {
    to: '/collections',
    icon: FolderHeart,
    iconBg: 'bg-sec-collections',
    title: 'My Collections',
    desc: 'Organise recipes into named collections',
  },
  {
    to: '/recipes/ai-generate',
    icon: Sparkles,
    iconBg: 'bg-sec-ai-recipes',
    title: 'Generate AI Recipes',
    desc: 'Create new recipes with Claude AI',
  },
];

export default function RecipesCollectionsPage() {
  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <Link
          to="/"
          className="md:hidden inline-flex items-center gap-1 text-text-muted text-sm mb-5 active:text-accent"
        >
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Recipes & Collections</h1>
          <p className="text-text-secondary text-sm">
            Browse the recipe database, organise your favourites, or generate new recipes with AI.
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
                  <div className="font-bold text-text-primary text-base">{title}</div>
                  <div className="text-text-secondary text-sm mt-0.5">{desc}</div>
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
