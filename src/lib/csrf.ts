import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return token;
}

export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieToken = await getCSRFToken();
  if (!cookieToken) return false;

  const headerToken = request.headers.get('x-csrf-token');
  return cookieToken === headerToken;
}