import { NextResponse, NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'anyi_auth';
const SIGNING_SECRET = process.env.SESSION_SECRET;

const corsOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
  .map(o => o.trim())
  .filter(Boolean);

type AuthSession = {
  userType: 'admin' | 'store_user' | 'customer';
  userId: string;
  storeId: string | null;
  permissions?: string[];
  expiresAt: number;
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

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
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function parseToken(token: string): Promise<AuthSession | null> {
  if (!SIGNING_SECRET || SIGNING_SECRET.length < 32) {
    return null;
  }
  
  const [data, signature] = token.split('.');
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

async function parseAuthCookie(request: NextRequest): Promise<AuthSession | null> {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  
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
    const token = authHeader.slice(7);
    const session = await parseToken(token);
    if (session) {
      return session;
    }
  }

  const cookieSession = await parseAuthCookie(request);
  if (cookieSession) {
    return cookieSession;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isCorsOrigin = corsOrigins.includes(origin);

  const response = NextResponse.next();

  if (isCorsOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  const { pathname } = request.nextUrl;
  const auth = await getSession(request);

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
    '/api/auth/:path*',
  ],
};