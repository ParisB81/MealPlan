import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Input } from '../components/ui';
import { TAG_CATEGORIES, getCategoryForTag } from '../data/tagDefinitions';
import { useRecipes, useUpdateRecipe } from '../hooks/useRecipes';
import toast from 'react-hot-toast';

export default function TagManagerPage() {
  const [search, setSearch] = useState('');
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [dragOverRecipeId, setDragOverRecipeId] = useState<string | null>(null);

  const { data, isLoading } = useRecipes({ status: 'active', limit: 100, search: search || undefined });
  const updateRecipe = useUpdateRecipe();

  const recipes = data?.recipes ?? [];

  const handleDragStart = useCallback((tag: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', tag);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedTag(tag);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTag(null);
    setDragOverRecipeId(null);
  }, []);

  const handleDragOver = useCallback((recipeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverRecipeId(recipeId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverRecipeId(null);
  }, []);

  const handleDrop = useCallback(
    (recipeId: string, currentTags: string[], e: React.DragEvent) => {
      e.preventDefault();
      const tag = e.dataTransfer.getData('text/plain');
      setDragOverRecipeId(null);
      setDraggedTag(null);

      if (!tag) return;
      if (currentTags.includes(tag)) {
        toast('Recipe already has this tag', { icon: 'ℹ️' });
        return;
      }

      updateRecipe.mutate(
        { id: recipeId, input: { tags: [...currentTags, tag] } },
        { onSuccess: () => toast.success(`Added "${tag}"`) }
      );
    },
    [updateRecipe]
  );

  const handleRemoveTag = useCallback(
    (recipeId: string, currentTags: string[], tagToRemove: string) => {
      updateRecipe.mutate(
        { id: recipeId, input: { tags: currentTags.filter((t) => t !== tagToRemove) } },
        { onSuccess: () => toast.success(`Removed "${tagToRemove}"`) }
      );
    },
    [updateRecipe]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/developer"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Developer Tools
        </Link>

        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tag Manager</h1>
          <p className="text-gray-600">Drag tags onto recipes to apply them. Click × to remove.</p>
        </header>

        {/* Tag Palette */}
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tag Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TAG_CATEGORIES.map((category) => (
              <div key={category.name}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {category.name}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {category.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={category.color}
                      size="sm"
                      draggable
                      onDragStart={(e) => handleDragStart(tag, e)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing select-none ${
                        draggedTag === tag ? 'opacity-50' : ''
                      }`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recipe List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recipes {data ? `(${data.pagination.total})` : ''}
            </h2>
            <div className="w-72">
              <Input
                placeholder="Search by name or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {isLoading && (
              <p className="text-gray-500 text-center py-8">Loading recipes...</p>
            )}

            {!isLoading && recipes.length === 0 && (
              <p className="text-gray-500 text-center py-8">No recipes found.</p>
            )}

            {recipes.map((recipe) => {
              const isOver = dragOverRecipeId === recipe.id;
              const alreadyHasTag = draggedTag ? recipe.tags.includes(draggedTag) : false;

              return (
                <div
                  key={recipe.id}
                  className={`flex items-start gap-4 px-4 py-3 transition-colors ${
                    isOver
                      ? alreadyHasTag
                        ? 'bg-yellow-50 ring-2 ring-yellow-300 ring-inset'
                        : 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
                      : ''
                  }`}
                  onDragOver={(e) => handleDragOver(recipe.id, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(recipe.id, recipe.tags, e)}
                >
                  {/* Recipe title */}
                  <div className="w-48 flex-shrink-0">
                    <Link
                      to={`/recipes/${recipe.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {recipe.title}
                    </Link>
                  </div>

                  {/* Tags */}
                  <div className="flex-1 flex flex-wrap gap-1 min-h-[28px] items-center">
                    {recipe.tags.length === 0 && !isOver && (
                      <span className="text-xs text-gray-400 italic">No tags</span>
                    )}
                    {recipe.tags.map((tag) => {
                      const cat = getCategoryForTag(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={cat?.color ?? 'gray'}
                          size="sm"
                          removable
                          onRemove={() => handleRemoveTag(recipe.id, recipe.tags, tag)}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                    {isOver && (
                      <span className="text-xs text-gray-400 italic ml-1">
                        {alreadyHasTag ? 'Already has this tag' : 'Drop to add tag'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
