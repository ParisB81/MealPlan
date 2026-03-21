import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, Sparkles, Salad, UtensilsCrossed,
  ShoppingCart, ArrowRight, FolderHeart, Dices, AlertCircle,
} from 'lucide-react';
import { Button } from './ui';
import { parseGoal, buildGoalNavigation, goalSummary } from '../utils/goalParser';
import { useMealPlans } from '../hooks/useMealPlans';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { useRecipes } from '../hooks/useRecipes';
import { TAG_CATEGORIES } from '../data/tagDefinitions';

// --- Types ---

interface Suggestion {
  label: string;
  icon: React.ElementType;
  text: string;
  contextual?: boolean; // true = data-driven, shown with accent style
}

// --- Static suggestions (fallbacks) ---

const STATIC_SUGGESTIONS: Suggestion[] = [
  { label: 'Plan my week', icon: CalendarDays, text: 'I want a healthy meal plan for the week' },
  { label: 'Quick dinners', icon: Clock, text: 'Quick easy dinner recipes under 30 minutes' },
  { label: 'Vegetarian ideas', icon: Salad, text: 'Vegetarian recipe ideas' },
  { label: 'Greek collection', icon: FolderHeart, text: 'Make a collection of Greek recipes' },
  { label: 'Something with chicken', icon: UtensilsCrossed, text: 'Recipe ideas with chicken' },
  { label: 'Shopping list', icon: ShoppingCart, text: 'Create a shopping list' },
];

// --- Time-of-day suggestions (#5) ---

function getTimeOfDaySuggestions(): Suggestion[] {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    // Morning
    return [
      { label: 'Breakfast ideas', icon: UtensilsCrossed, text: 'Quick healthy breakfast recipes' },
      { label: 'Brunch recipes', icon: Clock, text: 'Easy brunch recipe ideas' },
    ];
  } else if (hour >= 11 && hour < 15) {
    // Midday
    return [
      { label: 'Lunch ideas', icon: UtensilsCrossed, text: 'Quick easy lunch recipes' },
      { label: 'Light salads', icon: Salad, text: 'Fresh light salad recipes' },
    ];
  } else if (hour >= 15 && hour < 20) {
    // Afternoon/Evening
    return [
      { label: 'Tonight\'s dinner', icon: Clock, text: 'Quick easy dinner recipes under 30 minutes' },
      { label: 'Hearty dinners', icon: UtensilsCrossed, text: 'Hearty comfort dinner recipes' },
    ];
  } else {
    // Late night
    return [
      { label: 'Meal prep tomorrow', icon: CalendarDays, text: 'I want a healthy meal plan for the week' },
      { label: 'Quick snacks', icon: Clock, text: 'Easy quick snack recipes' },
    ];
  }
}

// --- Contextual suggestions (#1) ---

function useContextualSuggestions(): Suggestion[] {
  const { data: mealPlans } = useMealPlans('active');
  const { data: shoppingLists } = useShoppingLists('active');
  const { data: recipesData } = useRecipes();
  const recipes = recipesData?.recipes;

  return useMemo(() => {
    const suggestions: Suggestion[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if current meal plan is ending soon
    if (mealPlans?.length) {
      const sortedPlans = [...mealPlans].sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );
      const latest = sortedPlans[0];
      const endDate = new Date(latest.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 2 && daysLeft >= -1) {
        suggestions.push({
          label: 'Plan next week',
          icon: CalendarDays,
          text: 'I want a healthy meal plan for next week',
          contextual: true,
        });
      }

      // Check if any meal plan has no shopping list
      const plansWithShoppingLists = new Set(
        shoppingLists?.map(sl => sl.mealPlanId).filter(Boolean) ?? []
      );
      const planWithoutList = sortedPlans.find(
        p => !plansWithShoppingLists.has(p.id) && new Date(p.endDate) >= today
      );
      if (planWithoutList) {
        const shortName = planWithoutList.name.length > 20
          ? planWithoutList.name.slice(0, 18) + '...'
          : planWithoutList.name;
        suggestions.push({
          label: `Shop for "${shortName}"`,
          icon: ShoppingCart,
          text: 'Create a shopping list',
          contextual: true,
        });
      }
    }

    // Cuisine gap: find cuisines the user hasn't cooked recently
    if (recipes && recipes.length > 10) {
      const countryTags = TAG_CATEGORIES.find(c => c.name === 'Country')?.tags ?? [];
      const recipeTags = recipes.flatMap(r => r.tags ?? []);
      const usedCuisines = new Set(recipeTags.filter((t: string) => countryTags.includes(t)));
      const unusedCuisines = countryTags.filter(
        t => t !== 'International' && !usedCuisines.has(t)
      );
      if (unusedCuisines.length > 0) {
        const randomCuisine = unusedCuisines[Math.floor(Math.random() * unusedCuisines.length)];
        suggestions.push({
          label: `Try ${randomCuisine}`,
          icon: Sparkles,
          text: `${randomCuisine} recipe ideas`,
          contextual: true,
        });
      }
    }

    return suggestions.slice(0, 2); // Max 2 contextual suggestions
  }, [mealPlans, shoppingLists, recipes]);
}

// --- Rotating placeholders (#2) ---

const PLACEHOLDER_EXAMPLES = [
  'Plan a healthy Mediterranean week...',
  'Creamy Indian dinner ideas...',
  'Vegetarian spring recipes...',
  'Quick Greek lunches under 30 min...',
  'Make a collection of comfort food...',
  'Spicy Thai chicken dishes...',
  'Easy meal prep for the week...',
  'Low-carb dinner recipes...',
];

