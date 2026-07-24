import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const storeId = searchParams.get('storeId') || '';
    const keyword = searchParams.get('keyword') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }
    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { reportContent: { contains: keyword } },
      ];
    }
    applyDemoStoreFilter(where, session);

    const [analyses, total] = await Promise.all([
      prisma.aiAnalysis.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          store: { select: { storeName: true } },
        },
      }),
      prisma.aiAnalysis.count({ where }),
    ]);

    const analysisList = analyses.map((item: typeof analyses[number]) => ({
      id: item.id,
      customerId: item.customerId,
      customerName: item.customer.name,
      customerPhone: item.customer.phone,
      storeId: item.storeId,
      storeName: item.store.storeName,
      content: item.content,
      reportContent: item.reportContent,
      structuredData: item.structuredData,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      list: analysisList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    logError('Get ai analysis error', error);
    return handleAuthError(error);
  }
}
