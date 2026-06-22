import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取播放量 >= 1000 的爆款脚本作为公共脚本
    const scripts = await prisma.scriptRecord.findMany({
      where: {
        viewCount: {
          gte: 1000,
        },
      },
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Failed to fetch public scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch public scripts' }, { status: 500 });
  }
}
