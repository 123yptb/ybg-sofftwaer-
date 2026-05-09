const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = [
    { name: 'Assets', type: 'ASSET' },
    { name: 'Liabilities', type: 'LIABILITY' },
    { name: 'Equity', type: 'EQUITY' },
    { name: 'Income', type: 'INCOME' },
    { name: 'Expense', type: 'EXPENSE' },
  ];

  for (const group of groups) {
    await prisma.accountGroup.upsert({
      where: { id: group.name.toLowerCase() },
      update: {},
      create: {
        id: group.name.toLowerCase(),
        name: group.name,
        type: group.type,
      },
    });
  }
  console.log('Seed data added successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
