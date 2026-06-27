import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 退出登录：清除 httpOnly cookie
 */
export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
