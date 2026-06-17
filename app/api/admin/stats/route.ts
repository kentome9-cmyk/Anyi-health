import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalStores, totalCustomers, totalPlans, activePlans] = await Promise.all([
      prisma.store.count(),
      prisma.customer.count(),
      prisma.plan.count(),
      prisma.plan.count({ where: { status: 'active' } }),
    ]);

    return NextResponse.json({
      totalStores,
      totalCustomers,
      totalPlans,
      activePlans,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
