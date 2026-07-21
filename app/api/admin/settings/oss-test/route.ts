import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth-cookie';
import { testOssConnection, resetOssClient } from '@/lib/oss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getAuthCookie();
  if (!session || session.userType !== 'admin') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    resetOssClient();
    const result = await testOssConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/settings/oss-test] error:', error);
    return NextResponse.json(
      { success: false, message: '测试过程发生错误' },
      { status: 500 }
    );
  }
}