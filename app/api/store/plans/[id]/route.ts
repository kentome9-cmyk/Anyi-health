import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        bodyRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: '方案不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: plan.id,
      version: plan.version,
      status: plan.status,
      storeId: plan.storeId,
      customerId: plan.customerId,
      customerName: plan.customer.name,
      customerPhone: plan.customer.phone,
      rawContent: plan.rawContent,
      structuredContent: plan.structuredContent,
      coreProjects: plan.coreProjects,
      assistantProjects: plan.assistantProjects,
      actualCounts: plan.actualCounts,
      isLatest: plan.isLatest,
      createdAt: plan.createdAt,
      completedAt: plan.completedAt,
      bodyRecords: plan.bodyRecords,
    });
  } catch (error) {
    console.error('Get store plan detail error:', error);
    return NextResponse.json(
      { error: '获取方案详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[DEBUG] Store update plan request body:', JSON.stringify(body, null, 2));
    
    const {
      structuredContent,
      rawContent,
      coreProjects,
      assistantProjects,
      actualCounts,
      status,
      completedAt,
      reportId,
    } = body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        structuredContent,
        rawContent,
        coreProjects,
        assistantProjects,
        actualCounts,
        status,
        reportId,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    });

    console.log('[DEBUG] Plan updated successfully:', plan.id);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('[ERROR] Update plan error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
    }
    return NextResponse.json(
      { error: '更新方案失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
