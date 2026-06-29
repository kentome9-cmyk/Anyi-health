import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOperation } from '@/lib/operation-log';

/**
 * 首次访问时，将 LearningResource 中已存在但 LearningCategory 中缺失的分类自动建表
 * 避免历史数据导致"分类不存在"错误
 */
async function ensureOrphanCategoriesExist() {
  const existingCategories = await prisma.learningCategory.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existingCategories.map((c) => c.name));

  const orphanRows = await prisma.learningResource.findMany({
    where: {
      category: { notIn: Array.from(existingNames) },
    },
    select: { category: true },
    distinct: ['category'],
  });

  const orphans = orphanRows
    .map((r) => r.category)
    .filter((name) => name && !existingNames.has(name));

  if (orphans.length === 0) return;

  // 按 sortOrder=0 默认追加，后续管理员可在 UI 调整顺序
  await prisma.learningCategory.createMany({
    data: orphans.map((name) => ({ name, sortOrder: 0 })),
  });
}

export async function GET() {
  try {
    await ensureOrphanCategoriesExist();

    const categories = await prisma.learningCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // 统计每个分类下资源数量
    const counts = await prisma.learningResource.groupBy({
      by: ['category'],
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.category, c._count._all]));

    return NextResponse.json(
      categories.map((c) => ({
        ...c,
        resourceCount: countMap.get(c.name) ?? 0,
      }))
    );
  } catch (error) {
    console.error('Get learning categories error:', error);
    return NextResponse.json(
      { error: '获取分类失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name ?? '').toString().trim();
    const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

    if (!name) {
      return NextResponse.json(
        { error: '分类名称不能为空' },
        { status: 400 }
      );
    }
    if (name.length > 50) {
      return NextResponse.json(
        { error: '分类名称不能超过 50 个字符' },
        { status: 400 }
      );
    }

    const existing = await prisma.learningCategory.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json(
        { error: '该分类已存在' },
        { status: 409 }
      );
    }

    const category = await prisma.learningCategory.create({
      data: { name, sortOrder },
    });

    logOperation({
      action: 'create',
      module: 'learning_category',
      targetId: category.id,
      targetName: category.name,
      detail: `新建学习分类：${category.name}`,
      request,
    });

    return NextResponse.json({ ...category, resourceCount: 0 });
  } catch (error: any) {
    console.error('Create learning category error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '该分类已存在' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: '创建分类失败' },
      { status: 500 }
    );
  }
}
