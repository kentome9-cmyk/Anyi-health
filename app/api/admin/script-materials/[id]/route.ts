import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

// 获取单个素材
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

// 更新素材
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { title, content, source, category } = body;

    if (title !== undefined && !title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    if (content !== undefined && !content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    const item = await prisma.scriptMaterial.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(source !== undefined ? { source: source || null } : {}),
        ...(category !== undefined ? { category: category || null } : {}),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logError('Failed to update script material', error);
    return handleAuthError(error);
  }
}

// 删除素材
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
