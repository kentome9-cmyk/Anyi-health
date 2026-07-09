import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userPhone = '13358330633';
  
  const user = await prisma.storeUser.findUnique({ 
    where: { phone: userPhone },
    include: { stores: true } 
  });
  
  console.log('User stores:', user?.stores.map(s => ({ id: s.id, name: s.storeName })));
  
  const planStoreId = '7b401790-ab63-44ca-9494-3b5ef4efa1e0';
  const planStore = await prisma.store.findUnique({ 
    where: { id: planStoreId },
    include: { storeUser: true }
  });
  
  console.log('\nPlan store:', planStore);
  
  const plansInPlanStore = await prisma.plan.findMany({
    where: { storeId: planStoreId },
    include: { customer: { select: { name: true, phone: true } } }
  });
  
  console.log('\nPlans in plan store:', plansInPlanStore.length);
  plansInPlanStore.forEach(p => {
    console.log(`  - ${p.customer.name} (${p.customer.phone}): ${p.status}`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
