import { useState, useRef, useEffect } from 'react';
import { ALL_TAGS, TAG_CATEGORIES } from '../data/tagDefinitions';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectTag: (tag: string) => void;
  onAddCustomTag?: () => void;
  existingTags: string[];
  placeholder?: string;
  className?: string;
}

export default function TagAutocomplete({
  value,
  onChange,
  onSelectTag,
  onAddCustomTag,
  existingTags,
  placeholder = 'Add a tag...',
  className = '',
}: TagAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectTag = (tag: string) => {
    onSelectTag(tag);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredTags.length > 0) {
        // Select the first matching suggestion
        handleSelectTag(filteredTags[0]);
      } else if (onAddCustomTag) {
        // No suggestions — add as custom tag
        onAddCustomTag();
      }
    }
  };

  // Filter tags: exclude existing, match search term (case-insensitive)
  const searchLower = value.toLowerCase().trim();
  const filteredTags = ALL_TAGS.filter(
    (tag) =>
      !existingTags.some(t => t.toLowerCase() === tag.toLowerCase()) &&
      (searchLower === '' || tag.toLowerCase().includes(searchLower))
  );

  // Group filtered tags by category
  const groupedTags: { name: string; color: string; tags: string[] }[] = [];
  for (const category of TAG_CATEGORIES) {
    const categoryTags = filteredTags.filter((tag) =>
      category.tags.includes(tag)
    );
    if (categoryTags.length > 0) {
      groupedTags.push({
        name: category.name,
        color: category.color,
        tags: categoryTags,
      });
    }
  }

  const showDropdown = isOpen && filteredTags.length > 0;

  // Color mapping for category headers
  const categoryHeaderColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-800',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  };

  // Color mapping for tag dots
  const tagDotColors: Record<string, string> = {
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    purple: 'bg-purple-400',
    orange: 'bg-orange-400',
    red: 'bg-red-400',
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {groupedTags.map((group) => (
            <div key={group.name} className="py-1">
              <div
                className={`px-4 py-2 text-xs font-semibold uppercase sticky top-0 ${
                  categoryHeaderColors[group.color] || 'bg-gray-50 text-gray-500'
                }`}
              >
                {group.name}
              </div>
              <ul>
                {group.tags.map((tag) => (
                  <li
                    key={tag}
                    onClick={() => handleSelectTag(tag)}
                    className="px-4 py-2.5 min-h-[44px] flex items-center gap-2 hover:bg-blue-50 active:bg-blue-100 cursor-pointer text-sm text-gray-900"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        tagDotColors[group.color] || 'bg-gray-400'
                      }`}
                    />
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
