import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isDemoAdmin, requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const module = searchParams.get('module') || '';
    const action = searchParams.get('action') || '';
    const operatorType = searchParams.get('operatorType') || '';
    const operatorName = searchParams.get('operatorName') || '';
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: Prisma.OperationLogWhereInput = {};

    if (module) where.module = module;
    if (action) where.action = action;
    if (operatorType) where.operatorType = operatorType;
    if (operatorName) {
      where.OR = [
        { operatorName: { contains: operatorName, mode: 'insensitive' } },
        { operatorId: { contains: operatorName, mode: 'insensitive' } },
      ];
    }
    if (keyword) {
      where.AND = [
        {
          OR: [
            { targetName: { contains: keyword, mode: 'insensitive' } },
            { detail: { contains: keyword, mode: 'insensitive' } },
            { targetId: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (!isDemoAdmin(session)) {
      const [demoAdmins, demoStoreUsers] = await Promise.all([
        prisma.admin.findMany({ where: { isDemo: true }, select: { id: true } }),
        prisma.storeUser.findMany({ where: { isDemo: true }, select: { id: true } }),
      ]);
      const demoUserIds = [...demoAdmins, ...demoStoreUsers].map((item) => item.id);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          NOT: [
            { operatorId: { in: demoUserIds } },
            { operatorName: { startsWith: 'demo_' } },
            { detail: { contains: 'DEMO_INVESTOR_V1' } },
          ],
        },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate + 'T00:00:00');
      }
      if (endDate) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(endDate + 'T23:59:59');
      }
    }

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.operationLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get operation logs error:', error);
    return NextResponse.json(
      { error: '获取操作日志失败' },
      { status: 500 }
    );
  }
}
