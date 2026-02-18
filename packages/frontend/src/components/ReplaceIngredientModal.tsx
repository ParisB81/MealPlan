import { useState, useEffect } from 'react';
import { useIngredients, useReplaceAndDeleteIngredient } from '../hooks/useIngredients';
import type { Ingredient } from '../types/recipe';
import { Modal, Input, Button, Alert, Badge } from './ui';

interface ReplaceIngredientModalProps {
  ingredientId: string;
  ingredientName: string;
  usageCount: number;
  shoppingListCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReplaceIngredientModal({
  ingredientId,
  ingredientName,
  usageCount,
  shoppingListCount,
  isOpen,
  onClose,
}: ReplaceIngredientModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const { data: ingredients, isLoading } = useIngredients(searchTerm);
  const replaceAndDelete = useReplaceAndDeleteIngredient();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedIngredient(null);
    }
  }, [isOpen]);

  // Filter out the ingredient being deleted
  const filteredIngredients = (ingredients || []).filter(
    (ing) => ing.id !== ingredientId
  );

  const handleSubmit = () => {
    if (!selectedIngredient) return;

    replaceAndDelete.mutate(
      { id: ingredientId, replacementIngredientId: selectedIngredient.id },
      { onSuccess: () => onClose() }
    );
  };

  const usageParts: string[] = [];
  if (usageCount > 0) usageParts.push(`${usageCount} recipe(s)`);
  if (shoppingListCount > 0) usageParts.push(`${shoppingListCount} shopping list item(s)`);
  const usageText = usageParts.join(' and ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replace & Delete Ingredient"
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleSubmit}
            disabled={!selectedIngredient}
            loading={replaceAndDelete.isPending}
          >
            Replace & Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Alert variant="warning">
          <strong>{ingredientName}</strong> is used in {usageText}. Choose a replacement ingredient before deleting.
        </Alert>

        {/* Ingredient being deleted */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deleting
          </label>
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
            {ingredientName}
          </div>
        </div>

        {/* Replacement ingredient selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Replace with
          </label>

          {selectedIngredient ? (
            <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <span className="font-medium text-green-800">{selectedIngredient.name}</span>
                {selectedIngredient.category && (
                  <Badge variant="gray" className="ml-2">{selectedIngredient.category}</Badge>
                )}
              </div>
              <button
                onClick={() => setSelectedIngredient(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <Input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {isLoading ? (
                  <div className="text-center py-6 text-gray-500">Loading...</div>
                ) : filteredIngredients.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    {searchTerm ? 'No ingredients found.' : 'Type to search ingredients.'}
                  </div>
                ) : (
                  filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => setSelectedIngredient(ing)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{ing.name}</span>
                      {ing.category && (
                        <span className="ml-2 text-xs text-gray-500">{ing.category}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
