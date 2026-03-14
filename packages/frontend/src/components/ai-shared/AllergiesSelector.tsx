const ALLERGY_OPTIONS = [
  'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Eggs', 'Milk/Dairy',
  'Wheat/Gluten', 'Soy', 'Sesame',
];

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export default function AllergiesSelector({
  selected,
  onChange,
  label = 'Allergies',
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
        {ALLERGY_OPTIONS.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selected.includes(opt)
                ? 'bg-red-500 text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-red-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
