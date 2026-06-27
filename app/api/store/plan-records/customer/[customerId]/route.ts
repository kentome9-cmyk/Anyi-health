import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { customerId } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || '';

    const plans = await prisma.plan.findMany({
      where: {
        customerId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bodyRecords: {
          orderBy: { visitDate: 'desc' },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      plans: plans.map((plan: typeof plans[number]) => ({
        id: plan.id,
        version: plan.version,
        status: plan.status,
        rawContent: plan.rawContent,
        structuredContent: plan.structuredContent,
        coreProjects: plan.coreProjects,
        assistantProjects: plan.assistantProjects,
        actualCounts: plan.actualCounts,
        isLatest: plan.isLatest,
        createdAt: plan.createdAt,
        completedAt: plan.completedAt,
        bodyRecords: plan.bodyRecords,
      })),
      total: plans.length,
    });
  } catch (error) {
    console.error('Get store customer plans error:', error);
    return NextResponse.json({ error: '获取客户方案失败' }, { status: 500 });
  }
}
