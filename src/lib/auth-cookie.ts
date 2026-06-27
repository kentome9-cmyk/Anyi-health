import { cookies } from 'next/headers';

export type SessionUserType = 'admin' | 'store_user' | 'customer';

export interface AuthSession {
  userType: SessionUserType;
  userId: string;
  storeId: string | null;
}

export const AUTH_COOKIE_NAME = 'anyi_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/**
 * 设置登录态 cookie（httpOnly，前端 JS 无法读取，防 XSS）
 */
export async function setAuthCookie(data: AuthSession) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * 读取当前登录态（Server Component / Route Handler 使用）
 */
export async function getAuthCookie(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * 清除登录态 cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
