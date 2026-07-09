import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const hasPagination = pageParam !== null && pageSizeParam !== null;
    const page = hasPagination ? parseInt(pageParam || '1') : 1;
    const pageSize = hasPagination ? parseInt(pageSizeParam || '10') : 1000;

    const where: any = { isActive: true };

    if (keyword) {
      where.OR = [
        { question: { contains: keyword } },
        { answer: { contains: keyword } },
        { keywords: { contains: keyword } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const skip = hasPagination ? Math.max(0, (page - 1) * pageSize) : 0;
    const take = hasPagination ? Math.min(100, pageSize) : undefined;

    const [qaItems, total] = await Promise.all([
      prisma.qaItem.findMany({
        where,
        orderBy: { hitCount: 'desc' },
        skip,
        take,
      }),
      prisma.qaItem.count({ where }),
    ]);

    const categories = await prisma.qaItem.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
    });

    return NextResponse.json({
      items: qaItems,
      total,
      categories: categories.map(c => ({ name: c.category, count: c._count })),
    });
  } catch (error) {
    console.error('Get store QA items error:', error);
    return NextResponse.json(
      { error: '获取问答库失败', items: [], total: 0 },
      { status: 500 }
    );
  }
}
