import { PrismaClient } from '@prisma/client';
import type { CreateCollectionInput, UpdateCollectionInput } from '../validators/collection.validator.js';

const prisma = new PrismaClient();

export class CollectionService {
  // List all collections with recipe counts
  async listAll(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const collections = await prisma.recipeCollection.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return collections.map(c => ({
      ...c,
      recipeCount: c._count.items,
      _count: undefined,
    }));
  }

  // Get collection by ID with full recipe data
  async getById(id: string) {
    const collection = await prisma.recipeCollection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            recipe: {
              include: {
                ingredients: { include: { ingredient: true } },
                nutrition: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });
    if (!collection) return null;

    return {
      ...collection,
      recipeCount: collection.items.length,
      recipes: collection.items
        .filter(item => item.recipe.status === 'active')
        .map(item => ({
          ...this.formatRecipe(item.recipe),
          addedAt: item.addedAt,
          collectionItemId: item.id,
        })),
      items: undefined,
    };
  }

  // Create collection
  async create(userId: string, data: CreateCollectionInput) {
    const collection = await prisma.recipeCollection.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
      },
    });
    return { ...collection, recipeCount: 0 };
  }

  // Update collection name/description
  async update(id: string, userId: string, data: UpdateCollectionInput) {
    const existing = await prisma.recipeCollection.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;

    const collection = await prisma.recipeCollection.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { items: true } } },
    });

    return { ...collection, recipeCount: collection._count.items, _count: undefined };
  }

  // Soft delete
  async softDelete(id: string, userId: string) {
    const existing = await prisma.recipeCollection.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const collection = await prisma.recipeCollection.update({
      where: { id },
      data: { status: 'deleted' },
    });
    return collection;
  }

  // Restore
  async restore(id: string, userId: string) {
    const existing = await prisma.recipeCollection.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const collection = await prisma.recipeCollection.update({
      where: { id },
      data: { status: 'active' },
    });
    return collection;
  }

  // Permanent delete
  async permanentDelete(id: string, userId: string) {
    const existing = await prisma.recipeCollection.findUnique({ where: { id } });
    if (!existing) return false;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    await prisma.recipeCollection.delete({ where: { id } });
    return true;
  }

  // Add a single recipe to collection
  async addRecipe(collectionId: string, recipeId: string, userId: string) {
    const collection = await prisma.recipeCollection.findUnique({ where: { id: collectionId } });
    if (!collection) return null;
    if (collection.userId !== userId) throw new Error('Unauthorized');

    // Check for duplicate
    const existing = await prisma.recipeCollectionItem.findUnique({
      where: { collectionId_recipeId: { collectionId, recipeId } },
    });
    if (existing) throw new Error('Recipe already in collection');

    const item = await prisma.recipeCollectionItem.create({
      data: { collectionId, recipeId },
      include: { recipe: true },
    });
    return item;
  }

  // Add multiple recipes at once
  async addRecipes(collectionId: string, recipeIds: string[], userId: string) {
    const collection = await prisma.recipeCollection.findUnique({ where: { id: collectionId } });
    if (!collection) return null;
    if (collection.userId !== userId) throw new Error('Unauthorized');

    // Filter out already-existing to avoid unique constraint errors
    const existing = await prisma.recipeCollectionItem.findMany({
      where: { collectionId, recipeId: { in: recipeIds } },
      select: { recipeId: true },
    });
    const existingIds = new Set(existing.map(e => e.recipeId));
    const newIds = recipeIds.filter(id => !existingIds.has(id));

    if (newIds.length > 0) {
      await prisma.recipeCollectionItem.createMany({
        data: newIds.map(recipeId => ({ collectionId, recipeId })),
      });
    }

    return { added: newIds.length, alreadyExisted: existingIds.size };
  }

  // Remove recipe from collection
  async removeRecipe(collectionId: string, recipeId: string, userId: string) {
    const collection = await prisma.recipeCollection.findUnique({ where: { id: collectionId } });
    if (!collection) return null;
    if (collection.userId !== userId) throw new Error('Unauthorized');

    await prisma.recipeCollectionItem.delete({
      where: { collectionId_recipeId: { collectionId, recipeId } },
    });
    return true;
  }

  // Get all collections a recipe belongs to
  async getCollectionsForRecipe(recipeId: string, userId: string) {
    const items = await prisma.recipeCollectionItem.findMany({
      where: {
        recipeId,
        collection: { userId, status: 'active' },
      },
      include: {
        collection: {
          select: { id: true, name: true },
        },
      },
    });
    return items.map(item => item.collection);
  }

  // Format recipe data (parse JSON/CSV fields) — matches recipe.service.ts formatRecipe()
  private formatRecipe(recipe: any) {
    return {
      ...recipe,
      instructions: JSON.parse(recipe.instructions || '[]'),
      tags: recipe.tags ? recipe.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
    };
  }
}

export const collectionService = new CollectionService();
