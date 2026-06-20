import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有脚本记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const isRecommended = searchParams.get('isRecommended');
    const minViews = searchParams.get('minViews');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    
    if (storeId) where.storeId = storeId;
    if (type) where.type = type;
    if (isRecommended === 'true') where.isRecommended = true;
    if (minViews) where.viewCount = { gte: parseInt(minViews) };
    if (keyword) {
      where.OR = [
        { topic: { contains: keyword } },
        { content: { contains: keyword } },
      ];
    }

    const [scripts, total] = await Promise.all([
      prisma.scriptRecord.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { isRecommended: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scriptRecord.count({ where }),
    ]);

    return NextResponse.json({
      scripts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Failed to fetch scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}
