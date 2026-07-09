import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    if (session.userType !== 'store_user') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    const userId = session.userId;

    const store = await prisma.store.findFirst({
      where: { storeUserId: userId },
      select: {
        id: true,
        storeName: true,
        description: true,
        address: true,
        contactPhone: true,
        expirationTime: true,
      },
    });

    return NextResponse.json({
      store: store || null,
      hasStore: !!store,
    });
  } catch (error) {
    logError('Get store profile error', error);
    return NextResponse.json(
      { error: '获取门店信息失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    if (session.userType !== 'store_user') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    const userId = session.userId;

    const body = await request.json();
    const { storeName, description, address, contactPhone } = body;

    if (!storeName?.trim()) {
      return NextResponse.json(
        { error: '门店名称不能为空' },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findFirst({
      where: { storeUserId: userId },
    });

    if (existingStore) {
      const updatedStore = await prisma.store.update({
        where: { id: existingStore.id },
        data: {
          storeName: storeName.trim(),
          description: description || null,
          address: address || null,
          contactPhone: contactPhone || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: '门店信息更新成功',
        store: updatedStore,
      });
    } else {
      const newStore = await prisma.store.create({
        data: {
          storeUserId: userId,
          storeName: storeName.trim(),
          description: description || null,
          address: address || null,
          contactPhone: contactPhone || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: '门店创建成功',
        store: newStore,
      });
    }
  } catch (error) {
    logError('Save store profile error', error);
    return NextResponse.json(
      { error: '保存门店信息失败' },
      { status: 500 }
    );
  }
}