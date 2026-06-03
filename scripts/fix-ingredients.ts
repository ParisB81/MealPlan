/**
 * fix-ingredients.ts
 * 1. Merge "cheese, feta" into "feta cheese" (keep "feta cheese", delete "cheese, feta")
 * 2. Add "nutella" ingredient if it doesn't already exist
 *
 * Dry run (preview only — no changes saved):
 *   cd packages/backend
 *   node ../../node_modules/tsx/dist/cli.mjs ../../scripts/fix-ingredients.ts
 *
 * Apply changes:
 *   node ../../node_modules/tsx/dist/cli.mjs ../../scripts/fix-ingredients.ts -- --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN (pass --apply to save) ===' : '\n=== APPLYING CHANGES ===');

  // ── 1. Merge feta ingredients ─────────────────────────────────────────────
  const keepName   = 'feta cheese';
  const deleteName = 'cheese, feta';

  const keep   = await prisma.ingredient.findFirst({ where: { name: keepName } });
  const remove = await prisma.ingredient.findFirst({ where: { name: deleteName } });

  console.log(`\n[Feta merge]`);
  console.log(`  Keep  : ${keep   ? `id=${keep.id}   "${keep.name}"`   : 'NOT FOUND'}`);
  console.log(`  Remove: ${remove ? `id=${remove.id} "${remove.name}"` : 'NOT FOUND'}`);

  if (keep && remove) {
    const riRows = await prisma.recipeIngredient.findMany({ where: { ingredientId: remove.id } });
    const slRows = await prisma.shoppingListItem.findMany({ where: { ingredientId: remove.id } });
    console.log(`  RecipeIngredient rows to re-point : ${riRows.length}`);
    console.log(`  ShoppingListItem  rows to re-point: ${slRows.length}`);

    if (!DRY_RUN) {
      for (const row of riRows) {
        const conflict = await prisma.recipeIngredient.findFirst({
          where: { recipeId: row.recipeId, ingredientId: keep.id },
        });
        if (conflict) {
          console.log(`  [RI] Recipe ${row.recipeId}: already has "${keepName}" — deleting duplicate`);
          await prisma.recipeIngredient.delete({ where: { id: row.id } });
        } else {
          await prisma.recipeIngredient.update({
            where: { id: row.id },
            data: { ingredientId: keep.id },
          });
          console.log(`  [RI] Recipe ${row.recipeId}: re-pointed to "${keepName}"`);
        }
      }

      for (const row of slRows) {
        const conflict = await prisma.shoppingListItem.findFirst({
          where: { shoppingListId: row.shoppingListId, ingredientId: keep.id },
        });
        if (conflict) {
          console.log(`  [SL] List ${row.shoppingListId}: already has "${keepName}" — deleting duplicate`);
          await prisma.shoppingListItem.delete({ where: { id: row.id } });
        } else {
          await prisma.shoppingListItem.update({
            where: { id: row.id },
            data: { ingredientId: keep.id },
          });
          console.log(`  [SL] List ${row.shoppingListId}: re-pointed to "${keepName}"`);
        }
      }

      await prisma.ingredient.delete({ where: { id: remove.id } });
      console.log(`  ✓ Deleted ingredient "${deleteName}" (id=${remove.id})`);
    }
  } else if (!keep && remove) {
    // "feta cheese" doesn't exist — just rename "cheese, feta" to "feta cheese"
    console.log(`  "${keepName}" not found — will rename "${deleteName}" to "${keepName}"`);
    if (!DRY_RUN) {
      await prisma.ingredient.update({
        where: { id: remove.id },
        data: { name: keepName },
      });
      console.log(`  ✓ Renamed to "${keepName}"`);
    }
  } else if (!remove) {
    console.log(`  "${deleteName}" not found — nothing to merge`);
  } else {
    console.log(`  Neither ingredient found — nothing to do`);
  }

  // ── 2. Add nutella ────────────────────────────────────────────────────────
  console.log(`\n[Nutella]`);
  const nutella = await prisma.ingredient.findFirst({ where: { name: 'nutella' } });
  if (nutella) {
    console.log(`  Already exists: id=${nutella.id}`);
  } else {
    console.log(`  Not found — will create (category: pantry)`);
    if (!DRY_RUN) {
      const created = await prisma.ingredient.create({
        data: { name: 'nutella', category: 'pantry', tags: '' },
      });
      console.log(`  ✓ Created: id=${created.id} name="${created.name}"`);
    }
  }

  console.log('\nDone.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
