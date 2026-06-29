import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface LearningResource {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string | null;
  content: string | null;
  filePath: string | null;
  pageCount: number | null;
  fileSize: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';

    const where: any = { isActive: true };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }

    const [list, categories] = await Promise.all([
      prisma.learningResource.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.learningCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, sortOrder: true },
      }),
    ]);

    return NextResponse.json({ list, categories });
  } catch (error) {
    console.error('Get learning resources error:', error);
    return NextResponse.json(
      { error: '获取学习资源失败' },
      { status: 500 }
    );
  }
}