import { NextResponse } from 'next/server';
import { validateAdmin, validateStoreUser, validateCustomer } from '@/services/auth.service';
import { setAuthCookie } from '@/lib/auth-cookie';
import { createToken } from '@/lib/session';
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
  const allowedHosts: Set<string> = new Set();

  // 收集所有可能的环境变量配置
  const envVars = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.ALLOWED_ORIGINS,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean) as string[];

  for (const envValue of envVars) {
    // 支持逗号分隔的多个值
    for (const v of envValue.split(',')) {
      const trimmed = v.trim();
      if (!trimmed) continue;
      try {
        allowedHosts.add(new URL(trimmed).host);
      } catch {
        allowedHosts.add(trimmed);
      }
    }
  }

  // 从 x-forwarded-host 头获取（Nginx 等反向代理会设置）
  const xForwardedHost = request.headers.get('x-forwarded-host');
  if (xForwardedHost) {
    allowedHosts.add(xForwardedHost.split(',')[0].trim());
  }

  // 从 x-host 头获取
  const xHost = request.headers.get('x-host');
  if (xHost) {
    allowedHosts.add(xHost);
  }

  // 从 host 头获取（标准情况）
  const host = request.headers.get('host');
  if (host) {
    allowedHosts.add(host);
  }

  // 从 request.url 中提取（Next.js API Route 中 host 头可能为空）
  try {
    const reqUrl = new URL(request.url);
    if (reqUrl.host) {
      allowedHosts.add(reqUrl.host);
    }
  } catch {
    // ignore
  }

  // 提取请求来源
  const origin = request.headers.get('origin');
  let requestHost = '';

  if (origin) {
    try {
      requestHost = new URL(origin).host;
    } catch {
      return false;
    }
  } else {
    // 没有 origin 头时使用 referer
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        requestHost = new URL(referer).host;
      } catch {
        return false;
      }
    } else {
      // 都没有，无法判断来源
      return false;
    }
  }

  // 精确匹配
  if (allowedHosts.has(requestHost)) {
    return true;
  }

  // 宽松匹配：忽略端口号
  const requestHostname = requestHost.split(':')[0];
  for (const allowed of allowedHosts) {
    if (allowed.split(':')[0] === requestHostname) {
      return true;
    }
  }

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
      const sessionData = {
        userType: 'admin' as const,
        userId: user.id,
        storeId: null,
      };
      await setAuthCookie(sessionData);
      const token = createToken(sessionData);
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
        token,
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
      const sessionData = {
        userType: 'store_user' as const,
        userId: user.id,
        storeId: user.storeId,
        permissions: user.permissions || undefined,
      };
      await setAuthCookie(sessionData);
      const token = createToken(sessionData);
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
        phone: user.phone,
        storeId: user.storeId,
        permissions: user.permissions,
        token,
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
      const sessionData = {
        userType: 'customer' as const,
        userId: customer.id,
        storeId: customer.storeId,
      };
      await setAuthCookie(sessionData);
      const token = createToken(sessionData);
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
        phone: customer.phone,
        storeId: customer.storeId,
        token,
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
