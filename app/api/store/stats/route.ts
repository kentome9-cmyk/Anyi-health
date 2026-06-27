import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

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
    console.error('Get store stats error:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}