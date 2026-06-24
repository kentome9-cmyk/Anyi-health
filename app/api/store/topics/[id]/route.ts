import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取选题详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeScripts = url.searchParams.get('includeScripts') === 'true';

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: includeScripts ? {
        scripts: {
          orderBy: { version: 'desc' },
        },
      } : undefined,
    });

    if (!topic) {
      return NextResponse.json({ error: '选题不存在' }, { status: 404 });
    }

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('Failed to get topic:', error);
    return NextResponse.json({ error: '获取选题详情失败' }, { status: 500 });
  }
}

// PUT - 更新选题
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { topic, summary, angle, corePoints, isRecommended } = body;

    const updatedTopic = await prisma.topic.update({
      where: { id },
      data: {
        ...(topic !== undefined && { topic }),
        ...(summary !== undefined && { summary }),
        ...(angle !== undefined && { angle }),
        ...(corePoints !== undefined && { corePoints }),
        ...(isRecommended !== undefined && { isRecommended }),
      },
    });

    return NextResponse.json({ topic: updatedTopic });
  } catch (error) {
    console.error('Failed to update topic:', error);
    return NextResponse.json({ error: '更新选题失败' }, { status: 500 });
  }
}

// DELETE - 删除选题
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 400 });
    }

    // 删除选题及其关联的脚本
    await prisma.topic.deleteMany({
      where: { id, storeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic:', error);
    return NextResponse.json({ error: '删除选题失败' }, { status: 500 });
  }
}
