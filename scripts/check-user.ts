import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = '13358330633';
  console.log(`Checking user: ${phone}`);
  
  const user = await prisma.storeUser.findUnique({ 
    where: { phone },
    include: { stores: true } 
  });
  
  console.log('User:', JSON.stringify(user, null, 2));
  
  if (user) {
    const stores = await prisma.store.findMany({ 
      where: { storeUserId: user.id } 
    });
    console.log('Stores:', JSON.stringify(stores, null, 2));
    
    const storeIds = stores.map(s => s.id);
    const customers = await prisma.customer.findMany({ 
      where: { storeId: { in: storeIds } } 
    });
    console.log('Customers:', customers.length);
    
    const plans = await prisma.plan.findMany({
      where: { storeId: { in: storeIds } }
    });
    console.log('Plans:', plans.length);
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
