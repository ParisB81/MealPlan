import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useShoppingLists, useGenerateFromRecipes } from '../hooks/useShoppingLists';
import { shoppingListsService } from '../services/shoppingLists.service';
import { Modal, Input, Select, Button } from './ui';

interface AddToShoppingListModalProps {
  recipeId: string;
  recipeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToShoppingListModal({ recipeId, recipeName, isOpen, onClose }: AddToShoppingListModalProps) {
  const navigate = useNavigate();
  const generateFromRecipes = useGenerateFromRecipes();
  const { data: existingLists, isLoading: loadingLists } = useShoppingLists('active');

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [listName, setListName] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMode('new');
      setListName('');
      setSelectedListId('');
      setIsAdding(false);
    } else {
      setListName(`${recipeName} — Shopping List`);
    }
  }, [isOpen, recipeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'new') {
      try {
        const list = await generateFromRecipes.mutateAsync({
          recipeIds: [recipeId],
          name: listName || `${recipeName} — Shopping List`,
        });
        onClose();
        navigate(`/shopping-lists/${list.id}`);
      } catch {
        // hook handles error toast
      }
    } else {
      if (!selectedListId) {
        toast.error('Please select a shopping list');
        return;
      }
      setIsAdding(true);
      try {
        await shoppingListsService.addFromRecipes(selectedListId, [recipeId]);
        toast.success('Ingredients added to shopping list!');
        onClose();
        navigate(`/shopping-lists/${selectedListId}`);
      } catch {
        toast.error('Failed to add ingredients to list');
      } finally {
        setIsAdding(false);
      }
    }
  };

  const isPending = generateFromRecipes.isPending || isAdding;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Shopping List"
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            loading={isPending}
          >
            {isPending
              ? (mode === 'new' ? 'Creating...' : 'Adding...')
              : (mode === 'new' ? 'Create Shopping List' : 'Add to List')
            }
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipe name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Recipe</label>
          <p className="px-3 py-2 bg-page-bg border border-border-default rounded-lg text-text-primary font-medium">
            {recipeName}
          </p>
        </div>

        {/* Mode selection */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              mode === 'new'
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-text-secondary border-border-default hover:border-border-strong'
            }`}
          >
            Create new list
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              mode === 'existing'
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-text-secondary border-border-default hover:border-border-strong'
            }`}
          >
            Add to existing
          </button>
        </div>

        {mode === 'new' ? (
          <Input
            label="List Name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Shopping list name..."
          />
        ) : (
          <>
            {loadingLists ? (
              <p className="text-text-muted">Loading shopping lists...</p>
            ) : !existingLists || existingLists.length === 0 ? (
              <p className="text-text-muted">No active shopping lists. Switch to "Create new list" instead.</p>
            ) : (
              <Select
                label="Shopping List"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                required
              >
                <option value="">Select a shopping list</option>
                {existingLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </Select>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
