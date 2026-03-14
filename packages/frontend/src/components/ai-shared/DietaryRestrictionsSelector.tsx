const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free',
  'Low-carb', 'Keto', 'Paleo', 'Mediterranean', 'Whole30',
];

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export default function DietaryRestrictionsSelector({
  selected,
  onChange,
  label = 'Dietary restrictions',
}: Props) {
  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter(i => i !== item)
        : [...selected, item]
    );
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-3">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {DIETARY_OPTIONS.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selected.includes(opt)
                ? 'bg-green-500 text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-green-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
