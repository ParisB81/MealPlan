import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.recipeIngredient.findMany({
    where: { notes: { not: null } },
    include: {
      recipe: { select: { id: true, title: true } },
      ingredient: { select: { name: true } },
    },
    orderBy: [
      { recipe: { title: 'asc' } },
      { ingredient: { name: 'asc' } },
    ],
  });

  const filtered = items.filter((i) => i.notes && i.notes.trim() !== '');
  console.log(`Found ${filtered.length} recipe ingredients with notes`);

  const rows = filtered.map((i) => ({
    'Recipe ID': i.recipe.id,
    'Recipe Title': i.recipe.title,
    'Ingredient': i.ingredient.name,
    'Quantity': i.quantity,
    'Unit': i.unit,
    'Notes': i.notes,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 10 },  // Recipe ID
    { wch: 40 },  // Recipe Title
    { wch: 30 },  // Ingredient
    { wch: 10 },  // Quantity
    { wch: 10 },  // Unit
    { wch: 50 },  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Ingredient Notes');

  const outPath = 'C:\\00 Paris\\MealPlan\\ingredient-notes.xlsx';
  XLSX.writeFile(wb, outPath);
  console.log(`Excel file written to: ${outPath}`);

  await prisma.$disconnect();
}

main();
