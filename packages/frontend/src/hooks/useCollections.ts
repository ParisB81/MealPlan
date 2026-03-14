import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '../services/collections.service';
import type { CreateCollectionInput, UpdateCollectionInput } from '../types/collection';
import toast from 'react-hot-toast';

const COLLECTIONS_KEY = 'collections';

export function useCollections(status?: string) {
  return useQuery({
    queryKey: [COLLECTIONS_KEY, status],
    queryFn: () => collectionsService.list(status),
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: [COLLECTIONS_KEY, id],
    queryFn: () => collectionsService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => collectionsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Collection created!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create collection');
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollectionInput }) =>
      collectionsService.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY, variables.id] });
      toast.success('Collection updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update collection');
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Collection deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete collection');
    },
  });
}

export function usePermanentDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsService.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Collection permanently deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete collection');
    },
  });
}

export function useRestoreCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Collection restored!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore collection');
    },
  });
}

export function useAddRecipeToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      collectionsService.addRecipe(collectionId, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Recipe added to collection!');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error.message || 'Failed to add recipe';
      if (msg.includes('already in collection')) {
        toast('Recipe is already in this collection', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    },
  });
}

export function useRemoveRecipeFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      collectionsService.removeRecipe(collectionId, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
      toast.success('Recipe removed from collection.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove recipe');
    },
  });
}

export function useCollectionsForRecipe(recipeId: string | undefined) {
  return useQuery({
    queryKey: [COLLECTIONS_KEY, 'recipe', recipeId],
    queryFn: () => collectionsService.getCollectionsForRecipe(recipeId!),
    enabled: !!recipeId,
  });
}
