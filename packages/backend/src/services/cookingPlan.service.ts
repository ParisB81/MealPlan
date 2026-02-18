import { PrismaClient } from '@prisma/client';
import type { CreateCookingPlanInput, UpdateCookingPlanInput } from '../validators/cookingPlan.validator.js';

const prisma = new PrismaClient();

export class CookingPlanService {
  // List cooking plans with optional status filter
  async listAll(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const cookingPlans = await prisma.cookingPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return cookingPlans.map(this.formatCookingPlan);
  }

  // Get by ID
  async getById(id: string) {
    const plan = await prisma.cookingPlan.findUnique({
      where: { id },
    });
    if (!plan) return null;
    return this.formatCookingPlan(plan);
  }

  // Create
  async create(userId: string, data: CreateCookingPlanInput) {
    const plan = await prisma.cookingPlan.create({
      data: {
        userId,
        name: data.name,
        mealPlanIds: data.mealPlanIds.join(','),
        cookDays: data.cookDays.join(','),
      },
    });
    return this.formatCookingPlan(plan);
  }

  // Update name
  async update(id: string, userId: string, data: UpdateCookingPlanInput) {
    const existing = await prisma.cookingPlan.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const plan = await prisma.cookingPlan.update({
      where: { id },
      data: { name: data.name },
    });
    return this.formatCookingPlan(plan);
  }

  // Soft delete (status -> "deleted")
  async softDelete(id: string, userId: string) {
    const existing = await prisma.cookingPlan.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const plan = await prisma.cookingPlan.update({
      where: { id },
      data: { status: 'deleted' },
    });
    return this.formatCookingPlan(plan);
  }

  // Restore (status -> "active")
  async restore(id: string, userId: string) {
    const existing = await prisma.cookingPlan.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const plan = await prisma.cookingPlan.update({
      where: { id },
      data: { status: 'active' },
    });
    return this.formatCookingPlan(plan);
  }

  // Permanent delete
  async permanentDelete(id: string, userId: string) {
    const existing = await prisma.cookingPlan.findUnique({ where: { id } });
    if (!existing) return false;
    if (existing.userId !== userId) throw new Error('Unauthorized');

    await prisma.cookingPlan.delete({ where: { id } });
    return true;
  }

  // Convert comma-separated DB strings to arrays for API response
  private formatCookingPlan(plan: any) {
    return {
      ...plan,
      mealPlanIds: plan.mealPlanIds
        ? plan.mealPlanIds.split(',').filter((s: string) => s)
        : [],
      cookDays: plan.cookDays
        ? plan.cookDays.split(',').filter((s: string) => s)
        : [],
    };
  }
}

export const cookingPlanService = new CookingPlanService();
