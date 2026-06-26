import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile, stat, unlink } from 'fs/promises';
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
      where: { id },
    });

    if (!resource) {
      return NextResponse.json(
        { error: '学习资源不存在' },
        { status: 404 }
      );
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

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const title = formData.get('title') as string;
      const type = formData.get('type') as string;
      const category = formData.get('category') as string;
      const description = (formData.get('description') as string) || '';
      const file = formData.get('file') as File | null;

      if (!title || !type || !category) {
        return NextResponse.json(
          { error: '标题、类型和分类不能为空' },
          { status: 400 }
        );
      }

      const existingResource = await prisma.learningResource.findUnique({
        where: { id },
        select: { filePath: true, type: true, fileSize: true, pageCount: true },
      });

      let filePath = existingResource?.filePath || null;
      let fileSize = existingResource?.fileSize || null;
      let pageCount = existingResource?.pageCount || null;

      if (file) {
        if (existingResource?.filePath) {
          const oldFullPath = join(process.cwd(), 'public', existingResource.filePath);
          try {
            await stat(oldFullPath);
            await unlink(oldFullPath);
          } catch {
            console.warn(`Cannot delete old file: ${oldFullPath}`);
          }
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'learning');
        await mkdir(uploadDir, { recursive: true });

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const allowedExts = ['md', 'pptx', 'ppt', 'pdf'];
        if (!allowedExts.includes(fileExt || '')) {
          return NextResponse.json(
            { error: '不支持的文件格式，请上传 .md、.pptx、.ppt 或 .pdf 文件' },
            { status: 400 }
          );
        }

        const fileName = `${Date.now()}-${file.name}`;
        const fullPath = join(uploadDir, fileName);
        filePath = `/uploads/learning/${fileName}`;
        fileSize = formatFileSize(file.size);

        const bytes = await file.arrayBuffer();
        await writeFile(fullPath, Buffer.from(bytes));

        if (fileExt === 'pdf') {
          pageCount = await getPdfPageCount(fullPath);
        }
      }

      const resource = await prisma.learningResource.update({
        where: { id },
        data: {
          title,
          type,
          category,
          description: description || null,
          filePath,
          fileSize,
          pageCount,
        },
      });

      return NextResponse.json(resource);
    } else {
      const body = await request.json();
      const { title, type, category, description, content } = body;

      if (!title || !type || !category) {
        return NextResponse.json(
          { error: '标题、类型和分类不能为空' },
          { status: 400 }
        );
      }

      const existingResource = await prisma.learningResource.findUnique({
        where: { id },
        select: { filePath: true, fileSize: true, pageCount: true },
      });

      if (type === 'md' && existingResource?.filePath) {
        const oldFullPath = join(process.cwd(), 'public', existingResource.filePath);
        try {
          await stat(oldFullPath);
          await unlink(oldFullPath);
        } catch {
          console.warn(`Cannot delete old file: ${oldFullPath}`);
        }
      }

      const resource = await prisma.learningResource.update({
        where: { id },
        data: {
          title,
          type,
          category,
          description: description || null,
          content: type === 'md' ? content : null,
          filePath: type === 'md' ? null : existingResource?.filePath,
          fileSize: type === 'md' ? null : existingResource?.fileSize,
          pageCount: type === 'md' ? null : existingResource?.pageCount,
        },
      });

      return NextResponse.json(resource);
    }
  } catch (error) {
    console.error('Update learning resource error:', error);
    return NextResponse.json(
      { error: '更新学习资源失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const resource = await prisma.learningResource.findUnique({
      where: { id },
      select: { filePath: true },
    });

    if (resource?.filePath) {
      const fullPath = join(process.cwd(), 'public', resource.filePath);
      try {
        await stat(fullPath);
        await unlink(fullPath);
      } catch {
        console.warn(`Cannot delete file: ${fullPath}`);
      }
    }

    await prisma.learningResource.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete learning resource error:', error);
    return NextResponse.json(
      { error: '删除学习资源失败' },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function getPdfPageCount(filePath: string): Promise<number | null> {
  try {
    const data = await stat(filePath);
    const avgBytesPerPage = 15000;
    return Math.max(1, Math.round(data.size / avgBytesPerPage));
  } catch {
    return null;
  }
}