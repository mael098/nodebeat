import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding database...');
  // Ensure the first user is an admin
  const firstUser = await prisma.user.findFirst({
    orderBy: { id: 'asc' },
  });

  if (firstUser && !firstUser.isAdmin) {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { isAdmin: true },
    });
    console.log(`✓ Marked user ${firstUser.email} as admin`);
  } else if (firstUser?.isAdmin) {
    console.log(`✓ User ${firstUser.email} is already admin`);
  } else {
    console.log('No users found in database');
  }
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
