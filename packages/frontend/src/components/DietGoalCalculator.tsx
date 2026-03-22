import { useState, useMemo } from 'react';
import { Button } from './ui';
import { Calculator, Plus, Trash2 } from 'lucide-react';

type Gender = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'very_active';
type Goal = 'lose' | 'maintain' | 'build';
type Mode = 'individual' | 'family';

interface PersonEntry {
  id: number;
  label: string;
  gender: Gender;
  age: number | null;
  weight: number | null;
  height: number | null;
  activity: Activity;
  goal: Goal;
}

const ACTIVITY_OPTIONS: { value: Activity; label: string; short: string }[] = [
  { value: 'sedentary', label: 'Sedentary', short: 'Sed.' },
  { value: 'light', label: 'Lightly active', short: 'Light' },
  { value: 'moderate', label: 'Moderately active', short: 'Mod.' },
  { value: 'very_active', label: 'Very active', short: 'Very' },
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

function calcTarget(p: PersonEntry) {
  if (!p.age || !p.weight || !p.height) return null;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'male' ? 5 : -161);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[p.activity]);
  const preset = GOAL_PRESETS[p.goal];
  return { tdee, targetCal: tdee + preset.calDelta, ...preset };
}

let nextId = 1;
function makePerson(label: string): PersonEntry {
  return { id: nextId++, label, gender: 'male', age: null, weight: null, height: null, activity: 'moderate', goal: 'maintain' };
}

interface Props {
  onApply: (calories: number, protein: number, carbs: number, fat: number) => void;
  /** When provided, also sets numberOfPersons alongside calorie/macro values */
  onApplyWithPersons?: (calories: number, protein: number, carbs: number, fat: number, persons: number) => void;
}

