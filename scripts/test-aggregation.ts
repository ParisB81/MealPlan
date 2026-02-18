import { PrismaClient } from '@prisma/client';
import { convertToBase, convertFromBase, getMeasurementSystem } from '../packages/backend/src/utils/unitConversion';

const prisma = new PrismaClient();

async function main() {
  // Find ingredients that appear in both metric and imperial weight
  const items = await prisma.recipeIngredient.findMany({
    include: { ingredient: { select: { name: true } } },
  });

  // Group by ingredient name
  const byName: Record<string, Array<{ qty: number; unit: string; system: string }>> = {};
  for (const i of items) {
    const name = i.ingredient.name;
    if (!byName[name]) byName[name] = [];
    byName[name].push({
      qty: i.quantity,
      unit: i.unit,
      system: getMeasurementSystem(i.unit),
    });
  }

  // Find ingredients with both metric and imperial — now they should be same system
  console.log('=== TESTING UNIFIED SYSTEMS ===\n');

  // Test weight unification
  const weightUnits = ['g', 'kg', 'oz', 'lb'];
  const volumeUnits = ['ml', 'l', 'tsp', 'tbsp', 'cup'];

  console.log('Weight units all map to "weight":');
  for (const u of weightUnits) {
    console.log(`  ${u} → system: ${getMeasurementSystem(u)}`);
  }

  console.log('\nVolume units all map to "volume":');
  for (const u of volumeUnits) {
    console.log(`  ${u} → system: ${getMeasurementSystem(u)}`);
  }

  // Test conversions
  console.log('\n=== CONVERSION TESTS ===\n');

  // Weight
  const tests = [
    { qty: 1, unit: 'lb', desc: '1 lb' },
    { qty: 1, unit: 'oz', desc: '1 oz' },
    { qty: 15, unit: 'oz', desc: '15 oz' },
    { qty: 500, unit: 'g', desc: '500 g' },
    { qty: 1, unit: 'cup', desc: '1 cup' },
    { qty: 2, unit: 'tbsp', desc: '2 tbsp' },
    { qty: 1, unit: 'tsp', desc: '1 tsp' },
    { qty: 500, unit: 'ml', desc: '500 ml' },
  ];

  for (const t of tests) {
    const base = convertToBase(t.qty, t.unit);
    const display = convertFromBase(base.quantity, base.system, t.unit);
    console.log(`  ${t.desc} → ${base.quantity.toFixed(2)} ${base.system === 'weight' ? 'g' : 'ml'} → display: ${display.quantity} ${display.unit}`);
  }

  // Simulate aggregation: 600g chickpeas + 15 oz chickpeas
  console.log('\n=== SIMULATED AGGREGATION ===\n');

  const chickpea1 = convertToBase(600, 'g');    // Greek recipe
  const chickpea2 = convertToBase(15, 'oz');     // American recipe
  const totalG = chickpea1.quantity + chickpea2.quantity;
  const display = convertFromBase(totalG, 'weight', 'g');
  console.log(`  600g chickpeas + 15 oz chickpeas`);
  console.log(`  = ${chickpea1.quantity}g + ${chickpea2.quantity.toFixed(2)}g = ${totalG.toFixed(2)}g`);
  console.log(`  → display: ${display.quantity} ${display.unit}`);

  // Simulate: 2 tbsp olive oil + 100 ml olive oil
  const oil1 = convertToBase(2, 'tbsp');
  const oil2 = convertToBase(100, 'ml');
  const totalMl = oil1.quantity + oil2.quantity;
  const oilDisplay = convertFromBase(totalMl, 'volume', 'ml');
  console.log(`\n  2 tbsp olive oil + 100 ml olive oil`);
  console.log(`  = ${oil1.quantity.toFixed(2)}ml + ${oil2.quantity}ml = ${totalMl.toFixed(2)}ml`);
  console.log(`  → display: ${oilDisplay.quantity} ${oilDisplay.unit}`);

  // Simulate: 1 lb ground beef + 500g ground beef
  const beef1 = convertToBase(1, 'lb');
  const beef2 = convertToBase(500, 'g');
  const totalBeef = beef1.quantity + beef2.quantity;
  const beefDisplay = convertFromBase(totalBeef, 'weight', 'g');
  console.log(`\n  1 lb ground beef + 500g ground beef`);
  console.log(`  = ${beef1.quantity.toFixed(2)}g + ${beef2.quantity}g = ${totalBeef.toFixed(2)}g`);
  console.log(`  → display: ${beefDisplay.quantity} ${beefDisplay.unit}`);

  // Simulate: 0.5 cup milk + 1 l milk
  const milk1 = convertToBase(0.5, 'cup');
  const milk2 = convertToBase(1, 'l');
  const totalMilk = milk1.quantity + milk2.quantity;
  const milkDisplay = convertFromBase(totalMilk, 'volume', 'ml');
  console.log(`\n  0.5 cup milk + 1 l milk`);
  console.log(`  = ${milk1.quantity.toFixed(2)}ml + ${milk2.quantity}ml = ${totalMilk.toFixed(2)}ml`);
  console.log(`  → display: ${milkDisplay.quantity} ${milkDisplay.unit}`);

  await prisma.$disconnect();
}

main();
