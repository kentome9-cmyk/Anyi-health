import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ scripts: [] });
    }

    const scripts = await prisma.scriptRecord.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Failed to get scripts:', error);
    return NextResponse.json({ scripts: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, type, topic, corePoints, sourceContent, templateName, content, scriptContent, title } = body;

    // 兼容 content 或 scriptContent
    const scriptContentData = content || scriptContent;

    // 至少需要 storeId，以及 content 或 corePoints 其一
    if (!storeId || (!scriptContentData && !corePoints)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 处理选题名称：如果已存在相同选题，加后缀区分
    let finalTopic = topic || title || null;
    if (finalTopic) {
      const existingScripts = await prisma.scriptRecord.findMany({
        where: {
          storeId,
          topic: {
            startsWith: finalTopic,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingScripts.length > 0) {
        // 查找最大后缀
        const maxSuffix = existingScripts.reduce((max, s) => {
          const match = s.topic?.match(new RegExp(`^${finalTopic}(?:-(\\d+))?$`));
          if (match) {
            const suffix = match[1] ? parseInt(match[1]) : 1;
            return Math.max(max, suffix);
          }
          return max;
        }, 0);
        finalTopic = `${finalTopic}-${maxSuffix + 1}`;
      }
    }

    const script = await prisma.scriptRecord.create({
      data: {
        storeId,
        type: type || 'original',
        topic: finalTopic,
        corePoints: corePoints || null,
        sourceContent: sourceContent || null,
        templateName: templateName || null,
        content: scriptContentData || '', // 保存选题时可能没有content
      },
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Failed to create script:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
