import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 更新脚本推荐状态
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
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

    if (action === 'stats') {
      const body = await request.json();
      const { field, value } = body;
      
      if (!['viewCount', 'likeCount', 'commentCount', 'favoriteCount', 'rewriteCount'].includes(field)) {
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
    console.error('Failed to update script:', error);
    return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
  }
}

// 删除脚本
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 });
    }

    await prisma.scriptRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete script:', error);
    return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
  }
}
