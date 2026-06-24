import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取选题列表
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');
    const includeScripts = url.searchParams.get('includeScripts') === 'true';

    if (!storeId) {
      return NextResponse.json({ topics: [] });
    }

    const topics = await prisma.topic.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: includeScripts ? {
        scripts: {
          orderBy: { version: 'desc' },
        },
      } : undefined,
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Failed to get topics:', error);
    return NextResponse.json({ topics: [], error: '获取选题列表失败' }, { status: 500 });
  }
}

// POST - 创建选题
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, topic, summary, angle, corePoints } = body;

    if (!storeId || !topic) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查是否已存在相同标题的选题
    const existingTopic = await prisma.topic.findFirst({
      where: {
        storeId,
        topic: topic.trim(),
      },
    });

    if (existingTopic) {
      // 已存在，返回现有的选题（不重复创建）
      console.log('[Topic] 选题已存在，返回现有记录:', existingTopic.id);
      return NextResponse.json({ topic: existingTopic, existed: true });
    }

    const newTopic = await prisma.topic.create({
      data: {
        storeId,
        topic: topic.trim(),
        summary: summary || null,
        angle: angle || null,
        corePoints: corePoints || null,
      },
    });

    return NextResponse.json({ topic: newTopic, existed: false });
  } catch (error) {
    console.error('Failed to create topic:', error);
    return NextResponse.json({ error: '创建选题失败' }, { status: 500 });
  }
}
