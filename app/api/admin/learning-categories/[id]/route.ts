import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOperation } from '@/lib/operation-log';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const newName = (body.name ?? '').toString().trim();
    const newSortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : undefined;

    if (!newName) {
      return NextResponse.json(
        { error: '分类名称不能为空' },
        { status: 400 }
      );
    }
    if (newName.length > 50) {
      return NextResponse.json(
        { error: '分类名称不能超过 50 个字符' },
        { status: 400 }
      );
    }

    const oldCategory = await prisma.learningCategory.findUnique({
      where: { id },
    });
    if (!oldCategory) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    if (newName !== oldCategory.name) {
      const conflict = await prisma.learningCategory.findUnique({
        where: { name: newName },
      });
      if (conflict) {
        return NextResponse.json(
          { error: '该分类名称已被占用' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.learningCategory.update({
      where: { id },
      data: {
        name: newName,
        ...(newSortOrder !== undefined ? { sortOrder: newSortOrder } : {}),
      },
    });

    // 同步更新引用了旧分类名的资源记录
    if (newName !== oldCategory.name) {
      await prisma.learningResource.updateMany({
        where: { category: oldCategory.name },
        data: { category: newName },
      });
    }

    logOperation({
      action: 'update',
      module: 'learning_category',
      targetId: id,
      targetName: updated.name,
      detail: `更新学习分类：${oldCategory.name} → ${updated.name}`,
      request,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update learning category error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '该分类名称已被占用' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: '更新分类失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const category = await prisma.learningCategory.findUnique({
      where: { id },
    });
    if (!category) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    const usageCount = await prisma.learningResource.count({
      where: { category: category.name },
    });
    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `该分类下还有 ${usageCount} 个学习资源，请先调整或删除相关资源`,
        },
        { status: 400 }
      );
    }

    await prisma.learningCategory.delete({
      where: { id },
    });

    logOperation({
      action: 'delete',
      module: 'learning_category',
      targetId: id,
      targetName: category.name,
      detail: `删除学习分类：${category.name}`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete learning category error:', error);
    return NextResponse.json(
      { error: '删除分类失败' },
      { status: 500 }
    );
  }
}
