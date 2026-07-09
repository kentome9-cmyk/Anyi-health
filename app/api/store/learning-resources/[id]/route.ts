import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const resource = await prisma.learningResource.findUnique({
      where: { id, isActive: true },
    });

    if (!resource) {
      return NextResponse.json(
        { error: '学习资源不存在' },
        { status: 404 }
      );
    }

    if (resource.type === 'md' && !resource.content && resource.filePath) {
      try {
        let fileContent: string;
        if (resource.filePath.startsWith('http://') || resource.filePath.startsWith('https://')) {
          const response = await fetch(resource.filePath);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          fileContent = await response.text();
        } else {
          const fullPath = join(process.cwd(), 'public', resource.filePath);
          fileContent = await readFile(fullPath, 'utf-8');
        }
        return NextResponse.json({ ...resource, content: fileContent });
      } catch (e: any) {
        console.warn(`Failed to read MD file: ${resource.filePath}`, e);
        if (e.code === 'ENOENT') {
          return NextResponse.json(
            { ...resource, content: '', error: '文档文件不存在，请联系管理员重新上传' },
            { status: 200 }
          );
        }
      }
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('Get learning resource error:', error);
    return NextResponse.json(
      { error: '获取学习资源失败' },
      { status: 500 }
    );
  }
}