import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { getPresignedUrl } from '@/lib/oss';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { fileName, folder, contentType } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const result = await getPresignedUrl(fileName, folder || 'anyiai', contentType);
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: result.url,
      fileUrl: result.cdnUrl,
      objectKey: result.objectKey,
      headers: result.headers,
    });
  } catch (error) {
    console.error('[OSS Upload] Error:', error);
    const authResponse = handleAuthError(error);
    if (authResponse.status !== 500) {
      return authResponse;
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
