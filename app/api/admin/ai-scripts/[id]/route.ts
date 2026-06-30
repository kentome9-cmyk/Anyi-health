import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

// 更新脚本推荐状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const { id } = await params;
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 });
    }

    if (action === 'recommend') {
      const script = await prisma.scriptRecord.update({
        where: { id },
        data: { isRecommended: true },
      });
      return NextResponse.json({ script });
    }

    if (action === 'unrecommend') {
      const script = await prisma.scriptRecord.update({
        where: { id },
        data: { isRecommended: false },
      });
      return NextResponse.json({ script });
    }

    if (action === 'publish') {
      const script = await prisma.scriptRecord.update({
        where: { id },
        data: { isPublic: true },
      });
      return NextResponse.json({ script });
    }

    if (action === 'unpublish') {
      const script = await prisma.scriptRecord.update({
        where: { id },
        data: { isPublic: false },
      });
      return NextResponse.json({ script });
    }

    if (action === 'stats') {
      const body = await request.json();
      const { field, value } = body;

      if (!['viewCount', 'likeCount', 'commentCount', 'favoriteCount'].includes(field)) {
        return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
      }

      const script = await prisma.scriptRecord.update({
        where: { id },
        data: { [field]: value },
      });
      return NextResponse.json({ script });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logError('Failed to update script', error);
    return handleAuthError(error);
  }
}

// 删除脚本
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 });
    }

    await prisma.scriptRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Failed to delete script', error);
    return handleAuthError(error);
  }
}
