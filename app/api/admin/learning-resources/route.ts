import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile, stat, unlink, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import crypto from 'crypto';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { uploadToOss, deleteFromOss, getObjectKeyFromUrl, isOssUrl } from '@/lib/oss';

interface LearningResource {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string | null;
  content: string | null;
  filePath: string | null;
  pageCount: number | null;
  fileSize: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_FILE_SIZE = {
  pdf: 20 * 1024 * 1024,
  md: 2 * 1024 * 1024,
  pptx: 50 * 1024 * 1024,
  ppt: 50 * 1024 * 1024,
  mp4: 500 * 1024 * 1024,
  webm: 500 * 1024 * 1024,
  mov: 500 * 1024 * 1024,
};

const ALLOWED_EXTENSIONS = ['md', 'pptx', 'ppt', 'pdf', 'mp4', 'webm', 'mov'];

const FILE_SIGNATURES: Record<string, Buffer[]> = {
  pdf: [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  zip: [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
  pptx: [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
  ppt: [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])],
  mp4: [
    Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x0C, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x66, 0x74, 0x79, 0x70]),
  ],
  webm: [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  mov: [
    Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x0C, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x6D, 0x6F, 0x6F, 0x76]),
  ],
};

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

async function verifyFileSignature(file: File, ext: string): Promise<boolean> {
  if (ext === 'md') return true;
  
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return true;
  }
  
  const signatures = FILE_SIGNATURES[ext];
  if (!signatures || signatures.length === 0) return true;
  
  try {
    for (const signature of signatures) {
      const bytes = await file.slice(0, signature.length).arrayBuffer();
      const header = Buffer.from(bytes);
      if (header.equals(signature)) return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';

    const where: any = { isActive: true };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }

    const list: LearningResource[] = await prisma.learningResource.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(list);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
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

      if (type === 'ppt' && !file) {
        return NextResponse.json(
          { error: '上传PPT文件不能为空' },
          { status: 400 }
        );
      }

      if (type === 'md' && !file) {
        return NextResponse.json(
          { error: '上传MD文件不能为空' },
          { status: 400 }
        );
      }

      let filePath: string | null = null;
      let fileSize: string | null = null;
      let pageCount: number | null = null;
      let content: string | null = null;

      const directFilePath = formData.get('filePath') as string | null;

      if (directFilePath) {
        filePath = directFilePath;
        if (file) {
          fileSize = formatFileSize(file.size);
        }
      } else if (file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
          return NextResponse.json(
            { error: '不支持的文件格式，请上传 .md、.pptx、.ppt、.pdf、.mp4、.webm 或 .mov 文件' },
            { status: 400 }
          );
        }

        const maxSize = MAX_FILE_SIZE[fileExt as keyof typeof MAX_FILE_SIZE] || MAX_FILE_SIZE.md;
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `文件大小超过限制，最大允许 ${(maxSize / (1024 * 1024)).toFixed(1)} MB` },
            { status: 400 }
          );
        }

        if (!(await verifyFileSignature(file, fileExt))) {
          return NextResponse.json(
            { error: '文件格式验证失败，请上传真实的文件' },
            { status: 400 }
          );
        }

        const uuid = crypto.randomUUID();
        const safeExt = sanitizeFileName(fileExt);
        const fileName = `${uuid}.${safeExt}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (fileExt === 'md') {
          content = buffer.toString('utf-8');
        }

        const ossUrl = await uploadToOss(buffer, fileName, 'learning');
        console.log('[Learning Resource] ossUrl result:', ossUrl);
        if (!ossUrl) {
          console.log('[Learning Resource] OSS upload failed, falling back to local storage');
          const uploadDir = join(process.cwd(), 'public', 'uploads', 'learning');
          await mkdir(uploadDir, { recursive: true });
          const fullPath = resolve(uploadDir, fileName);
          await writeFile(fullPath, buffer);
          filePath = `/uploads/learning/${fileName}`;
        } else {
          filePath = ossUrl;
        }

        fileSize = formatFileSize(file.size);

        if (fileExt === 'pdf') {
          const tempPath = join(process.cwd(), 'public', 'uploads', 'learning', fileName);
          await writeFile(tempPath, buffer);
          pageCount = await getPdfPageCount(tempPath);
          await unlink(tempPath).catch(() => {});
        }
      }

      const resource = await prisma.learningResource.create({
        data: {
          title,
          type,
          category,
          description: description || null,
          content: type === 'md' ? content : null,
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

      if (type === 'md' && !content) {
        return NextResponse.json(
          { error: 'MD文档内容不能为空' },
          { status: 400 }
        );
      }

      const resource = await prisma.learningResource.create({
        data: {
          title,
          type,
          category,
          description: description || null,
          content: type === 'md' ? content : null,
        },
      });

      return NextResponse.json(resource);
    }
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const action = body.action || '';

    if (action === 'update-status') {
      const { id, isActive } = body;
      await prisma.learningResource.update({
        where: { id },
        data: { isActive },
      });
      return NextResponse.json({ success: true, message: '状态已更新' });
    }

    if (action === 'reorder') {
      const { id, sortOrder } = body;
      await prisma.learningResource.update({
        where: { id },
        data: { sortOrder },
      });
      return NextResponse.json({ success: true, message: '排序已更新' });
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请选择要删除的资源' },
        { status: 400 }
      );
    }

    const resources = await prisma.learningResource.findMany({
      where: { id: { in: ids } },
      select: { filePath: true },
    });

    const uploadDir = resolve(process.cwd(), 'public', 'uploads', 'learning');

    for (const resource of resources) {
      if (resource.filePath) {
        if (isOssUrl(resource.filePath)) {
          const objectKey = getObjectKeyFromUrl(resource.filePath);
          if (objectKey) {
            await deleteFromOss(objectKey).catch(() => {});
          }
        } else {
          const fullPath = resolve(process.cwd(), 'public', resource.filePath);
          if (fullPath.startsWith(uploadDir)) {
            try {
              await stat(fullPath);
              await unlink(fullPath);
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const result = await prisma.learningResource.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      count: result.count,
      message: `成功删除 ${result.count} 条数据`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function getPdfPageCount(filePath: string): Promise<number | null> {
  try {
    const data = await readFile(filePath);
    const content = data.toString();
    const matches = content.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : Math.max(1, Math.round(data.length / 15000));
  } catch {
    return null;
  }
}