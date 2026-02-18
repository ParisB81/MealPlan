import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// Valid units from validUnits.ts
const VALID_UNITS = [
  // Weight
  'g', 'kg', 'mg', 'oz', 'lb', 't',
  // Volume
  'ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal',
  'wineglass', 'coffee cup', 'tea cup',
  // Count
  'piece', 'pcs', 'unit', 'item', 'clove', 'head', 'bulb', 'stalk', 'stick',
  'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip',
  // Small Quantity
  'pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop',
  // Size
  'small', 'medium', 'large', 'extra-large',
  // Package
  'pack', 'packet',
];

function isValidUnit(unit: string): boolean {
  return VALID_UNITS.includes(unit.toLowerCase());
}

async function findInvalidUnits() {
  console.log('Fetching all recipe ingredients...');

  // Get all recipe ingredients with their recipe and ingredient info
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    include: {
      recipe: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      ingredient: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  console.log(`Found ${recipeIngredients.length} total recipe ingredients`);

  // Filter to only invalid units
  const invalidEntries = recipeIngredients
    .filter(ri => !isValidUnit(ri.unit))
    .map(ri => ({
      recipeId: ri.recipe.id,
      recipeTitle: ri.recipe.title,
      recipeStatus: ri.recipe.status,
      ingredientName: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes || '',
    }));

  console.log(`Found ${invalidEntries.length} ingredients with invalid units`);

  if (invalidEntries.length === 0) {
    console.log('No invalid units found!');
    return;
  }

  // Get unique invalid units for summary
  const uniqueInvalidUnits = [...new Set(invalidEntries.map(e => e.unit))].sort();
  console.log('\nUnique invalid units found:');
  uniqueInvalidUnits.forEach(unit => {
    const count = invalidEntries.filter(e => e.unit === unit).length;
    console.log(`  "${unit}": ${count} occurrences`);
  });

  // Create Excel workbook
  const wb = XLSX.utils.book_new();

  // Main sheet with all invalid entries
  const wsData = [
    ['Recipe Title', 'Ingredient', 'Quantity', 'Invalid Unit', 'Notes', 'Recipe ID', 'Status'],
    ...invalidEntries.map(e => [
      e.recipeTitle,
      e.ingredientName,
      e.quantity,
      e.unit,
      e.notes,
      e.recipeId,
      e.recipeStatus,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 50 },  // Recipe Title
    { wch: 30 },  // Ingredient
    { wch: 10 },  // Quantity
    { wch: 15 },  // Invalid Unit
    { wch: 30 },  // Notes
    { wch: 30 },  // Recipe ID
    { wch: 10 },  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Invalid Units');

  // Summary sheet
  const summaryData = [
    ['Invalid Unit', 'Count'],
    ...uniqueInvalidUnits.map(unit => [
      unit,
      invalidEntries.filter(e => e.unit === unit).length,
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Valid units reference sheet
  const validUnitsData = [
    ['Valid Units Reference'],
    [''],
    ['Weight:', VALID_UNITS.filter(u => ['g', 'kg', 'mg', 'oz', 'lb', 't'].includes(u)).join(', ')],
    ['Volume:', VALID_UNITS.filter(u => ['ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal', 'wineglass', 'coffee cup', 'tea cup'].includes(u)).join(', ')],
    ['Count:', VALID_UNITS.filter(u => ['piece', 'pcs', 'unit', 'item', 'clove', 'head', 'bulb', 'stalk', 'stick', 'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip'].includes(u)).join(', ')],
    ['Small Quantity:', VALID_UNITS.filter(u => ['pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop'].includes(u)).join(', ')],
    ['Size:', VALID_UNITS.filter(u => ['small', 'medium', 'large', 'extra-large'].includes(u)).join(', ')],
    ['Package:', VALID_UNITS.filter(u => ['pack', 'packet'].includes(u)).join(', ')],
  ];
  const wsValid = XLSX.utils.aoa_to_sheet(validUnitsData);
  wsValid['!cols'] = [{ wch: 15 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsValid, 'Valid Units');

  // Write file
  const outputPath = 'C:/Users/Kat/Desktop/invalid-units-report.xlsx';
  XLSX.writeFile(wb, outputPath);
  console.log(`\nExcel file saved to: ${outputPath}`);

  await prisma.$disconnect();
}

findInvalidUnits().catch(console.error);
