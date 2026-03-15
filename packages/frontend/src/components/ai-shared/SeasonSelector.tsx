const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
type Season = (typeof SEASONS)[number];

interface Props {
  selected: Season | null;
  onChange: (season: Season | null) => void;
  label?: string;
}

export default function SeasonSelector({ selected, onChange, label = 'Season' }: Props) {
  const toggle = (season: Season) => {
    onChange(selected === season ? null : season);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-3">{label}</label>
      )}
      <div className="flex flex-wrap gap-2">
        {SEASONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selected === s
                ? 'bg-teal-500 text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-teal-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-text-muted mt-2">
          AI will prioritize seasonal ingredients for Greece in {selected.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
