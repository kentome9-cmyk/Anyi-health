import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('All plans:');
  const allPlans = await prisma.plan.findMany({
    include: {
      customer: { select: { name: true, phone: true } },
      store: { select: { storeName: true } }
    }
  });
  console.log(JSON.stringify(allPlans, null, 2));
  console.log('\nTotal plans:', allPlans.length);
  
  console.log('\nAll customers:');
  const allCustomers = await prisma.customer.findMany({
    include: {
      store: { select: { storeName: true } },
      plans: { select: { id: true, status: true } }
    }
  });
  console.log(JSON.stringify(allCustomers, null, 2));
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
