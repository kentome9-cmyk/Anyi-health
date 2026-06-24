import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');
    const topicId = url.searchParams.get('topicId');
    const type = url.searchParams.get('type'); // original/rewrite

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
    console.error('Failed to get scripts:', error);
    return NextResponse.json({ scripts: [], error: '获取脚本列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      storeId, 
      type, 
      topicId, // 可选：如果传入则关联已有选题
      topic,   // 选题标题（旧字段）
      topicTitle, // 选题标题（新字段）
      summary, // 内容摘要
      angle,   // 切入角度
      corePoints, // 核心观点
      sourceContent, 
      templateName, 
      content 
    } = body;

    console.log('[POST /api/store/ai-scripts] Received body:', JSON.stringify(body, null, 2));

    if (!storeId) {
      return NextResponse.json({ error: '缺少必要参数：storeId' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: '缺少必要参数：content' }, { status: 400 });
    }

    // 兼容旧字段
    const effectiveTopic = topicTitle || topic;

    let finalTopicId = topicId;
    let version = 1;

    // 如果没有传入 topicId，需要查找或创建选题
    if (!finalTopicId && topic) {
      // 查找是否已存在相同标题的选题
      const existingTopic = await prisma.topic.findFirst({
        where: { 
          storeId, 
          topic: topic.trim(),
        },
      });

      if (existingTopic) {
        // 关联已有选题，计算版本号
        finalTopicId = existingTopic.id;
        const existingScripts = await prisma.scriptRecord.findMany({
          where: { topicId: existingTopic.id },
          orderBy: { version: 'desc' },
          take: 1,
        });
        version = (existingScripts[0]?.version || 0) + 1;
      } else {
        // 创建新选题
        const newTopic = await prisma.topic.create({
          data: {
            storeId,
            topic: topic.trim(),
            summary: summary || null,
            angle: angle || null,
            corePoints: corePoints || null,
          },
        });
        finalTopicId = newTopic.id;
        version = 1;
      }
    } else if (finalTopicId) {
      // 有关联选题，计算版本号
      const existingScripts = await prisma.scriptRecord.findMany({
        where: { topicId: finalTopicId },
        orderBy: { version: 'desc' },
        take: 1,
      });
      version = (existingScripts[0]?.version || 0) + 1;
    }

    // 创建脚本记录
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
      },
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Failed to create script:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
