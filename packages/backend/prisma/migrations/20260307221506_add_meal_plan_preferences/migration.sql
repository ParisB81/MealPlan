-- CreateTable
CREATE TABLE "meal_plan_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recipeSource" TEXT NOT NULL DEFAULT 'library_only',
    "dietaryRestrictions" TEXT NOT NULL DEFAULT '[]',
    "cuisinePreferences" TEXT NOT NULL DEFAULT '[]',
    "allergies" TEXT NOT NULL DEFAULT '[]',
    "ingredientLikes" TEXT NOT NULL DEFAULT '',
    "ingredientDislikes" TEXT NOT NULL DEFAULT '',
    "weekdayMaxPrep" INTEGER,
    "weekdayMaxCook" INTEGER,
    "weekendMaxPrep" INTEGER,
    "weekendMaxCook" INTEGER,
    "caloriesMin" INTEGER,
    "caloriesMax" INTEGER,
    "proteinPercent" INTEGER,
    "carbsPercent" INTEGER,
    "fatPercent" INTEGER,
    "durationWeeks" INTEGER NOT NULL DEFAULT 1,
    "repeatWeekly" BOOLEAN NOT NULL DEFAULT false,
    "mealVariety" INTEGER NOT NULL DEFAULT 3,
    "includedMeals" TEXT NOT NULL DEFAULT 'breakfast,lunch,dinner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_plan_preferences_userId_idx" ON "meal_plan_preferences"("userId");

-- CreateIndex
CREATE INDEX "meal_plan_preferences_status_idx" ON "meal_plan_preferences"("status");

-- AddForeignKey
ALTER TABLE "meal_plan_preferences" ADD CONSTRAINT "meal_plan_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
