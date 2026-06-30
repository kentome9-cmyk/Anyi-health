import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');
    const topicId = url.searchParams.get('topicId');
    const type = url.searchParams.get('type');

    if (!storeId) {
      return NextResponse.json({ scripts: [] });
    }

    const scripts = await prisma.scriptRecord.findMany({
      where: { 
        storeId, 
        ...(topicId && { topicId }),
        ...(type && { type }),
        content: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    logError('Failed to get scripts', error);
    return NextResponse.json({ scripts: [], error: '获取脚本列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      storeId, 
      type, 
      topicId,
      topic,
      topicTitle,
      summary,
      angle,
      corePoints,
      sourceContent, 
      templateName, 
      content,
      direction,
      subCategory,
      contentDirection,
    } = body;

    if (!storeId) {
      return NextResponse.json({ error: '缺少必要参数：storeId' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: '缺少必要参数：content' }, { status: 400 });
    }

    const effectiveTopic = topicTitle || topic;

    let finalTopicId = topicId;
    let version = 1;

    if (!finalTopicId && topic) {
      const existingTopic = await prisma.topic.findFirst({
        where: { 
          storeId, 
          topic: topic.trim(),
        },
      });

      if (existingTopic) {
        finalTopicId = existingTopic.id;
        const existingScripts = await prisma.scriptRecord.findMany({
          where: { topicId: existingTopic.id },
          orderBy: { version: 'desc' },
          take: 1,
        });
        version = (existingScripts[0]?.version || 0) + 1;
      } else {
        const newTopic = await prisma.topic.create({
          data: {
            storeId,
            topic: topic.trim(),
            summary: summary || null,
            angle: angle || null,
            corePoints: corePoints || null,
            contentDirection: contentDirection || null,
          },
        });
        finalTopicId = newTopic.id;
        version = 1;
      }
    } else if (finalTopicId) {
      const existingScripts = await prisma.scriptRecord.findMany({
        where: { topicId: finalTopicId },
        orderBy: { version: 'desc' },
        take: 1,
      });
      version = (existingScripts[0]?.version || 0) + 1;
    }

    const script = await prisma.scriptRecord.create({
      data: {
        storeId,
        topicId: finalTopicId,
        type: type || 'original',
        version,
        topicTitle: effectiveTopic || null,
        summary: summary || null,
        angle: angle || null,
        corePoints: corePoints || null,
        sourceContent: sourceContent || null,
        templateName: templateName || null,
        content,
        direction: direction || null,
        subCategory: subCategory || null,
      },
    });

    return NextResponse.json({ script });
  } catch (error) {
    logError('Failed to create script', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}