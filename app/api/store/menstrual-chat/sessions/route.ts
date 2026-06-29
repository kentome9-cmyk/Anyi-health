import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser();

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
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { storeId } = await requireStoreUser();
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
    return handleAuthError(error);
  }
}