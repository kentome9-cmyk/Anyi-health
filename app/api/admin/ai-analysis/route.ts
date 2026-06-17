import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
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
    console.error('Get ai analysis error:', error);
    return NextResponse.json(
      { error: '获取AI分析记录失败' },
      { status: 500 }
    );
  }
}
