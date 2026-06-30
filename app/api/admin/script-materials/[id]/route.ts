import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const item = await prisma.scriptMaterial.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, username: true },
        },
        rewrites: {
          select: {
            id: true,
            topicTitle: true,
            viewCount: true,
            likeCount: true,
            createdAt: true,
            store: { select: { id: true, storeName: true } },
          },
          orderBy: { viewCount: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: '素材不存在' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logError('Failed to fetch script material', error);
    return handleAuthError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { title, content, source, category, number, direction, subCategory } = body;

    const updateData: any = {};
    
    if (title !== undefined) {
      if (!title) {
        return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
      }
      updateData.title = title;
    }
    if (content !== undefined) {
      if (!content) {
        return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
      }
      updateData.content = content;
    }
    if (number !== undefined) {
      if (!number) {
        return NextResponse.json({ error: '编号不能为空' }, { status: 400 });
      }
      updateData.number = number;
    }
    if (direction !== undefined) {
      if (!direction) {
        return NextResponse.json({ error: '方向不能为空' }, { status: 400 });
      }
      updateData.direction = direction;
    }
    if (subCategory !== undefined) {
      if (!subCategory) {
        return NextResponse.json({ error: '子类不能为空' }, { status: 400 });
      }
      updateData.subCategory = subCategory;
    }
    if (source !== undefined) {
      updateData.source = source || null;
    }
    if (category !== undefined) {
      updateData.category = category || null;
    }

    const item = await prisma.scriptMaterial.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ item });
  } catch (error) {
    logError('Failed to update script material', error);
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.scriptMaterial.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Failed to delete script material', error);
    return handleAuthError(error);
  }
}