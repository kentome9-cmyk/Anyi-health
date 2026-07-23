import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile, stat, unlink, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import crypto from 'crypto';
import { uploadToOss, deleteFromOss, getObjectKeyFromUrl, isOssUrl } from '@/lib/oss';

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

      const categoryExists = await prisma.learningCategory.findUnique({
        where: { name: category },
        select: { id: true },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { error: `分类「${category}」不存在，请先在分类管理中创建` },
          { status: 400 }
        );
      }

      const existingResource = await prisma.learningResource.findUnique({
        where: { id },
        select: { filePath: true, type: true, fileSize: true, pageCount: true, content: true },
      });

      let filePath = existingResource?.filePath || null;
      let fileSize = existingResource?.fileSize || null;
      let pageCount = existingResource?.pageCount || null;
      let content: string | null = existingResource?.content || null;

      const directFilePath = formData.get('filePath') as string | null;

      if (directFilePath) {
        if (existingResource?.filePath && existingResource.filePath !== directFilePath) {
          if (isOssUrl(existingResource.filePath)) {
            const objectKey = getObjectKeyFromUrl(existingResource.filePath);
            if (objectKey) {
              await deleteFromOss(objectKey).catch(() => {});
            }
          } else {
            const oldFullPath = join(process.cwd(), 'public', existingResource.filePath);
            try {
              await stat(oldFullPath);
              await unlink(oldFullPath);
            } catch {
              console.warn(`Cannot delete old file: ${oldFullPath}`);
            }
          }
        }
        filePath = directFilePath;
        if (file) {
          fileSize = formatFileSize(file.size);
        }
      } else if (file) {
        if (existingResource?.filePath) {
          if (isOssUrl(existingResource.filePath)) {
            const objectKey = getObjectKeyFromUrl(existingResource.filePath);
            if (objectKey) {
              await deleteFromOss(objectKey).catch(() => {});
            }
          } else {
            const oldFullPath = join(process.cwd(), 'public', existingResource.filePath);
            try {
              await stat(oldFullPath);
              await unlink(oldFullPath);
            } catch {
              console.warn(`Cannot delete old file: ${oldFullPath}`);
            }
          }
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const allowedExts = ['md', 'pptx', 'ppt', 'pdf', 'mp4', 'webm', 'mov'];
        if (!allowedExts.includes(fileExt || '')) {
          return NextResponse.json(
            { error: '不支持的文件格式，请上传 .md、.pptx、.ppt、.pdf、.mp4、.webm 或 .mov 文件' },
            { status: 400 }
          );
        }

        const uuid = crypto.randomUUID();
        const fileName = `${uuid}.${fileExt}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (fileExt === 'md') {
          content = buffer.toString('utf-8');
          filePath = null;
        } else {
          const ossUrl = await uploadToOss(buffer, fileName, 'learning');
          if (!ossUrl) {
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'learning');
            await mkdir(uploadDir, { recursive: true });
            const fullPath = join(uploadDir, fileName);
            await writeFile(fullPath, buffer);
            filePath = `/uploads/learning/${fileName}`;
          } else {
            filePath = ossUrl;
          }
        }

        fileSize = formatFileSize(file.size);

        if (fileExt === 'pdf') {
          const tempPath = join(process.cwd(), 'public', 'uploads', 'learning', fileName);
          await writeFile(tempPath, buffer);
          pageCount = await getPdfPageCount(tempPath);
          await unlink(tempPath).catch(() => {});
        }
      }

      const resource = await prisma.learningResource.update({
        where: { id },
        data: {
          title,
          type,
          category,
          description: description || null,
          content: type === 'md' ? content : undefined,
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

      const categoryExists = await prisma.learningCategory.findUnique({
        where: { name: category },
        select: { id: true },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { error: `分类「${category}」不存在，请先在分类管理中创建` },
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
      if (isOssUrl(resource.filePath)) {
        const objectKey = getObjectKeyFromUrl(resource.filePath);
        if (objectKey) {
          await deleteFromOss(objectKey).catch(() => {});
        }
      } else {
        const fullPath = join(process.cwd(), 'public', resource.filePath);
        try {
          await stat(fullPath);
          await unlink(fullPath);
        } catch {
          console.warn(`Cannot delete file: ${fullPath}`);
        }
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
