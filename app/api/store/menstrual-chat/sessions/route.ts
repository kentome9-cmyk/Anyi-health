import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

    const sessions = await prisma.menstrualChatSession.findMany({
      where: { storeId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Menstrual-Chat] 获取会话列表失败:', error);
    return NextResponse.json(
      { error: '获取会话列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || '新对话';

    const session = await prisma.menstrualChatSession.create({
      data: {
        storeId,
        title,
        messageCount: 0,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('[Menstrual-Chat] 创建会话失败:', error);
    return NextResponse.json(
      { error: '创建会话失败' },
      { status: 500 }
    );
  }
}
