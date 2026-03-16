import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useCollection,
  useUpdateCollection,
  useDeleteCollection,
  useRemoveRecipeFromCollection,
  useAddRecipeToCollection,
} from '../hooks/useCollections';
import { Button, Card, Badge, Modal, Input, TextArea } from '../components/ui';
import RecipePicker from '../components/RecipePicker';
import { ArrowLeft, Plus, Pencil, Trash2, X, Clock, Users, CalendarPlus } from 'lucide-react';
import { getCategoryForTag } from '../data/tagDefinitions';
import AddToMealPlanModal from '../components/AddToMealPlanModal';
import type { Recipe } from '../types/recipe';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: collection, isLoading } = useCollection(id);
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const removeRecipe = useRemoveRecipeFromCollection();
  const addRecipe = useAddRecipeToCollection();

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [addToMealPlan, setAddToMealPlan] = useState<{ id: string; title: string } | null>(null);

  const handleEdit = () => {
    if (!collection) return;
    setEditName(collection.name);
    setEditDescription(collection.description || '');
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return;
    await updateCollection.mutateAsync({
      id,
      input: { name: editName.trim(), description: editDescription.trim() || null },
    });
    setShowEdit(false);
  };

  const handleDelete = () => {
    if (!collection) return;
    if (confirm(`Delete collection "${collection.name}"?`)) {
      deleteCollection.mutate(id!, {
        onSuccess: () => navigate('/collections'),
      });
    }
  };

  const handleRemoveRecipe = (recipeId: string, recipeTitle: string) => {
    if (!id) return;
    if (confirm(`Remove "${recipeTitle}" from this collection?`)) {
      removeRecipe.mutate({ collectionId: id, recipeId });
    }
  };

  const handleAddRecipe = (recipe: Recipe) => {
    if (!id) return;
    addRecipe.mutate({ collectionId: id, recipeId: recipe.id });
    setShowRecipePicker(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <p className="text-text-secondary text-center py-12">Loading collection...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <p className="text-text-secondary text-center py-12">Collection not found.</p>
        <div className="text-center">
          <Link to="/collections">
            <Button variant="secondary">Back to Collections</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Back link */}
      <Link
        to="/collections"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{collection.name}</h1>
          {collection.description && (
            <p className="text-text-secondary mt-1">{collection.description}</p>
          )}
          <p className="text-sm text-text-muted mt-2">
            {collection.recipeCount} recipe{collection.recipeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={() => setShowRecipePicker(true)}>
            <Plus className="w-4 h-4 mr-1 inline" />
            Add Recipes
          </Button>
          <Button variant="secondary" onClick={handleEdit}>
            <Pencil className="w-4 h-4 mr-1 inline" />
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {collection.recipes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No recipes in this collection yet.</p>
          <Button onClick={() => setShowRecipePicker(true)}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Your First Recipe
          </Button>
        </div>
      )}

      {/* Recipe grid */}
      {collection.recipes.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collection.recipes.map((recipe) => (
            <Card
              key={recipe.id}
              hoverable
              className="cursor-pointer bg-surface border border-border-default relative group"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveRecipe(recipe.id, recipe.title);
                }}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border-default text-text-muted hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Remove from collection"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col h-full">
                <h3 className="text-lg font-semibold text-text-primary line-clamp-1 pr-8">
                  {recipe.title}
                </h3>
                {recipe.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                    {recipe.description}
                  </p>
                )}

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.tags.slice(0, 3).map((tag) => {
                      const cat = getCategoryForTag(tag);
                      return (
                        <Badge key={tag} variant={cat?.color as any || 'gray'} size="sm">
                          {tag}
                        </Badge>
                      );
                    })}
                    {recipe.tags.length > 3 && (
                      <span className="text-xs text-text-muted self-center">
                        +{recipe.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="mt-auto pt-3 flex flex-wrap gap-3 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {recipe.servings}
                  </span>
                  {(recipe.prepTime || recipe.cookTime) && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                    </span>
                  )}
                </div>

                {/* Add to Meal Plan */}
                <div className="mt-3 pt-3 border-t border-border-default">
                  <button
                    className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors px-3 py-1.5 text-sm bg-sec-mealplans text-white hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddToMealPlan({ id: recipe.id, title: recipe.title });
                    }}
                  >
                    <CalendarPlus className="w-4 h-4 mr-1 inline" />
                    Add to Meal Plan
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add to Meal Plan Modal */}
      {addToMealPlan && (
        <AddToMealPlanModal
          recipeId={addToMealPlan.id}
          recipeName={addToMealPlan.title}
          isOpen={true}
          onClose={() => setAddToMealPlan(null)}
        />
      )}

      {/* RecipePicker modal */}
      <RecipePicker
        isOpen={showRecipePicker}
        onClose={() => setShowRecipePicker(false)}
        onSelectRecipe={handleAddRecipe}
      />

      {/* Edit modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Collection"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateCollection.isPending}
              loading={updateCollection.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <TextArea
            label="Description (optional)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
