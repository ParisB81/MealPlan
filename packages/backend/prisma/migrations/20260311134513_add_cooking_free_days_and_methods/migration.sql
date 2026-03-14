-- AlterTable
ALTER TABLE "meal_plan_preferences" ADD COLUMN     "cookingFreeDays" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "preferredMethods" TEXT NOT NULL DEFAULT '[]';
