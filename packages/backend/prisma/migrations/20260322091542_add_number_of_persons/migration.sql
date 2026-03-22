-- AlterTable
ALTER TABLE "meal_plan_preferences" ADD COLUMN     "numberOfPersons" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "meal_plans" ADD COLUMN     "numberOfPersons" INTEGER NOT NULL DEFAULT 1;
