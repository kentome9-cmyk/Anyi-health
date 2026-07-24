import { NextResponse, NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'anyi_auth';
const SIGNING_SECRET = process.env.SESSION_SECRET;

type AuthSession = {
  userType: 'admin' | 'store_user' | 'customer';
  userId: string;
  storeId: string | null;
  permissions?: string[];
  isDemo?: boolean;
  demoBatchId?: string | null;
  expiresAt: number;
};

const DEMO_BLOCKED_ADMIN_API_PREFIXES = [
  '/api/admin/admins',
  '/api/admin/ai-settings',
  '/api/admin/ai-qa',
  '/api/admin/backup',
  '/api/admin/health-plans',
  '/api/admin/knowledge-base',
  '/api/admin/learning-categories',
  '/api/admin/learning-resources',
  '/api/admin/login-logs',
  '/api/admin/menstrual-knowledge-base',
  '/api/admin/operation-logs',
  '/api/admin/oss-',
  '/api/admin/products',
  '/api/admin/prompts',
  '/api/admin/script-materials',
  '/api/admin/settings',
  '/api/admin/store-users',
];

const DEMO_BLOCKED_ADMIN_PAGE_PREFIXES = [
  '/admin/demo-data',
];

async function hmacSHA256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function parseSignedSession(raw: string): Promise<AuthSession | null> {
  if (!SIGNING_SECRET || SIGNING_SECRET.length < 32) {
    return null;
  }

  const [data, signature] = raw.split('.');
  if (!data || !signature) return null;

  try {
    const expectedSignature = await hmacSHA256(data, SIGNING_SECRET);
    if (signature !== expectedSignature) return null;

    const session = JSON.parse(data) as AuthSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

async function getSession(request: NextRequest): Promise<AuthSession | null> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const session = await parseSignedSession(authHeader.slice(7));
    if (session) {
      return session;
    }
  }

  const rawCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (rawCookie) {
    const session = await parseSignedSession(rawCookie);
    if (session) {
      return session;
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 });
  }

  const { pathname } = request.nextUrl;
  const auth = await getSession(request);

  if (pathname.startsWith('/api/admin/')) {
    if (!auth || auth.userType !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    if (auth.isDemo) {
      if (request.method !== 'GET') {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }

      if (DEMO_BLOCKED_ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith('/api/store/')) {
    if (!auth || (auth.userType !== 'store_user' && auth.userType !== 'admin')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!auth || auth.userType !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/login/admin';
      return NextResponse.redirect(url);
    }

    if (auth.isDemo && DEMO_BLOCKED_ADMIN_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
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
    '/api/auth/:path*',
  ],
};
