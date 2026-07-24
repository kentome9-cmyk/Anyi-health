import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromHeaders } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取当前登录用户信息（支持 Cookie 和 Bearer Token）
 * - 用于前端在页面加载时同步登录态
 * - 配合 middleware 一起做鉴权
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    let userName: string | null = null;
    let phone: string | null = null;

    if (session.userType === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: session.userId },
        select: { username: true, name: true, isDemo: true, demoBatchId: true },
      });
      if (!admin) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      userName = admin.name || admin.username;
      session.isDemo = admin.isDemo;
      session.demoBatchId = admin.demoBatchId;
    } else if (session.userType === 'store_user') {
      const user = await prisma.storeUser.findUnique({
        where: { id: session.userId },
        select: { name: true, phone: true, permissions: true },
      });
      if (!user) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      userName = user.name;
      phone = user.phone;
      if (user.permissions) {
        try {
          session.permissions = JSON.parse(user.permissions) as string[];
        } catch {
          session.permissions = [];
        }
      } else {
        session.permissions = [];
      }

      const store = await prisma.store.findFirst({
        where: { storeUserId: session.userId },
        select: { expirationTime: true },
      });
      if (store?.expirationTime) {
        const now = new Date();
        if (now > store.expirationTime) {
          return NextResponse.json({
            authenticated: true,
            userType: session.userType,
            userId: session.userId,
            userName,
            phone,
            storeId: session.storeId,
            permissions: [],
            storeExpired: true,
            expirationTime: store.expirationTime.toISOString(),
          });
        }
      }
    } else if (session.userType === 'customer') {
      const customer = await prisma.customer.findUnique({
        where: { id: session.userId },
        select: { name: true, phone: true },
      });
      if (!customer) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      userName = customer.name;
      phone = customer.phone;
    }

    return NextResponse.json({
      authenticated: true,
      userType: session.userType,
      userId: session.userId,
      userName,
      phone,
      storeId: session.storeId,
      permissions: session.permissions,
      isDemo: session.isDemo,
      demoBatchId: session.demoBatchId,
    });
  } catch (error) {
    console.error('[auth/me] error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
