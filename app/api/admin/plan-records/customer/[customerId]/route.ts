import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, requireAdmin } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await requireAdmin(request);
    const { customerId } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || '';

    const where = applyDemoStoreFilter({
        customerId,
        ...(storeId ? { storeId } : {}),
      }, session);

    const plans = await prisma.plan.findMany({
      where,
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
    console.error('Get customer plans error:', error);
    return NextResponse.json({ error: 'Failed to get customer plans' }, { status: 500 });
  }
}
