import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);

    const [
      totalCustomers,
      totalPlans,
      activePlans,
      totalChatSessions,
      totalChatMessages,
      totalScriptRecords,
      totalTopics,
    ] = await Promise.all([
      prisma.customer.count({ where: { storeId } }),
      prisma.plan.count({ where: { storeId } }),
      prisma.plan.count({ where: { storeId, status: 'active' } }),
      prisma.menstrualChatSession.count({ where: { storeId } }),
      prisma.menstrualChatMessage.count({ where: { session: { storeId } } }),
      prisma.scriptRecord.count({ where: { storeId } }),
      prisma.topic.count({ where: { storeId } }),
    ]);

    return NextResponse.json({
      totalCustomers,
      totalPlans,
      activePlans,
      totalChatSessions,
      totalChatMessages,
      totalScriptRecords,
      totalTopics,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}