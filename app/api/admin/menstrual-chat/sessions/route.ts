import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const storeId = searchParams.get('storeId') || '';
    const keyword = searchParams.get('keyword') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }
    if (keyword) {
      where.title = { contains: keyword };
    }
    applyDemoStoreFilter(where, session);

    const [sessions, total] = await Promise.all([
      prisma.menstrualChatSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          store: { select: { storeName: true } },
        },
      }),
      prisma.menstrualChatSession.count({ where }),
    ]);

    const sessionList = sessions.map((item: typeof sessions[number]) => ({
      id: item.id,
      storeId: item.storeId,
      storeName: item.store.storeName,
      title: item.title,
      messageCount: item.messageCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      list: sessionList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    logError('Get menstrual chat sessions error', error);
    return handleAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    await prisma.menstrualChatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete menstrual chat session error', error);
    return handleAuthError(error);
  }
}
