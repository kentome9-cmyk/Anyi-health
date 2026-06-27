import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth-cookie';
import { getSystemSettings, updateSystemSettings } from '@/lib/system-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSystemSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await getAuthCookie();
  if (!session || session.userType !== 'admin') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updatedBy = session.userId;

    // 简单校验颜色（必须是 hex）
    if (body.themeColor && !/^#[0-9a-fA-F]{6}$/.test(body.themeColor)) {
      return NextResponse.json(
        { error: '主题色格式不正确（需为 #RRGGBB 格式）' },
        { status: 400 }
      );
    }
    if (body.storeThemeColor && !/^#[0-9a-fA-F]{6}$/.test(body.storeThemeColor)) {
      return NextResponse.json(
        { error: '门店主题色格式不正确（需为 #RRGGBB 格式）' },
        { status: 400 }
      );
    }

    const settings = await updateSystemSettings(body, updatedBy);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[admin/settings] error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
