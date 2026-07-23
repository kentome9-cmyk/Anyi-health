import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/oss';

export async function POST(request: NextRequest) {
  try {
    const { fileName, folder } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const result = await getPresignedUrl(fileName, folder || 'anyiai');
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[OSS Presigned URL] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}