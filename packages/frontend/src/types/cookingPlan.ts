export type CookingPlanStatus = 'active' | 'deleted';

export interface CookingPlan {
  id: string;
  userId: string;
  name: string;
  mealPlanIds: string[];
  cookDays: string[]; // yyyy-MM-dd format
  status: CookingPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCookingPlanInput {
  name: string;
  mealPlanIds: string[];
  cookDays: string[];
}

export interface UpdateCookingPlanInput {
  name: string;
}
