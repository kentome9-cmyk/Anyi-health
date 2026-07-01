import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { storeId } = await requireStoreUser();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const direction = searchParams.get('direction') || '';
    const subCategory = searchParams.get('subCategory') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const andConditions: any[] = [];

    if (keyword) {
      andConditions.push({
        OR: [
          { topicTitle: { contains: keyword } },
          { corePoints: { contains: keyword } },
          { content: { contains: keyword } },
          { number: { contains: keyword } },
          { direction: { contains: keyword } },
          { subCategory: { contains: keyword } },
        ],
      });
    }

    if (direction) {
      andConditions.push({ direction: direction });
    }

    if (subCategory) {
      andConditions.push({ subCategory: subCategory });
    }

    const where: any = {
      OR: [
        { isPublic: true },
        { isRecommended: true, storeId: storeId },
      ],
      ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const skip = Math.max(0, (page - 1) * pageSize);
    const take = Math.min(100, pageSize);

    const [scripts, total] = await Promise.all([
      prisma.scriptRecord.findMany({
        where,
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      prisma.scriptRecord.count({ where }),
    ]);

    return NextResponse.json({ scripts, total });
  } catch (error) {
    return handleAuthError(error);
  }
}
