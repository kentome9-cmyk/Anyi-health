import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionAuth = await requireAdmin(request);
    const { sessionId } = await params;

    const session = await prisma.menstrualChatSession.findFirst({
      where: applyDemoStoreFilter({ id: sessionId }, sessionAuth),
      include: {
        store: { select: { storeName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        storeId: session.storeId,
        storeName: session.store.storeName,
        title: session.title,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages: session.messages,
    });
  } catch (error) {
    logError('Get menstrual chat session detail error', error);
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionAuth = await requireAdmin(request);
    assertWritableAdmin(sessionAuth);
    const { sessionId } = await params;

    await prisma.menstrualChatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete menstrual chat session error', error);
    return handleAuthError(error);
  }
}
