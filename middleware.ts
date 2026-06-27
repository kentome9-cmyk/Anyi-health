import { NextResponse, NextRequest } from 'next/server';

// 注意：middleware 跑在 edge runtime，不能 import 使用 next/headers 的模块
// 这里把 cookie 名和 session 类型在本地声明，避免打包 node-only 依赖
const AUTH_COOKIE_NAME = 'anyi_auth';

type AuthSession = {
  userType: 'admin' | 'store_user' | 'customer';
  userId: string;
  storeId: string | null;
};

function parseAuthCookie(request: NextRequest): AuthSession | null {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = parseAuthCookie(request);

  // API 路由：未授权返回 401
  if (pathname.startsWith('/api/admin/')) {
    if (!auth || auth.userType !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/api/store/')) {
    if (!auth || (auth.userType !== 'store_user' && auth.userType !== 'admin')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
  }

  // 页面路由：未授权重定向到登录页
  if (pathname.startsWith('/admin')) {
    if (!auth || auth.userType !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/login/admin';
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/store')) {
    if (!auth || (auth.userType !== 'store_user' && auth.userType !== 'admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/customer')) {
    if (!auth || auth.userType !== 'customer') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/store/:path*',
    '/customer/:path*',
    '/api/admin/:path*',
    '/api/store/:path*',
  ],
};
