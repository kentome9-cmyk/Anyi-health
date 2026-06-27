import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthCookie } from '@/lib/auth-cookie';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DEFAULT_RESET_PASSWORD = '123456';

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const auth = await getAuthCookie();

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

    const hashedPassword = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);

    await prisma.storeUser.update({
      where: { id: store.storeUser.id },
      data: { password: hashedPassword },
    });

    try {
      await prisma.operationLog.create({
        data: {
          operatorType: auth?.userType ?? 'admin',
          operatorId: auth?.userId ?? null,
          operatorName: auth?.userId ?? null,
          action: 'reset_password',
          module: 'store',
          targetId: store.id,
          targetName: store.storeName,
          detail: `重置门店账号密码为默认密码（${DEFAULT_RESET_PASSWORD}），账号：${store.storeUser.phone}`,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
    } catch {
      // 日志失败不影响主操作
    }

    return NextResponse.json({
      success: true,
      defaultPassword: DEFAULT_RESET_PASSWORD,
    });
  } catch (error) {
    console.error('Reset store password error:', error);
    return NextResponse.json(
      { error: '重置密码失败' },
      { status: 500 }
    );
  }
}
