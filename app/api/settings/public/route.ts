import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/system-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 公开读取站点设置（不需要登录也能拿到主题色/站点名）
 * - middleware matcher 不会拦截 /api/settings/public，所以无需鉴权
 */
export async function GET() {
  const settings = await getSystemSettings();
  return NextResponse.json(settings);
}
