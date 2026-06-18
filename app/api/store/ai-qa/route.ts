import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const roleId = searchParams.get('roleId');

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

    if (roleId) {
      where.roleId = roleId;
    }

    const qaItems = await prisma.qaItem.findMany({
      where,
      orderBy: { hitCount: 'desc' },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    // 获取所有分类
    const categories = await prisma.qaItem.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
    });

    // 获取所有角色
    const roles = await prisma.aIRole.findMany({
      where: { isActive: true, category: 'qa' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      items: qaItems,
      categories: categories.map(c => ({ name: c.category, count: c._count })),
      roles,
    });
  } catch (error) {
    console.error('Get store QA items error:', error);
    return NextResponse.json(
      { error: '获取问答库失败' },
      { status: 500 }
    );
  }
}
