import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sourceStoreId = '7b401790-ab63-44ca-9494-3b5ef4efa1e0';
  const targetStoreId = 'bd1993c9-bd54-406c-a35f-cb977c06bdfb';
  
  console.log(`Migrating plans from store ${sourceStoreId} to ${targetStoreId}`);
  
  const plans = await prisma.plan.findMany({
    where: { storeId: sourceStoreId },
    include: { customer: true }
  });
  
  console.log(`Found ${plans.length} plans to migrate`);
  
  for (const plan of plans) {
    let customer = await prisma.customer.findFirst({
      where: { phone: plan.customer.phone, storeId: targetStoreId }
    });
    
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          storeId: targetStoreId,
          phone: plan.customer.phone,
          name: plan.customer.name,
          age: plan.customer.age,
          deliveryMethod: plan.customer.deliveryMethod,
          birthOrder: plan.customer.birthOrder,
          postpartumDays: plan.customer.postpartumDays,
          height: plan.customer.height,
          weight: plan.customer.weight,
          allergy: plan.customer.allergy,
          notes: plan.customer.notes,
        }
      });
      console.log(`Created customer: ${customer.name} (${customer.phone})`);
    }
    
    await prisma.plan.create({
      data: {
        storeId: targetStoreId,
        customerId: customer.id,
        reportId: plan.reportId,
        version: plan.version,
        status: plan.status,
        rawContent: plan.rawContent,
        structuredContent: plan.structuredContent,
        isLatest: plan.isLatest,
        coreProjects: plan.coreProjects,
        assistantProjects: plan.assistantProjects,
        actualCounts: plan.actualCounts,
        completedAt: plan.completedAt,
        createdAt: plan.createdAt,
      }
    });
    
    console.log(`Migrated plan for customer: ${customer.name}`);
  }
  
  const targetPlans = await prisma.plan.findMany({ where: { storeId: targetStoreId } });
  console.log(`\nTotal plans in target store: ${targetPlans.length}`);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
