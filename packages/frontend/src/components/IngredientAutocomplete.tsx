import { useState, useRef, useEffect } from 'react';
import { useIngredients } from '../hooks/useIngredients';
import type { Ingredient } from '../types/recipe';

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function IngredientAutocomplete({
  value,
  onChange,
  placeholder = 'Ingredient name *',
  required = false,
  className = '',
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: ingredients = [], isLoading } = useIngredients(searchTerm);

  // Update searchTerm when value changes externally (e.g., form reset)
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

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
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSearchTerm(ingredient.name);
    onChange(ingredient.name);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showDropdown = isOpen && searchTerm.length > 0 && filteredIngredients.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
          ) : (
            <ul className="py-1">
              {filteredIngredients.slice(0, 10).map((ingredient) => (
                <li
                  key={ingredient.id}
                  onClick={() => handleSelectIngredient(ingredient)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
                >
                  <div className="font-medium">{ingredient.name}</div>
                  {ingredient.category && (
                    <div className="text-xs text-gray-500">{ingredient.category}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
