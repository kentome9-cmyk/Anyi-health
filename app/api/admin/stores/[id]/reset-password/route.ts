import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAdmin, handleAuthError } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: { id },
      include: { storeUser: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: '门店不存在' },
        { status: 404 }
      );
    }

    if (!store.storeUser) {
      return NextResponse.json(
        { error: '该门店没有关联登录账号' },
        { status: 400 }
      );
    }

    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.storeUser.update({
      where: { id: store.storeUser.id },
      data: { password: hashedPassword },
    });

    try {
      await prisma.operationLog.create({
        data: {
          operatorType: 'admin',
          operatorId: null,
          operatorName: null,
          action: 'reset_password',
          module: 'store',
          targetId: store.id,
          targetName: store.storeName,
          detail: `重置门店账号密码，账号：${store.storeUser.phone}`,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
    } catch {
      // 日志失败不影响主操作
    }

    return NextResponse.json({
      success: true,
      tempPassword,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}