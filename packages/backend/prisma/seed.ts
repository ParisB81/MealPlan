import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a default user if it doesn't exist
  const user = await prisma.user.upsert({
    where: { email: 'demo@mealplan.app' },
    update: {},
    create: {
      id: 'temp-user-1',
      email: 'demo@mealplan.app',
      name: 'Demo User',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('Created user:', user);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
