import { NextResponse } from 'next/server';
import { assertWritableAdmin, handleAuthError, requireAdmin } from '@/lib/auth';
import { resetDemoData } from '../../../../../scripts/reset-demo-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);

    const result = await resetDemoData();
    return NextResponse.json({
      success: true,
      message: '演示数据已清空',
      totals: result,
    });
  } catch (error) {
    console.error('[admin/demo-data/reset] error:', error);
    return handleAuthError(error);
  }
}
