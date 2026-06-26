import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: 批量更新统计数据
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { viewCount, likeCount, commentCount, favoriteCount } = body;

    const updateData: Record<string, number> = {};
    if (viewCount !== undefined) updateData.viewCount = viewCount;
    if (likeCount !== undefined) updateData.likeCount = likeCount;
    if (commentCount !== undefined) updateData.commentCount = commentCount;
    if (favoriteCount !== undefined) updateData.favoriteCount = favoriteCount;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const script = await prisma.scriptRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Failed to update script stats:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// PUT: 单字段更新（保留兼容）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { field, value } = body;

    const validFields = ['viewCount', 'likeCount', 'commentCount', 'favoriteCount', 'rewriteCount'];
    if (!validFields.includes(field)) {
      return NextResponse.json({ error: '无效的字段' }, { status: 400 });
    }

    const updateData: Record<string, number> = {};
    updateData[field] = value;

    const script = await prisma.scriptRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Failed to update script stats:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
