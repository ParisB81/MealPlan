import { useState } from 'react';
import {
  useCollections,
  useCollectionsForRecipe,
  useAddRecipeToCollection,
  useRemoveRecipeFromCollection,
  useCreateCollection,
} from '../hooks/useCollections';
import { Modal, Input, Button } from './ui';
import { Plus, Loader2 } from 'lucide-react';

interface AddToCollectionModalProps {
  recipeId: string;
  recipeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToCollectionModal({
  recipeId,
  recipeName,
  isOpen,
  onClose,
}: AddToCollectionModalProps) {
  const { data: collections, isLoading: loadingCollections } = useCollections('active');
  const { data: memberships, isLoading: loadingMemberships } = useCollectionsForRecipe(
    isOpen ? recipeId : undefined
  );
  const addRecipe = useAddRecipeToCollection();
  const removeRecipe = useRemoveRecipeFromCollection();
  const createCollection = useCreateCollection();

  const [newName, setNewName] = useState('');

  const membershipIds = new Set(memberships?.map((m) => m.id) || []);

  const handleToggle = (collectionId: string, isChecked: boolean) => {
    if (isChecked) {
      removeRecipe.mutate({ collectionId, recipeId });
    } else {
      addRecipe.mutate({ collectionId, recipeId });
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    const collection = await createCollection.mutateAsync({ name: newName.trim() });
    setNewName('');
    addRecipe.mutate({ collectionId: collection.id, recipeId });
  };

  const isLoading = loadingCollections || loadingMemberships;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add "${recipeName}" to Collection`} size="sm">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="space-y-1">
          {collections && collections.length > 0 ? (
            collections.map((collection) => {
              const isChecked = membershipIds.has(collection.id);
              return (
                <label
                  key={collection.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-hover-bg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(collection.id, isChecked)}
                    className="w-5 h-5 rounded border-border-default text-accent focus:ring-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary font-medium">{collection.name}</span>
                    <span className="text-text-muted text-sm ml-2">
                      ({collection.recipeCount} recipe{collection.recipeCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                </label>
              );
            })
          ) : (
            <p className="text-text-muted text-sm py-4 text-center">
              No collections yet. Create one below!
            </p>
          )}

          {/* Create new collection */}
          <div className="pt-4 mt-2 border-t border-border-default">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection name..."
                className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); }}
              />
              <Button
                onClick={handleCreateAndAdd}
                disabled={!newName.trim() || createCollection.isPending}
                loading={createCollection.isPending}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
