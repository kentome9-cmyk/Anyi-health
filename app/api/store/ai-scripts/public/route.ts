import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { storeId } = await requireStoreUser();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    const where: any = {
      OR: [
        { isPublic: true },
        { isRecommended: true, storeId: storeId },
      ],
    };

    if (keyword) {
      where.AND = [
        ...where.AND || [],
        {
          OR: [
            { topicTitle: { contains: keyword } },
            { corePoints: { contains: keyword } },
            { content: { contains: keyword } },
            { number: { contains: keyword } },
            { direction: { contains: keyword } },
            { subCategory: { contains: keyword } },
          ],
        },
      ];
    }

    const scripts = await prisma.scriptRecord.findMany({
      where,
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    return handleAuthError(error);
  }
}
