import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const customerId = searchParams.get('customerId') || '';
    const storeId = searchParams.get('storeId') || '';
    const status = searchParams.get('status') || '';
    const reportId = searchParams.get('reportId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (customerId) {
      where.customerId = customerId;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (status) {
      where.status = status;
    }
    if (reportId) {
      where.reportId = reportId;
    }
    applyDemoStoreFilter(where, session);

    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          store: { select: { storeName: true } },
        },
      }),
      prisma.plan.count({ where }),
    ]);

    const planList = plans.map((plan: typeof plans[number]) => ({
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
    }));

    return NextResponse.json({
      list: planList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: '获取方案列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const body = await request.json();
    const {
      storeId,
      customerId,
      structuredContent,
      rawContent,
      coreProjects,
      assistantProjects,
      actualCounts,
      reportId,
    } = body;

    if (!storeId || !customerId || !structuredContent) {
      return NextResponse.json(
        { error: '门店、客户和方案内容不能为空' },
        { status: 400 }
      );
    }

    const latestPlan = await prisma.plan.findFirst({
      where: { customerId, isLatest: true },
      orderBy: { createdAt: 'desc' },
    });

    const plan = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.plan.updateMany({
        where: { customerId, isLatest: true },
        data: { isLatest: false },
      });

      return tx.plan.create({
        data: {
          storeId,
          customerId,
          reportId: reportId || null,
          version: latestPlan ? latestPlan.version + 1 : 1,
          structuredContent,
          rawContent,
          coreProjects,
          assistantProjects,
          actualCounts,
          isLatest: true,
        },
      });
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { error: '创建方案失败' },
      { status: 500 }
    );
  }
}
