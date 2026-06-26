import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

    const session = await prisma.menstrualChatSession.findFirst({
      where: {
        id: sessionId,
        storeId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    const messages = await prisma.menstrualChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error('[Menstrual-Chat] 获取会话消息失败:', error);
    return NextResponse.json(
      { error: '获取会话消息失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

    const session = await prisma.menstrualChatSession.findFirst({
      where: {
        id: sessionId,
        storeId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    await prisma.menstrualChatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Menstrual-Chat] 删除会话失败:', error);
    return NextResponse.json(
      { error: '删除会话失败' },
      { status: 500 }
    );
  }
}
