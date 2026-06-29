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

// 检查请求来源是否合法（CSRF 同源检查）
function isValidOrigin(request: Request): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const allowedHosts: string[] = [];

  if (appUrl) {
    try {
      allowedHosts.push(new URL(appUrl).host);
    } catch {
      // ignore
    }
  }

  // 也接受请求的 Host 头（更宽松）
  const requestHost = request.headers.get('host');
  if (requestHost) {
    allowedHosts.push(requestHost);
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return allowedHosts.includes(originHost);
    } catch {
      return false;
    }
  }

  // 跨源请求浏览器会带 Origin；同源请求（如表单提交或部分fetch）会带 Referer
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return allowedHosts.includes(refererHost);
    } catch {
      return false;
    }
  }

  // 都没有则拒绝
  return false;
}

export async function POST(request: Request) {
  const { ip, userAgent } = getClientInfo(request);

  try {
    if (process.env.NODE_ENV === 'production') {
      // 同时支持两种CSRF防护：同源检查 + Double Submit Cookie
      const originValid = isValidOrigin(request);
      const csrfValid = await validateCSRFToken(request);

      if (!originValid && !csrfValid) {
        await recordLoginLog({
          userType: null,
          userId: null,
          userName: null,
          ip,
          userAgent,
          success: false,
          errorMessage: 'CSRF check failed',
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
