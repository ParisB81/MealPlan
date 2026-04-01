import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoalPlanner from '../components/GoalPlanner';
import {
  CalendarDays, BookOpen, SlidersHorizontal,
  Sparkles, Wrench, X,
} from 'lucide-react';

/** Fixed brand colors per tile — theme-independent (Palette C: Jewel Tones) */
const TILE = {
  meals:     { from: '#047857', to: '#059669' },
  recipes:   { from: '#b45309', to: '#d97706' },
  prefs:     { from: '#be185d', to: '#db2777' },
  think:     { from: '#7c3aed', to: '#a855f7' },
  developer: { from: '#475569', to: '#64748b' },
} as const;

const SHIMMER = 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.12) 0%, transparent 55%)';

export default function HomePage() {
  const [isThinkSheetOpen, setIsThinkSheetOpen] = useState(false);
  const [isDesktopGoalOpen, setIsDesktopGoalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* ─── MOBILE LAYOUT (hidden on md+) ─── */}
      <div className="md:hidden min-h-screen bg-page-bg pb-20">

        {/* 2x2 tile grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-3">

          {/* Tile 1: Plan my Meals */}
          <button
            onClick={() => navigate('/plan-my-meals')}
            className="flex flex-col items-center p-5 rounded-3xl active:scale-[0.97] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.meals.from} 0%, ${TILE.meals.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-3 border border-white/25 relative">
              <CalendarDays className="w-10 h-10 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white text-center leading-tight relative">
              Plan my<br />Meals
            </span>
            <span className="text-sm text-white/70 mt-1 text-center leading-snug relative">
              Plans · Shopping · Cooking
            </span>
          </button>

          {/* Tile 2: Recipes & Collections */}
          <button
            onClick={() => navigate('/recipes-collections')}
            className="flex flex-col items-center p-5 rounded-3xl active:scale-[0.97] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.recipes.from} 0%, ${TILE.recipes.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-3 border border-white/25 relative">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white text-center leading-tight relative">
              Recipes &<br />Collections
            </span>
            <span className="text-sm text-white/70 mt-1 text-center leading-snug relative">
              Browse · Collect · AI
            </span>
          </button>

          {/* Tile 3: My Preferences */}
          <button
            onClick={() => navigate('/preferences')}
            className="flex flex-col items-center p-5 rounded-3xl active:scale-[0.97] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.prefs.from} 0%, ${TILE.prefs.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-3 border border-white/25 relative">
              <SlidersHorizontal className="w-10 h-10 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white text-center leading-tight relative">
              My<br />Preferences
            </span>
            <span className="text-sm text-white/70 mt-1 text-center leading-snug relative">
              Taste · Diet · Cuisines
            </span>
          </button>

          {/* Tile 4: Think of Something! */}
          <button
            onClick={() => setIsThinkSheetOpen(true)}
            className="flex flex-col items-center p-5 rounded-3xl active:scale-[0.97] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.think.from} 0%, ${TILE.think.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-3 border border-white/25 relative">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <span className="text-xl font-black text-white text-center leading-tight relative">
              Think of<br />Something!
            </span>
            <span className="text-sm text-white/70 mt-1 text-center leading-snug relative">
              AI-Powered
            </span>
          </button>
        </div>

        {/* Developer Tools — below 2x2 grid */}
        <div className="px-4 pb-3">
          <button
            onClick={() => navigate('/developer')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl active:scale-[0.98] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, ${TILE.developer.from} 0%, ${TILE.developer.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white/15 border border-white/25">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-extrabold text-base text-white">Developer Tools</div>
              <div className="text-xs text-white/70 mt-0.5">Assets · Tags · Ingredients</div>
            </div>
            <span className="text-xl text-white/60 font-light">›</span>
          </button>
        </div>
      </div>

      {/* ─── Think of Something! bottom sheet (mobile only) ─── */}
      {isThinkSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 pointer-events-auto"
            onClick={() => setIsThinkSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-surface shadow-2xl max-h-[82vh] flex flex-col pointer-events-auto">
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
            <div className="flex-1 overflow-y-auto">
              <GoalPlanner />
            </div>
          </div>
        </div>
      )}

      {/* ─── DESKTOP LAYOUT (hidden on mobile) ─── */}
      <div className="hidden md:block container mx-auto px-6 pt-6 pb-10 max-w-6xl">

        {/* 5-column tile grid */}
        <div className="grid grid-cols-5 gap-5 mb-6">

          {/* 1. Plan my Meals */}
          <button
            onClick={() => navigate('/plan-my-meals')}
            className="flex flex-col items-center p-7 rounded-3xl active:scale-[0.98] hover:scale-[1.02] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.meals.from} 0%, ${TILE.meals.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4 border border-white/25 relative">
              <CalendarDays className="w-11 h-11 text-white" />
            </div>
            <span className="text-base font-extrabold text-white leading-tight text-center relative">
              Plan my Meals
            </span>
            <span className="text-xs text-white/70 mt-2 text-center leading-snug relative">
              Plans · Shopping · Cooking
            </span>
          </button>

          {/* 2. Recipes & Collections */}
          <button
            onClick={() => navigate('/recipes-collections')}
            className="flex flex-col items-center p-7 rounded-3xl active:scale-[0.98] hover:scale-[1.02] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.recipes.from} 0%, ${TILE.recipes.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4 border border-white/25 relative">
              <BookOpen className="w-11 h-11 text-white" />
            </div>
            <span className="text-base font-extrabold text-white leading-tight text-center relative">
              Recipes &amp; Collections
            </span>
            <span className="text-xs text-white/70 mt-2 text-center leading-snug relative">
              Browse · Collect · AI
            </span>
          </button>

          {/* 3. Think of Something! — opens GoalPlanner modal */}
          <button
            onClick={() => setIsDesktopGoalOpen(true)}
            className="flex flex-col items-center p-7 rounded-3xl active:scale-[0.98] hover:scale-[1.02] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.think.from} 0%, ${TILE.think.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4 border border-white/25 relative flex-shrink-0">
              <Sparkles className="w-11 h-11 text-white" />
            </div>
            <span className="text-base font-black text-white text-center leading-tight relative">
              Think of<br />Something!
            </span>
            <span className="text-xs text-white/70 mt-2 text-center relative leading-snug">
              AI-Powered
            </span>
          </button>

          {/* 4. My Preferences */}
          <button
            onClick={() => navigate('/preferences')}
            className="flex flex-col items-center p-7 rounded-3xl active:scale-[0.98] hover:scale-[1.02] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.prefs.from} 0%, ${TILE.prefs.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4 border border-white/25 relative">
              <SlidersHorizontal className="w-11 h-11 text-white" />
            </div>
            <span className="text-base font-extrabold text-white leading-tight text-center relative">
              My Preferences
            </span>
            <span className="text-xs text-white/70 mt-2 text-center leading-snug relative">
              Taste &amp; Diet · Cuisines
            </span>
          </button>

          {/* 5. Developer Tools */}
          <button
            onClick={() => navigate('/developer')}
            className="flex flex-col items-center p-7 rounded-3xl active:scale-[0.98] hover:scale-[1.02] transition-transform overflow-hidden relative"
            style={{
              background: `linear-gradient(155deg, ${TILE.developer.from} 0%, ${TILE.developer.to} 100%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: SHIMMER }} />
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4 border border-white/25 relative">
              <Wrench className="w-11 h-11 text-white" />
            </div>
            <span className="text-base font-extrabold text-white leading-tight text-center relative">
              Developer Tools
            </span>
            <span className="text-xs text-white/70 mt-2 text-center leading-snug relative">
              Assets · Tags · More
            </span>
          </button>

        </div>

      </div>

      {/* ─── Desktop: GoalPlanner modal ─── */}
      {isDesktopGoalOpen && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsDesktopGoalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div
              className="px-6 py-5 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${TILE.think.from} 0%, ${TILE.think.to} 100%)` }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
              <div className="flex items-center justify-between relative">
                <div>
                  <h3 className="text-2xl font-black text-white">Think of Something!</h3>
                  <p className="text-sm text-white/70 mt-0.5">Tell me what you feel like today</p>
                </div>
                <button
                  onClick={() => setIsDesktopGoalOpen(false)}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* GoalPlanner (no card wrapper — modal provides the container) */}
            <div className="p-6">
              <GoalPlanner noCard />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
