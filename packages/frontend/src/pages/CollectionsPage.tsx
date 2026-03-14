import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useRestoreCollection,
  usePermanentDeleteCollection,
} from '../hooks/useCollections';
import { Button, Card, Modal, Input, TextArea } from '../components/ui';
import { FolderHeart, Plus, Trash2, RotateCcw } from 'lucide-react';

type TabType = 'active' | 'deleted';

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: collections, isLoading } = useCollections(activeTab);
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const restoreCollection = useRestoreCollection();
  const permanentDeleteCollection = usePermanentDeleteCollection();
  const navigate = useNavigate();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCollection.mutateAsync({ name: newName.trim(), description: newDescription.trim() || undefined });
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Delete collection "${name}"?`)) {
      deleteCollection.mutate(id);
    }
  };

  const handleRestore = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    restoreCollection.mutate(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
      permanentDeleteCollection.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <FolderHeart className="w-8 h-8 text-text-secondary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Collections</h1>
            <p className="text-text-secondary mt-1">
              {collections?.length || 0} collection{collections?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2 inline" />
          New Collection
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border-default">
        <nav className="flex gap-8">
          {(['active', 'deleted'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-strong'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-text-secondary">Loading collections...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!collections || collections.length === 0) && (
        <div className="text-center py-12">
          <FolderHeart className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No {activeTab} collections
          </h3>
          <p className="text-text-secondary mb-6">
            {activeTab === 'active'
              ? 'Create a collection to organize your favorite recipes!'
              : 'Deleted collections will appear here.'}
          </p>
          {activeTab === 'active' && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2 inline" />
              Create Your First Collection
            </Button>
          )}
        </div>
      )}

      {/* Collection grid */}
      {!isLoading && collections && collections.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              hoverable
              className="cursor-pointer bg-surface border border-border-default"
              onClick={() => navigate(`/collections/${collection.id}`)}
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-text-primary line-clamp-1">
                    {collection.name}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'active' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => handleDelete(e, collection.id, collection.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {activeTab === 'deleted' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => handleRestore(e, collection.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => handlePermanentDelete(e, collection.id, collection.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {collection.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                    {collection.description}
                  </p>
                )}
                <div className="mt-auto flex justify-between items-center text-sm text-text-muted">
                  <span>{collection.recipeCount} recipe{collection.recipeCount !== 1 ? 's' : ''}</span>
                  <span>{formatDate(collection.updatedAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}
        title="New Collection"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createCollection.isPending}
              loading={createCollection.isPending}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Favorites, Quick Weeknight Dinners"
            maxLength={200}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleCreate(); }}
          />
          <TextArea
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What kind of recipes will this collection hold?"
            maxLength={500}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
