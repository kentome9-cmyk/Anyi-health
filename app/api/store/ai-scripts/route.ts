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
    const { storeId, type, topic, corePoints, sourceContent, templateName, content } = body;

    if (!storeId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const script = await prisma.scriptRecord.create({
      data: {
        storeId,
        type: type || 'original',
        topic: topic || null,
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
