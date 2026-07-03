import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/services/auth.service';
import { DEFAULT_STORE_PERMISSIONS } from '@/lib/store-permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phone, password, name, storeName, agreePrivacyPolicy, agreeTermsOfService } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: '请输入手机号和密码' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度不能少于6位' },
        { status: 400 }
      );
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    if (!agreePrivacyPolicy) {
      return NextResponse.json(
        { error: '请同意隐私政策' },
        { status: 400 }
      );
    }

    if (!agreeTermsOfService) {
      return NextResponse.json(
        { error: '请同意服务条款' },
        { status: 400 }
      );
    }

    const existing = await prisma.storeUser.findUnique({
      where: { phone },
    });
    if (existing) {
      return NextResponse.json(
        { error: '该手机号已被注册' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.storeUser.create({
      data: {
        phone,
        password: hashedPassword,
        name: name || null,
        permissions: JSON.stringify(DEFAULT_STORE_PERMISSIONS),
      },
    });

    if (storeName?.trim()) {
      await prisma.store.create({
        data: {
          storeName: storeName.trim(),
          storeUserId: user.id,
        },
      });
    }

    try {
      await prisma.operationLog.create({
        data: {
          operatorType: 'store_user',
          operatorId: user.id,
          operatorName: user.name || user.phone,
          action: 'create',
          module: 'store_user',
          targetId: user.id,
          targetName: user.name || user.phone,
          detail: `门店用户自主注册，手机号：${user.phone}`,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
    } catch {
      // 日志失败不影响注册
    }

    return NextResponse.json({
      success: true,
      message: '注册成功',
      userId: user.id,
    });
  } catch (error) {
    console.error('Store register error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
