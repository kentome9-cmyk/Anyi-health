import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser();
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const customerId = searchParams.get('customerId') || '';
    const status = searchParams.get('status') || '';
    const reportId = searchParams.get('reportId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = { storeId };
    if (customerId) {
      where.customerId = customerId;
    }
    if (status) {
      where.status = status;
    }
    if (reportId) {
      where.reportId = reportId;
    }

    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.plan.count({ where }),
    ]);

    const planList = plans.map((plan) => ({
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
    }));

    return NextResponse.json({
      list: planList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { storeId } = await requireStoreUser();
    const body = await request.json();
    
    const {
      customerId,
      structuredContent,
      rawContent,
      coreProjects,
      assistantProjects,
      actualCounts,
      reportId,
    } = body;

    if (!customerId || !structuredContent) {
      return NextResponse.json(
        { error: '客户和方案内容不能为空' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, storeId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: '客户不存在或不属于当前门店' },
        { status: 400 }
      );
    }

    const latestPlan = await prisma.plan.findFirst({
      where: { customerId, storeId, isLatest: true },
      orderBy: { createdAt: 'desc' },
    });

    const plan = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.plan.updateMany({
        where: { customerId, storeId, isLatest: true },
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
    return handleAuthError(error);
  }
}