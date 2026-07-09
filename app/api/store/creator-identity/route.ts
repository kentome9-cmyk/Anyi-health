import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const getStoreId = (req: Request, body?: any): string | null => {
  const url = new URL(req.url);
  const storeId = url.searchParams.get('storeId') || req.headers.get('x-store-id') || body?.storeId;
  return storeId;
};

export async function GET(request: Request) {
  try {
    const storeId = getStoreId(request);
    if (!storeId) {
      return NextResponse.json({ identity: null });
    }

    const identity = await prisma.creatorIdentity.findUnique({
      where: { storeId },
    });

    return NextResponse.json({ identity });
  } catch (error) {
    console.error('Failed to get creator identity:', error);
    return NextResponse.json({ identity: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contentTrack, personaStyle, targetAudience, videoTone, videoDuration } = body;

    if (!contentTrack || !personaStyle || !targetAudience) {
      return NextResponse.json({ error: '必填项缺失' }, { status: 400 });
    }

    const storeId = getStoreId(request, body);
    if (!storeId) {
      return NextResponse.json({ error: 'storeId 缺失' }, { status: 400 });
    }

    const existing = await prisma.creatorIdentity.findUnique({
      where: { storeId },
    });

    let identity;

    if (existing) {
      identity = await prisma.creatorIdentity.update({
        where: { id: existing.id },
        data: {
          contentTrack,
          personaStyle,
          targetAudience,
          videoTone: videoTone || null,
          videoDuration: videoDuration || null,
        },
      });
    } else {
      identity = await prisma.creatorIdentity.create({
        data: {
          storeId,
          contentTrack,
          personaStyle,
          targetAudience,
          videoTone: videoTone || null,
          videoDuration: videoDuration || null,
        },
      });
    }

    return NextResponse.json({ identity });
  } catch (error) {
    console.error('Failed to save creator identity:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
