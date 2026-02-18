import { useState, useRef, useEffect } from 'react';
import unitsData from '../../../shared/src/data/units.json';

interface Unit {
  unit: string;
  type: string;
}

interface UnitAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function UnitAutocomplete({
  value,
  onChange,
  placeholder = 'Unit *',
  required = false,
  className = '',
}: UnitAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const units: Unit[] = unitsData;

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

  const handleSelectUnit = (unit: Unit) => {
    setSearchTerm(unit.unit);
    onChange(unit.unit);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Filter units based on search term (case-insensitive)
  const filteredUnits = units.filter((u) =>
    u.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group units by type for better organization
  const groupedUnits: Record<string, Unit[]> = {};
  filteredUnits.forEach((unit) => {
    if (!groupedUnits[unit.type]) {
      groupedUnits[unit.type] = [];
    }
    groupedUnits[unit.type].push(unit);
  });

  const showDropdown = isOpen && filteredUnits.length > 0;

  // Type labels for better readability
  const typeLabels: Record<string, string> = {
    weight: 'Weight',
    volume: 'Volume',
    count: 'Count',
    small_quantity: 'Small Quantity',
    size: 'Size',
    package: 'Package',
  };

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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {Object.entries(groupedUnits).map(([type, typeUnits]) => (
            <div key={type} className="py-1">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                {typeLabels[type] || type}
              </div>
              <ul>
                {typeUnits.map((unit) => (
                  <li
                    key={unit.unit}
                    onClick={() => handleSelectUnit(unit)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
                  >
                    {unit.unit}
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
