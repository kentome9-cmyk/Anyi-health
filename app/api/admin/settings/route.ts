import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth-cookie';
import { getSystemSettings, updateSystemSettings } from '@/lib/system-settings';
import { resetOssClient } from '@/lib/oss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskSensitiveValue(value: string, showLength: number = 4): string {
  if (!value) return '';
  if (value.length <= showLength) return '*'.repeat(value.length);
  return '*'.repeat(value.length - showLength) + value.slice(-showLength);
}

export async function GET() {
  const settings = await getSystemSettings();
  const masked = { ...settings };
  if (masked.ossAccessKeyId) {
    masked.ossAccessKeyId = maskSensitiveValue(masked.ossAccessKeyId, 8);
  }
  if (masked.ossAccessKeySecret) {
    masked.ossAccessKeySecret = maskSensitiveValue(masked.ossAccessKeySecret, 4);
  }
  return NextResponse.json(masked);
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
    if (Object.keys(body).some((key) => key.startsWith('oss'))) {
      resetOssClient();
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[admin/settings] error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
