import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_BATCH_ID = process.env.DEMO_BATCH_ID || 'DEMO_INVESTOR_V1';

export async function resetDemoData(batchId = DEMO_BATCH_ID) {
  const [demoAdmins, demoStoreUsers, demoStores] = await Promise.all([
    prisma.admin.findMany({ where: { isDemo: true, demoBatchId: batchId }, select: { id: true } }),
    prisma.storeUser.findMany({ where: { isDemo: true, demoBatchId: batchId }, select: { id: true } }),
    prisma.store.findMany({ where: { isDemo: true, demoBatchId: batchId }, select: { id: true } }),
  ]);

  const demoAdminIds = demoAdmins.map((item) => item.id);
  const demoStoreUserIds = demoStoreUsers.map((item) => item.id);
  const demoStoreIds = demoStores.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    if (demoAdminIds.length > 0 || demoStoreUserIds.length > 0) {
      await tx.loginLog.deleteMany({
        where: {
          OR: [
            { userId: { in: demoAdminIds } },
            { userId: { in: demoStoreUserIds } },
            { userName: { startsWith: 'demo_' } },
          ],
        },
      });

      await tx.operationLog.deleteMany({
        where: {
          OR: [
            { operatorId: { in: demoAdminIds } },
            { operatorId: { in: demoStoreUserIds } },
            { detail: { contains: batchId } },
          ],
        },
      });
    }

    if (demoStoreIds.length > 0) {
      await tx.store.deleteMany({
        where: { id: { in: demoStoreIds } },
      });
    }

    if (demoStoreUserIds.length > 0) {
      await tx.storeUser.deleteMany({
        where: { id: { in: demoStoreUserIds } },
      });
    }

    if (demoAdminIds.length > 0) {
      await tx.admin.deleteMany({
        where: { id: { in: demoAdminIds } },
      });
    }
  });

  return {
    admins: demoAdminIds.length,
    storeUsers: demoStoreUserIds.length,
    stores: demoStoreIds.length,
  };
}

async function main() {
  const result = await resetDemoData();
  console.log(`Demo data reset for batch ${DEMO_BATCH_ID}`);
  console.log(result);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
