import { useState, useMemo } from 'react';
import { Button } from './ui';
import { Calculator } from 'lucide-react';

type Gender = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'very_active';
type Goal = 'lose' | 'maintain' | 'build';

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly active' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'very_active', label: 'Very active' },
];

const ACTIVITY_MULTIPLIERS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'build', label: 'Build muscle' },
];

const GOAL_PRESETS: Record<Goal, { calDelta: number; protein: number; carbs: number; fat: number }> = {
  lose: { calDelta: -500, protein: 30, carbs: 40, fat: 30 },
  maintain: { calDelta: 0, protein: 25, carbs: 50, fat: 25 },
  build: { calDelta: 300, protein: 35, carbs: 40, fat: 25 },
};

interface Props {
  onApply: (calories: number, protein: number, carbs: number, fat: number) => void;
}

export default function DietGoalCalculator({ onApply }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const result = useMemo(() => {
    if (!age || !weight || !height) return null;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
    const preset = GOAL_PRESETS[goal];
    const targetCal = tdee + preset.calDelta;
    return { tdee, targetCal, ...preset };
  }, [gender, age, weight, height, activity, goal]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm text-accent hover:text-accent-hover underline underline-offset-2 mb-2"
      >
        <Calculator className="w-3.5 h-3.5 inline mr-1" />
        Need help figuring out your targets?
      </button>
    );
  }

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm transition-colors ${
      active
        ? 'bg-accent text-white'
        : 'bg-surface-alt text-text-secondary hover:bg-accent-light'
    }`;

  return (
    <div className="mb-4 p-4 rounded-lg bg-page-bg border border-border-default space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Calorie Calculator</span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          Close
        </button>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Gender</label>
        <div className="flex gap-2">
          {(['male', 'female'] as Gender[]).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)} className={chipClass(gender === g)}>
              {g === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Age / Weight / Height */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Age</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="15"
              max="100"
              value={age ?? ''}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
            />
            <span className="text-xs text-text-muted">yr</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Weight</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="30"
              max="300"
              value={weight ?? ''}
              onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
            />
            <span className="text-xs text-text-muted">kg</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Height</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="100"
              max="250"
              value={height ?? ''}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface"
            />
            <span className="text-xs text-text-muted">cm</span>
          </div>
        </div>
      </div>

      {/* Activity level */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Activity level</label>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map(a => (
            <button key={a.value} type="button" onClick={() => setActivity(a.value)} className={chipClass(activity === a.value)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goal */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Goal</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map(g => (
            <button key={g.value} type="button" onClick={() => setGoal(g.value)} className={chipClass(goal === g.value)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface border border-border-default rounded-lg px-4 py-3">
          <p className="text-sm text-text-primary">
            TDEE: <span className="font-medium">{result.tdee} kcal/day</span>
            {result.calDelta !== 0 && (
              <span className="text-text-muted"> ({result.calDelta > 0 ? '+' : ''}{result.calDelta})</span>
            )}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Target: <span className="font-semibold text-accent">{result.targetCal} kcal/day</span>
            {' '}({result.protein}% protein, {result.carbs}% carbs, {result.fat}% fat)
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => onApply(result.targetCal, result.protein, result.carbs, result.fat)}
          >
            Apply these values
          </Button>
        </div>
      )}
    </div>
  );
}
