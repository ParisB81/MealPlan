/**
 * Bulk-converts recipe ingredients from imperial units to metric.
 *
 * Conversions applied:
 *   Weight:  oz → g/kg   (×28.35),   lb → g/kg   (×453.59)
 *   Volume:  fl oz → ml/l (×29.57),  pt → ml/l   (×473.18),
 *            qt → ml/l   (×946.35),  gal → ml/l  (×3785.41)
 *
 * Display thresholds (matches shopping list logic):
 *   Weight ≥ 1000 g  → kg    Volume ≥ 1000 ml → l
 *
 * Usage:
 *   Dry run (default):
 *     cd "C:\00 Paris\MealPlan\packages\backend"
 *     "C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" "../../scripts/convert-to-metric.ts"
 *
 *   Apply changes:
 *     ... same command ... -- --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--apply');

// ── Conversion table ───────────────────────────────────────────────────────
const CONVERSIONS: Record<string, { factor: number; system: 'weight' | 'volume' }> = {
  'oz':    { factor: 28.35,   system: 'weight' },
  'lb':    { factor: 453.592, system: 'weight' },
  'fl oz': { factor: 29.5735, system: 'volume' },
  'pt':    { factor: 473.176, system: 'volume' },
  'qt':    { factor: 946.353, system: 'volume' },
  'gal':   { factor: 3785.41, system: 'volume' },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toMetric(quantity: number, unit: string): { quantity: number; unit: string } | null {
  const conv = CONVERSIONS[unit.toLowerCase().trim()];
  if (!conv) return null;

  const base = quantity * conv.factor;

  if (conv.system === 'weight') {
    return base >= 1000
      ? { quantity: round2(base / 1000), unit: 'kg' }
      : { quantity: round2(base),        unit: 'g'  };
  } else {
    return base >= 1000
      ? { quantity: round2(base / 1000), unit: 'l'  }
      : { quantity: round2(base),        unit: 'ml' };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(DRY_RUN
    ? '  DRY RUN — no changes will be saved  (pass --apply to commit)'
    : '  APPLYING CHANGES to database');
  console.log(`${'='.repeat(60)}\n`);

  const imperialUnits = Object.keys(CONVERSIONS);

  // Fetch all recipe ingredients with imperial units, including recipe title for reporting
  const rows = await prisma.recipeIngredient.findMany({
    where: { unit: { in: imperialUnits } },
    include: {
      recipe: { select: { title: true } },
      ingredient: { select: { name: true } },
    },
    orderBy: [{ recipeId: 'asc' }, { id: 'asc' }],
  });

  if (rows.length === 0) {
    console.log('No imperial-unit ingredients found. Nothing to do.');
    return;
  }

  console.log(`Found ${rows.length} ingredient row(s) to convert:\n`);

  // Group by recipe for readability
  const byRecipe = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.recipeId}|${row.recipe.title}`;
    if (!byRecipe.has(key)) byRecipe.set(key, []);
    byRecipe.get(key)!.push(row);
  }

  // Track summary counts
  let totalConverted = 0;
  let totalSkipped   = 0;
  const updates: { id: string; quantity: number; unit: string }[] = [];

  for (const [key, recipeRows] of byRecipe) {
    const [, recipeTitle] = key.split('|');
    console.log(`  Recipe: "${recipeTitle}"`);

    for (const row of recipeRows) {
      const result = toMetric(row.quantity, row.unit);

      if (!result) {
        console.log(`    ✗ SKIP  ${row.ingredient.name}: ${row.quantity} ${row.unit} (no conversion available)`);
        totalSkipped++;
        continue;
      }

      const { quantity: newQty, unit: newUnit } = result;
      console.log(`    ✓      ${row.ingredient.name}: ${row.quantity} ${row.unit} → ${newQty} ${newUnit}`);
      updates.push({ id: row.id, quantity: newQty, unit: newUnit });
      totalConverted++;
    }

    console.log('');
  }

  // Summary
  console.log(`${'─'.repeat(60)}`);
  console.log(`  To convert : ${totalConverted}`);
  console.log(`  Skipped    : ${totalSkipped}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (DRY_RUN) {
    console.log('Dry run complete. Run with --apply to save these changes.\n');
    return;
  }

  // Apply in batches of 100
  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ id, quantity, unit }) =>
        prisma.recipeIngredient.update({
          where: { id },
          data: { quantity, unit },
        })
      )
    );
    done += batch.length;
    console.log(`  Updated ${done} / ${updates.length} rows...`);
  }

  console.log(`\nDone. ${totalConverted} ingredient(s) converted to metric.\n`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
