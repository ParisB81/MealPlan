import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true }
  });
  console.log('TOTAL:', all.length);
  all.forEach(i => console.log(`${i.name} | ${i.category || 'null'}`));
}

main().then(() => prisma.$disconnect());
