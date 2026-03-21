import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemePicker from '../components/ThemePicker';
import GoalPlanner from '../components/GoalPlanner';
import {
  CalendarDays, BookOpen, SlidersHorizontal,
  Sparkles, Wrench, X, ChevronRight,
} from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function HomePage() {
  const [isThinkSheetOpen, setIsThinkSheetOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* ─── MOBILE LAYOUT (hidden on md+) ─── */}
      <div className="md:hidden min-h-screen bg-page-bg pb-20">

        {/* Logo bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border-default">
          <span className="text-lg font-extrabold text-text-primary tracking-tight">🍽 MealPlan</span>
          <ThemePicker />
        </div>

        {/* Greeting */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            {getGreeting()} 👋
          </h2>
          <p className="text-sm text-text-secondary mt-1">{getTodayLabel()}</p>
        </div>

        {/* 2-column tile grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">

          {/* Tile 1: Plan my Meals */}
          <button
            onClick={() => navigate('/plan-my-meals')}
            className="flex flex-col items-center p-5 rounded-3xl border border-border-default bg-surface active:scale-[0.97] transition-transform text-left"
            style={{
              background: 'linear-gradient(155deg, var(--color-surface) 0%, var(--color-sec-mealplans-light) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--color-sec-mealplans)', boxShadow: '0 4px 16px rgba(0,0,0,0.22), 0 0 0 4px var(--color-sec-mealplans-light)' }}
            >
              <CalendarDays className="w-10 h-10 text-white" />
            </div>
            <span className="text-lg font-extrabold text-center leading-tight" style={{ color: 'var(--color-sec-mealplans)' }}>
              Plan my<br />Meals
            </span>
            <span className="text-sm text-text-muted mt-1 text-center leading-snug">
              Plans · Shopping · Cooking
            </span>
          </button>

          {/* Tile 2: Recipes & Collections */}
          <button
            onClick={() => navigate('/recipes-collections')}
            className="flex flex-col items-center p-5 rounded-3xl border border-border-default bg-surface active:scale-[0.97] transition-transform text-left"
            style={{
              background: 'linear-gradient(155deg, var(--color-surface) 0%, var(--color-sec-recipes-light) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--color-sec-recipes)', boxShadow: '0 4px 16px rgba(0,0,0,0.22), 0 0 0 4px var(--color-sec-recipes-light)' }}
            >
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <span className="text-lg font-extrabold text-center leading-tight" style={{ color: 'var(--color-sec-recipes)' }}>
              Recipes &<br />Collections
            </span>
            <span className="text-sm text-text-muted mt-1 text-center leading-snug">
              Browse · Collect · AI
            </span>
          </button>

          {/* Think of Something! CTA — above Preferences */}
          <button
            onClick={() => setIsThinkSheetOpen(true)}
            className="col-span-2 rounded-3xl active:scale-[0.98] transition-transform overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, var(--color-sec-ai) 0%, var(--color-sec-prefs) 100%)',
              boxShadow: '0 6px 28px rgba(0,0,0,0.22)',
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.12) 0%, transparent 55%)' }}
            />
            <div className="flex items-center gap-4 px-5 py-5 relative">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/25">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[10px] font-bold tracking-widest uppercase text-white/55 mb-0.5">
                  ✦ AI-Powered
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  Think of Something!
                </div>
                <div className="text-sm text-white/70 mt-0.5">
                  What would you like to do today?
                </div>
              </div>
              <span className="text-2xl text-white/60 font-light">›</span>
            </div>
          </button>

          {/* Wide tile: My Preferences */}
          <button
            onClick={() => navigate('/preferences')}
            className="col-span-2 flex items-center gap-4 px-5 py-4 rounded-3xl border border-border-default active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-sec-prefs-light) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-sec-prefs)', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}
            >
              <SlidersHorizontal className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-extrabold text-xl" style={{ color: 'var(--color-sec-prefs)' }}>
                My Preferences
              </div>
              <div className="text-sm text-text-muted mt-0.5">
                Taste & Diet · Cuisines · Cooking Methods
              </div>
            </div>
            <span className="text-2xl text-text-muted font-light">›</span>
          </button>

          {/* Developer button */}
          <button
            onClick={() => navigate('/developer')}
            className="col-span-2 flex items-center gap-4 px-5 py-3 rounded-3xl border border-border-default active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-alt) 100%)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-text-muted/15">
              <Wrench className="w-5 h-5 text-text-muted" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-bold text-base text-text-secondary">Developer Tools</div>
              <div className="text-sm text-text-muted mt-0.5">Assets · Tags · Ingredients</div>
            </div>
            <span className="text-xl text-text-muted font-light">›</span>
          </button>
        </div>
      </div>

      {/* ─── Think of Something! bottom sheet (mobile only) ─── */}
      {isThinkSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsThinkSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-surface shadow-2xl max-h-[82vh] flex flex-col">
            {/* Handle + header */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border-default">
              <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-text-primary">Think of Something!</h3>
                  <p className="text-sm text-text-muted mt-0.5">Tell me what you feel like today</p>
                </div>
                <button
                  onClick={() => setIsThinkSheetOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted active:bg-hover-bg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* GoalPlanner content */}
            <div
              className="flex-1 overflow-y-auto"
              onClick={() => setIsThinkSheetOpen(false)}
            >
              <GoalPlanner />
            </div>
          </div>
        </div>
      )}

      {/* ─── DESKTOP LAYOUT (hidden on mobile) ─── */}
      <div className="hidden md:block container mx-auto px-6 py-10 max-w-6xl">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-text-secondary mt-2 text-base">{getTodayLabel()}</p>
        </div>

        {/* Two-column layout: tiles left (7/12), GoalPlanner sidebar right (5/12) */}
        <div className="grid grid-cols-12 gap-6 mb-6">

          {/* LEFT — tiles mirroring mobile layout */}
          <div className="col-span-7 flex flex-col gap-5">

            {/* Row 1: two square tiles side by side */}
            <div className="grid grid-cols-2 gap-5">

              {/* Plan my Meals */}
              <button
                onClick={() => navigate('/plan-my-meals')}
                className="flex flex-col items-center p-8 rounded-3xl border border-border-default active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(155deg, var(--color-surface) 0%, var(--color-sec-mealplans-light) 100%)' }}
              >
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center mb-5"
                  style={{
                    background: 'var(--color-sec-mealplans)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 0 0 6px var(--color-sec-mealplans-light)',
                  }}
                >
                  <CalendarDays className="w-12 h-12 text-white" />
                </div>
                <span className="text-lg font-extrabold leading-tight text-center" style={{ color: 'var(--color-sec-mealplans)' }}>
                  Plan my Meals
                </span>
                <span className="text-xs text-text-muted mt-2 text-center leading-snug">
                  Plans · Shopping · Cooking
                </span>
              </button>

              {/* Recipes & Collections */}
              <button
                onClick={() => navigate('/recipes-collections')}
                className="flex flex-col items-center p-8 rounded-3xl border border-border-default active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(155deg, var(--color-surface) 0%, var(--color-sec-recipes-light) 100%)' }}
              >
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: 'var(--color-sec-recipes)' }}
                >
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
                <span className="text-lg font-extrabold leading-tight text-center" style={{ color: 'var(--color-sec-recipes)' }}>
                  Recipes &amp; Collections
                </span>
                <span className="text-xs text-text-muted mt-2 text-center leading-snug">
                  Browse · Collect · AI
                </span>
              </button>

            </div>

            {/* Wide tile: My Preferences */}
            <button
              onClick={() => navigate('/preferences')}
              className="flex items-center gap-6 px-7 py-6 rounded-3xl border border-border-default active:scale-[0.99] transition-transform"
              style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-sec-prefs-light) 100%)' }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: 'var(--color-sec-prefs)' }}
              >
                <SlidersHorizontal className="w-9 h-9 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xl font-extrabold" style={{ color: 'var(--color-sec-prefs)' }}>
                  My Preferences
                </div>
                <div className="text-sm text-text-muted mt-1">
                  Taste &amp; Diet · Cuisines · Cooking Methods
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-text-muted flex-shrink-0" />
            </button>

            {/* Developer tools footnote */}
            <div>
              <Link
                to="/developer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-hover-bg transition-colors text-xs font-medium"
              >
                <Wrench className="w-3.5 h-3.5" />
                Developer Tools
              </Link>
            </div>

          </div>

          {/* RIGHT — GoalPlanner sidebar */}
          <div className="col-span-5 flex flex-col gap-5">

            {/* GoalPlanner card */}
            <div className="rounded-3xl border border-border-default shadow-sm overflow-hidden">
              <div
                className="px-6 py-6 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--color-sec-ai) 0%, var(--color-sec-prefs) 100%)' }}
              >
                {/* Shimmer overlay matching mobile */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.12) 0%, transparent 55%)' }}
                />
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/60">✦ AI-Powered</span>
                </div>
                <div className="text-2xl font-black text-white leading-tight relative">Think of Something!</div>
                <div className="text-sm text-white/70 mt-1.5 relative">Describe your goal and I'll guide you to the right tool.</div>
              </div>
              <div className="bg-surface px-5 py-4">
                <GoalPlanner />
              </div>
            </div>

            {/* Theme Picker */}
            <div className="bg-surface border border-border-default rounded-2xl px-5 py-4 shadow-sm">
              <ThemePicker inline />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
