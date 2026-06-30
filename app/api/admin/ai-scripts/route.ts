import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const isRecommended = searchParams.get('isRecommended');
    const isPublic = searchParams.get('isPublic');
    const minViews = searchParams.get('minViews');
    const keyword = searchParams.get('keyword');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;
    if (type && type !== 'all') where.type = type;
    if (isRecommended === 'true') where.isRecommended = true;
    if (isRecommended === 'false') where.isRecommended = false;
    if (isPublic === 'true') where.isPublic = true;
    if (isPublic === 'false') where.isPublic = false;
    if (minViews) where.viewCount = { gte: parseInt(minViews) };
    if (keyword) {
      where.OR = [
        { topicTitle: { contains: keyword } },
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
              storeName: true,
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
    logError('Failed to fetch scripts', error);
    return handleAuthError(error);
  }
}