-- AlterTable
ALTER TABLE "meal_plan_preferences" ADD COLUMN     "cookDaysPerWeek" INTEGER,
ADD COLUMN     "defaultServings" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "quickMealMaxMinutes" INTEGER;
