import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await requireAdmin(request);
    const { id } = await params;
    const plan = await prisma.plan.findFirst({
      where: applyDemoStoreFilter({ id }, session),
      include: {
        customer: { select: { name: true, phone: true } },
        store: { select: { storeName: true } },
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
      storeName: plan.store.storeName,
      customerId: plan.customerId,
      customerName: plan.customer.name,
      customerPhone: plan.customer.phone,
      reportId: plan.reportId,
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
    console.error('Get plan detail error:', error);
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
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const { id } = await params;
    const body = await request.json();
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

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Update plan error:', error);
    return NextResponse.json(
      { error: '更新方案失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const { id } = await params;
    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json(
      { error: '删除方案失败' },
      { status: 500 }
    );
  }
}
