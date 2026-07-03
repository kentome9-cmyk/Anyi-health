import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/system-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSystemSettings();
  return NextResponse.json({
    privacyPolicy: settings.privacyPolicy,
    termsOfService: settings.termsOfService,
  });
}