function useRotatingPlaceholder(): string {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return `e.g., ${PLACEHOLDER_EXAMPLES[index]}`;
}

// --- Feeling Lucky (#3) ---

const LUCKY_CUISINES = ['Greek', 'Italian', 'Indian', 'Thai', 'Mexican', 'French', 'Japanese', 'Lebanese', 'Turkish', 'Spanish'];
const LUCKY_DESCRIPTORS = ['creamy', 'spicy', 'healthy', 'quick', 'hearty', 'fresh', 'savory', 'light', 'comfort', 'easy'];
const LUCKY_MEALS = ['breakfast', 'lunch', 'dinner'];
const LUCKY_PROTEINS = ['chicken', 'beef', 'fish', 'vegetables', 'lentils', 'shrimp'];

function generateLuckyText(): string {
  const cuisine = LUCKY_CUISINES[Math.floor(Math.random() * LUCKY_CUISINES.length)];
  const descriptor = LUCKY_DESCRIPTORS[Math.floor(Math.random() * LUCKY_DESCRIPTORS.length)];
  const meal = LUCKY_MEALS[Math.floor(Math.random() * LUCKY_MEALS.length)];
  const protein = LUCKY_PROTEINS[Math.floor(Math.random() * LUCKY_PROTEINS.length)];

  // Randomly pick a template
  const templates = [
    `${descriptor} ${cuisine} ${meal} recipes`,
    `${descriptor} ${protein} ${meal} ideas`,
    `${cuisine} ${protein} recipes`,
    `${descriptor} ${meal} recipes with ${protein}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// --- Component ---

export default function GoalPlanner() {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const placeholder = useRotatingPlaceholder();

  // Data-driven suggestions
  const contextualSuggestions = useContextualSuggestions();
  const timeOfDaySuggestions = getTimeOfDaySuggestions();

  // Build final suggestions list: contextual first, then time-of-day, then static (fill to ~6)
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [...contextualSuggestions];
    const usedLabels = new Set(result.map(s => s.label));

    // Add time-of-day suggestions
    for (const s of timeOfDaySuggestions) {
      if (!usedLabels.has(s.label) && result.length < 6) {
        result.push(s);
        usedLabels.add(s.label);
      }
    }

    // Fill remaining with static suggestions
    for (const s of STATIC_SUGGESTIONS) {
      if (!usedLabels.has(s.label) && result.length < 6) {
        // Skip if it overlaps with a time-of-day suggestion's text
        const overlaps = result.some(r => r.text === s.text);
        if (!overlaps) {
          result.push(s);
          usedLabels.add(s.label);
        }
      }
    }

    return result.slice(0, 6);
  }, [contextualSuggestions, timeOfDaySuggestions]);

  const parsed = useMemo(() => {
    if (inputText.trim().length < 3) return null;
    return parseGoal(inputText);
  }, [inputText]);

  const summary = useMemo(() => {
    if (!parsed) return '';
    return goalSummary(parsed);
  }, [parsed]);

  const handleGo = useCallback((text?: string) => {
    const goal = parseGoal(text ?? inputText);
    const { path, state } = buildGoalNavigation(goal);
    navigate(path, { state });
  }, [inputText, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputText.trim().length >= 3) {
      handleGo();
    }
  };

  const handleFeelingLucky = () => {
    const text = generateLuckyText();
    setInputText(text);
    handleGo(text);
  };

  return (
    <div className="max-w-3xl mx-auto mb-10">
      <div className="bg-surface border-2 border-border-default rounded-2xl p-5 md:p-7 shadow-lg">
        {/* Heading */}
        <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-1">
          What would you like to do today?
        </h2>
        <p className="text-base text-text-muted mb-5">
          Describe your goal and we'll guide you through it
        </p>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 pb-3">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setInputText(s.text);
                handleGo(s.text);
              }}
              className={`flex items-center gap-2 border rounded-xl
                         px-3.5 py-2 text-sm font-medium
                         hover:shadow-md transition-all cursor-pointer active:scale-95
                         min-h-[44px]
                         ${s.contextual
                           ? 'bg-accent/10 border-accent/30 text-accent-dark hover:border-accent'
                           : 'bg-sec-ai/10 border-sec-ai/30 text-sec-ai hover:bg-sec-ai/20'
                         }`}
            >
              {s.contextual && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              {!s.contextual && <s.icon className="w-4 h-4 flex-shrink-0 opacity-80" />}
              {s.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-surface border border-border-default rounded-xl px-4 py-3 text-base
                       text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                       min-h-[48px] transition-colors"
          />
          <button
            onClick={handleFeelingLucky}
            title="Feeling lucky — surprise me!"
            className="bg-surface-alt border border-border-default rounded-xl px-3
                       text-text-muted hover:text-accent hover:border-accent
                       transition-all active:scale-95 min-h-[44px] flex-shrink-0"
          >
            <Dices className="w-5 h-5" />
          </button>
          <Button
            variant="primary"
            onClick={() => handleGo()}
            disabled={inputText.trim().length < 3}
            className="rounded-xl px-4"
          >
            <span className="hidden sm:inline mr-1.5">Let's go</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Parsed intent preview */}
        {summary && (
          <p className="text-xs text-text-muted mt-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 flex-shrink-0" />
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
