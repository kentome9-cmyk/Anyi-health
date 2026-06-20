import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
