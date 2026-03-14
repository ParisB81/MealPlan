-- CreateTable
CREATE TABLE "recipe_collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_collections_userId_idx" ON "recipe_collections"("userId");

-- CreateIndex
CREATE INDEX "recipe_collections_status_idx" ON "recipe_collections"("status");

-- CreateIndex
CREATE INDEX "recipe_collection_items_collectionId_idx" ON "recipe_collection_items"("collectionId");

-- CreateIndex
CREATE INDEX "recipe_collection_items_recipeId_idx" ON "recipe_collection_items"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_collection_items_collectionId_recipeId_key" ON "recipe_collection_items"("collectionId", "recipeId");

-- AddForeignKey
ALTER TABLE "recipe_collections" ADD CONSTRAINT "recipe_collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_collection_items" ADD CONSTRAINT "recipe_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "recipe_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_collection_items" ADD CONSTRAINT "recipe_collection_items_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
