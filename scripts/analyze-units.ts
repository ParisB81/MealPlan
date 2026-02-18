import { PrismaClient } from '@prisma/client';
import { getMeasurementSystem } from '../packages/backend/src/utils/unitConversion';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.recipeIngredient.findMany({
    include: { ingredient: { select: { name: true } } },
  });

  // Count by unit
  const unitCounts: Record<string, number> = {};
  for (const i of items) {
    const u = i.unit || '(empty)';
    unitCounts[u] = (unitCounts[u] || 0) + 1;
  }

  console.log('=== UNIT FREQUENCY ===');
  const sorted = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
  for (const [unit, count] of sorted) {
    const system = getMeasurementSystem(unit);
    console.log(`  ${unit.padEnd(15)} ${String(count).padStart(4)}  (${system})`);
  }

  // Count by measurement system
  console.log('\n=== BY MEASUREMENT SYSTEM ===');
  const systemCounts: Record<string, number> = {};
  for (const i of items) {
    const system = getMeasurementSystem(i.unit);
    systemCounts[system] = (systemCounts[system] || 0) + 1;
  }
  const systemSorted = Object.entries(systemCounts).sort((a, b) => b[1] - a[1]);
  for (const [system, count] of systemSorted) {
    console.log(`  ${system.padEnd(20)} ${count}`);
  }

  // Show cross-system conflicts: same ingredient with both metric and imperial
  console.log('\n=== CROSS-SYSTEM INGREDIENTS (same ingredient, different systems) ===');
  const ingSystems: Record<string, Set<string>> = {};
  for (const i of items) {
    const system = getMeasurementSystem(i.unit);
    const name = i.ingredient.name;
    if (!ingSystems[name]) ingSystems[name] = new Set();
    ingSystems[name].add(system);
  }

  const conflicts = Object.entries(ingSystems)
    .filter(([_, systems]) => {
      const arr = [...systems];
      // Has both a weight/volume system AND something else measurable
      const hasMetricWeight = arr.includes('metric_weight');
      const hasImperialWeight = arr.includes('imperial_weight');
      const hasMetricVolume = arr.includes('metric_volume');
      const hasImperialVolume = arr.includes('imperial_volume');
      const hasCount = arr.includes('count');
      return (hasMetricWeight && hasImperialWeight) ||
             (hasMetricVolume && hasImperialVolume) ||
             ((hasMetricWeight || hasImperialWeight) && (hasMetricVolume || hasImperialVolume)) ||
             ((hasMetricWeight || hasImperialWeight) && hasCount);
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [name, systems] of conflicts) {
    const relevantItems = items.filter(i => i.ingredient.name === name);
    console.log(`\n  ${name}: [${[...systems].join(', ')}]`);
    for (const i of relevantItems) {
      const sys = getMeasurementSystem(i.unit);
      console.log(`    ${i.quantity} ${i.unit} (${sys})`);
    }
  }

  console.log(`\nTotal ingredient records: ${items.length}`);
  await prisma.$disconnect();
}

main();
