import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 公共脚本库：管理员手动标记为 isPublic=true 的脚本，按播放量倒序
    const scripts = await prisma.scriptRecord.findMany({
      where: {
        isPublic: true,
      },
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Failed to fetch public scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch public scripts' }, { status: 500 });
  }
}
