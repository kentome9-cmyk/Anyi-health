import { cookies } from 'next/headers';
import crypto from 'crypto';

export type SessionUserType = 'admin' | 'store_user' | 'customer';

export interface AuthSession {
  userType: SessionUserType;
  userId: string;
  storeId: string | null;
  permissions?: string[];
  expiresAt: number;
}

export const AUTH_COOKIE_NAME = 'anyi_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const SIGNING_SECRET = process.env.SESSION_SECRET;
if (!SIGNING_SECRET || SIGNING_SECRET.length < 32) {
  throw new Error('SESSION_SECRET environment variable must be at least 32 characters');
}

export function signData(data: string): string {
  const signature = crypto.createHmac('sha256', SIGNING_SECRET!).update(data).digest('hex');
  return `${data}.${signature}`;
}

export function verifySignature(signedData: string): string | null {
  const [data, signature] = signedData.split('.');
  if (!data || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET!).update(data).digest('hex');
  if (signature !== expectedSignature) return null;
  return data;
}

export async function setAuthCookie(data: Omit<AuthSession, 'expiresAt'>) {
  const cookieStore = await cookies();
  const session: AuthSession = {
    ...data,
    expiresAt: Date.now() + COOKIE_MAX_AGE * 1000,
  };
  const signedValue = signData(JSON.stringify(session));
  cookieStore.set(AUTH_COOKIE_NAME, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getAuthCookie(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!cookie) return null;
  
  const data = verifySignature(cookie.value);
  if (!data) return null;
  
  try {
    const session = JSON.parse(data) as AuthSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await clearAuthCookie();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}