import { NextRequest, NextResponse } from 'next/server';
import { requireStoreUser, handleAuthError } from '@/lib/auth';
import { uploadToOss } from '@/lib/oss';
import fs from 'fs';
import path from 'path';

async function uploadToLocal(buffer: Buffer, fileName: string): Promise<string | null> {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, buffer);
    
    return `/uploads/reports/${fileName}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStoreUser(request);
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小超过限制，最大允许 50 MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'dat';
    const fileName = `${timestamp}-${file.name}`;
    
    let url = await uploadToOss(buffer, fileName, 'reports');
    
    if (!url) {
      url = await uploadToLocal(buffer, fileName);
    }
    
    if (!url) {
      return NextResponse.json(
        { error: '文件上传失败' },
        { status: 500 }
      );
    }

    const mimeType = file.type || 'image/jpeg';
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url,
      fileName: file.name,
      size: file.size,
      base64,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}