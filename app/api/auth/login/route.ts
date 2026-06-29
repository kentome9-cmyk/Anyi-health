import { NextResponse } from 'next/server';
import { validateAdmin, validateStoreUser, validateCustomer } from '@/services/auth.service';
import { setAuthCookie } from '@/lib/auth-cookie';
import { prisma } from '@/lib/prisma';
import { validateCSRFToken } from '@/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClientInfo(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || null;
  return { ip, userAgent };
}

async function recordLoginLog(params: {
  userType: 'admin' | 'store_user' | 'customer' | null;
  userId: string | null;
  userName: string | null;
  ip: string;
  userAgent: string | null;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await prisma.loginLog.create({
      data: {
        userType: params.userType ?? 'unknown',
        userId: params.userId,
        userName: params.userName,
        ip: params.ip,
        userAgent: params.userAgent,
        success: params.success,
        errorMessage: params.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.error('[auth/login] 记录登录日志失败:', err);
  }
}

export async function POST(request: Request) {
  const { ip, userAgent } = getClientInfo(request);

  try {
    if (process.env.NODE_ENV === 'production') {
      const isValid = await validateCSRFToken(request);
      if (!isValid) {
        await recordLoginLog({
          userType: null,
          userId: null,
          userName: null,
          ip,
          userAgent,
          success: false,
          errorMessage: 'CSRF token invalid',
        });
        return NextResponse.json({ error: '请求验证失败' }, { status: 403 });
      }
    }

    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 60000, max: 10 });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后重试' }, { status: 429 });
    }

    const { phone, password, userType, username } = await request.json();

    if (userType === 'admin') {
      if (!username || !password) {
        await recordLoginLog({
          userType: 'admin',
          userId: null,
          userName: username || null,
          ip,
          userAgent,
          success: false,
          errorMessage: '缺少用户名或密码',
        });
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const user = await validateAdmin(username, password);
      if (!user) {
        await recordLoginLog({
          userType: 'admin',
          userId: null,
          userName: username,
          ip,
          userAgent,
          success: false,
          errorMessage: '用户名或密码错误',
        });
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 }
        );
      }
      await setAuthCookie({
        userType: 'admin',
        userId: user.id,
        storeId: null,
      });
      await recordLoginLog({
        userType: 'admin',
        userId: user.id,
        userName: user.username,
        ip,
        userAgent,
        success: true,
      });
      return NextResponse.json({
        userType: 'admin',
        userId: user.id,
        userName: user.name || user.username,
        storeId: null,
      });
    }

    if (userType === 'store_user') {
      if (!phone || !password) {
        await recordLoginLog({
          userType: 'store_user',
          userId: null,
          userName: phone || null,
          ip,
          userAgent,
          success: false,
          errorMessage: '缺少手机号或密码',
        });
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const user = await validateStoreUser(phone, password);
      if (!user) {
        await recordLoginLog({
          userType: 'store_user',
          userId: null,
          userName: phone,
          ip,
          userAgent,
          success: false,
          errorMessage: '手机号或密码错误',
        });
        return NextResponse.json(
          { error: '手机号或密码错误' },
          { status: 401 }
        );
      }
      await setAuthCookie({
        userType: 'store_user',
        userId: user.id,
        storeId: user.storeId,
        permissions: user.permissions || undefined,
      });
      await recordLoginLog({
        userType: 'store_user',
        userId: user.id,
        userName: user.name,
        ip,
        userAgent,
        success: true,
      });
      return NextResponse.json({
        userType: 'store_user',
        userId: user.id,
        userName: user.name,
        storeId: user.storeId,
        permissions: user.permissions,
      });
    }

    if (userType === 'customer') {
      if (!phone || !password) {
        await recordLoginLog({
          userType: 'customer',
          userId: null,
          userName: phone || null,
          ip,
          userAgent,
          success: false,
          errorMessage: '缺少手机号或密码',
        });
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const customer = await validateCustomer(phone, password);
      if (!customer) {
        await recordLoginLog({
          userType: 'customer',
          userId: null,
          userName: phone,
          ip,
          userAgent,
          success: false,
          errorMessage: '手机号或密码错误',
        });
        return NextResponse.json(
          { error: '手机号或密码错误' },
          { status: 401 }
        );
      }
      await setAuthCookie({
        userType: 'customer',
        userId: customer.id,
        storeId: customer.storeId,
      });
      await recordLoginLog({
        userType: 'customer',
        userId: customer.id,
        userName: customer.name,
        ip,
        userAgent,
        success: true,
      });
      return NextResponse.json({
        userType: 'customer',
        userId: customer.id,
        userName: customer.name,
        storeId: customer.storeId,
      });
    }

    return NextResponse.json(
      { error: '无效的用户类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