export default function DietGoalCalculator({ onApply, onApplyWithPersons }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('individual');

  // Individual mode state
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  // Family mode state
  const [persons, setPersons] = useState<PersonEntry[]>(() => [
    { ...makePerson('Person 1'), gender: 'male' },
    { ...makePerson('Person 2'), gender: 'female' },
  ]);

  const individualResult = useMemo(() => {
    if (!age || !weight || !height) return null;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
    const preset = GOAL_PRESETS[goal];
    const targetCal = tdee + preset.calDelta;
    return { tdee, targetCal, ...preset };
  }, [gender, age, weight, height, activity, goal]);

  const familyResult = useMemo(() => {
    const results = persons.map(p => calcTarget(p));
    const valid = results.filter(Boolean) as NonNullable<ReturnType<typeof calcTarget>>[];
    if (valid.length === 0) return null;

    const totalCal = valid.reduce((s, r) => s + r.targetCal, 0);
    const avgProtein = Math.round(valid.reduce((s, r) => s + r.protein, 0) / valid.length);
    const avgCarbs = Math.round(valid.reduce((s, r) => s + r.carbs, 0) / valid.length);
    const avgFat = Math.round(valid.reduce((s, r) => s + r.fat, 0) / valid.length);
    const perPerson = Math.round(totalCal / persons.length);

    return {
      totalCal,
      perPerson,
      avgProtein,
      avgCarbs,
      avgFat,
      count: persons.length,
      validCount: valid.length,
      personResults: results,
    };
  }, [persons]);

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

  const updatePerson = (id: number, patch: Partial<PersonEntry>) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const addPerson = () => {
    setPersons(prev => [...prev, makePerson(`Person ${prev.length + 1}`)]);
  };

  const removePerson = (id: number) => {
    if (persons.length <= 2) return;
    setPersons(prev => prev.filter(p => p.id !== id));
  };

  const handleApplyIndividual = () => {
    if (!individualResult) return;
    onApply(individualResult.targetCal, individualResult.protein, individualResult.carbs, individualResult.fat);
  };

  const handleApplyFamily = () => {
    if (!familyResult) return;
    if (onApplyWithPersons) {
      onApplyWithPersons(familyResult.perPerson, familyResult.avgProtein, familyResult.avgCarbs, familyResult.avgFat, familyResult.count);
    } else {
      onApply(familyResult.perPerson, familyResult.avgProtein, familyResult.avgCarbs, familyResult.avgFat);
    }
  };

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

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('individual')} className={chipClass(mode === 'individual')}>
          Individual
        </button>
        <button type="button" onClick={() => setMode('family')} className={chipClass(mode === 'family')}>
          Family / Group
        </button>
      </div>

      {mode === 'individual' ? (
        <>
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
                <input type="number" min="15" max="100" value={age ?? ''} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : null)} placeholder="—" className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface" />
                <span className="text-xs text-text-muted">yr</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Weight</label>
              <div className="flex items-center gap-1">
                <input type="number" min="30" max="300" value={weight ?? ''} onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)} placeholder="—" className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface" />
                <span className="text-xs text-text-muted">kg</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Height</label>
              <div className="flex items-center gap-1">
                <input type="number" min="100" max="250" value={height ?? ''} onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : null)} placeholder="—" className="w-16 border border-border-default rounded px-2 py-1 text-sm text-text-primary bg-surface" />
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
          {individualResult && (
            <div className="bg-surface border border-border-default rounded-lg px-4 py-3">
              <p className="text-sm text-text-primary">
                TDEE: <span className="font-medium">{individualResult.tdee} kcal/day</span>
                {individualResult.calDelta !== 0 && (
                  <span className="text-text-muted"> ({individualResult.calDelta > 0 ? '+' : ''}{individualResult.calDelta})</span>
                )}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Target: <span className="font-semibold text-accent">{individualResult.targetCal} kcal/day</span>
                {' '}({individualResult.protein}% protein, {individualResult.carbs}% carbs, {individualResult.fat}% fat)
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={handleApplyIndividual}>
                Apply these values
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Family mode */}
          <div className="space-y-3">
            {persons.map((p, idx) => {
              const r = calcTarget(p);
              return (
                <div key={p.id} className="bg-surface border border-border-default rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => updatePerson(p.id, { label: e.target.value })}
                      className="text-sm font-medium text-text-primary bg-transparent border-none outline-none w-32"
                      placeholder={`Person ${idx + 1}`}
                    />
                    {persons.length > 2 && (
                      <button type="button" onClick={() => removePerson(p.id)} className="text-text-muted hover:text-red-500 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Compact row: Gender + Age + Weight + Height */}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex gap-1">
                      {(['male', 'female'] as Gender[]).map(g => (
                        <button key={g} type="button" onClick={() => updatePerson(p.id, { gender: g })} className={`px-2 py-1 rounded text-xs transition-colors ${p.gender === g ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted'}`}>
                          {g === 'male' ? 'M' : 'F'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" min="5" max="100" value={p.age ?? ''} onChange={(e) => updatePerson(p.id, { age: e.target.value ? Number(e.target.value) : null })} placeholder="Age" className="w-12 border border-border-default rounded px-1.5 py-1 text-xs text-text-primary bg-surface" />
                      <span className="text-[10px] text-text-muted">yr</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" min="15" max="300" value={p.weight ?? ''} onChange={(e) => updatePerson(p.id, { weight: e.target.value ? Number(e.target.value) : null })} placeholder="Wt" className="w-12 border border-border-default rounded px-1.5 py-1 text-xs text-text-primary bg-surface" />
                      <span className="text-[10px] text-text-muted">kg</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" min="50" max="250" value={p.height ?? ''} onChange={(e) => updatePerson(p.id, { height: e.target.value ? Number(e.target.value) : null })} placeholder="Ht" className="w-12 border border-border-default rounded px-1.5 py-1 text-xs text-text-primary bg-surface" />
                      <span className="text-[10px] text-text-muted">cm</span>
                    </div>
                  </div>

                  {/* Activity + Goal */}
                  <div className="flex flex-wrap gap-1">
                    {ACTIVITY_OPTIONS.map(a => (
                      <button key={a.value} type="button" onClick={() => updatePerson(p.id, { activity: a.value })} className={`px-2 py-0.5 rounded text-xs transition-colors ${p.activity === a.value ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted'}`}>
                        {a.short}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {GOAL_OPTIONS.map(g => (
                      <button key={g.value} type="button" onClick={() => updatePerson(p.id, { goal: g.value })} className={`px-2 py-0.5 rounded text-xs transition-colors ${p.goal === g.value ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>

                  {/* Per-person result */}
                  {r && (
                    <p className="text-xs text-text-secondary">
                      Target: <span className="font-medium text-accent">{r.targetCal} kcal/day</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {persons.length < 12 && (
            <button type="button" onClick={addPerson} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover">
              <Plus className="w-4 h-4" /> Add person
            </button>
          )}

          {/* Family summary */}
          {familyResult && (
            <div className="bg-surface border border-border-default rounded-lg px-4 py-3">
              {familyResult.validCount < familyResult.count && (
                <p className="text-xs text-text-muted mb-1">{familyResult.validCount} of {familyResult.count} persons have complete data</p>
              )}
              <p className="text-sm text-text-primary">
                Family total: <span className="font-medium">{familyResult.totalCal} kcal/day</span>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Per person: <span className="font-semibold text-accent">{familyResult.perPerson} kcal/day</span>
                {' '}({familyResult.avgProtein}% protein, {familyResult.avgCarbs}% carbs, {familyResult.avgFat}% fat)
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={handleApplyFamily}>
                Apply per-person average ({familyResult.count} persons)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
