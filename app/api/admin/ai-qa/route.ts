import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');

    const where: any = {};
    if (roleId) where.roleId = roleId;
    if (category) where.category = category;
    if (keyword) {
      where.OR = [
        { question: { contains: keyword } },
        { answer: { contains: keyword } },
      ];
    }

    const items = await prisma.qAItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    // 获取所有分类
    const categories = await prisma.qAItem.findMany({
      where: roleId ? { roleId } : {},
      select: { category: true },
      distinct: ['category'],
    });

    return NextResponse.json({
      list: items,
      total: items.length,
      categories: categories.map((c) => c.category).filter(Boolean),
    });
  } catch (error) {
    console.error('Get QA items error:', error);
    return NextResponse.json(
      { error: '获取问答列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, answer, category, keywords, roleId, isActive } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: '问题和回答不能为空' },
        { status: 400 }
      );
    }

    const item = await prisma.qAItem.create({
      data: {
        question,
        answer,
        category: category || null,
        keywords: keywords || null,
        roleId: roleId || null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Create QA item error:', error);
    return NextResponse.json(
      { error: '创建问答失败' },
      { status: 500 }
    );
  }
}
