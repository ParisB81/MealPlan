import { TAG_CATEGORIES } from '../../data/tagDefinitions';

const METHOD_OPTIONS = TAG_CATEGORIES.find(c => c.name === 'Method')?.tags || [];

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export default function CookingMethodSelector({
  selected,
  onChange,
  label = 'Preferred cooking methods',
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
        {METHOD_OPTIONS.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selected.includes(opt)
                ? 'bg-rose-500 text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-rose-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
