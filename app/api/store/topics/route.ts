import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);
    const url = new URL(request.url);
    const includeScripts = url.searchParams.get('includeScripts') === 'true';

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
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);
    const body = await request.json();
    const { topic, summary, angle, corePoints, contentDirection } = body;

    if (!topic) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const existingTopic = await prisma.topic.findFirst({
      where: {
        storeId,
        topic: topic.trim(),
      },
    });

    if (existingTopic) {
      return NextResponse.json({ topic: existingTopic, existed: true });
    }

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

    return NextResponse.json({ topic: newTopic, existed: false });
  } catch (error) {
    return handleAuthError(error);
  }
}