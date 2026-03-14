interface Props {
  likes: string;
  dislikes: string;
  onLikesChange: (value: string) => void;
  onDislikesChange: (value: string) => void;
}

export default function IngredientPreferencesFields({
  likes,
  dislikes,
  onLikesChange,
  onDislikesChange,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Ingredient preferences (more of)
      </label>
      <textarea
        value={likes}
        onChange={(e) => onLikesChange(e.target.value)}
        placeholder="e.g., more lentils, chickpeas, leafy greens, olive oil"
        rows={2}
        className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface mb-4"
      />
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Ingredient preferences (less or none of)
      </label>
      <textarea
        value={dislikes}
        onChange={(e) => onDislikesChange(e.target.value)}
        placeholder="e.g., no cilantro, less red meat, avoid processed sugar"
        rows={2}
        className="w-full border border-border-default rounded-lg px-3 py-2 text-text-primary bg-surface"
      />
    </div>
  );
}
