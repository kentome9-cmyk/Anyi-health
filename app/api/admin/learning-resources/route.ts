import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile, stat, unlink, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import crypto from 'crypto';
import { requireAdmin, handleAuthError } from '@/lib/auth';

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
};

const ALLOWED_EXTENSIONS = ['md', 'pptx', 'ppt', 'pdf'];

const FILE_SIGNATURES: Record<string, Buffer> = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
  zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]),
};

async function verifyFileSignature(file: File, ext: string): Promise<boolean> {
  if (ext === 'md') return true;
  
  const signature = FILE_SIGNATURES[ext] || FILE_SIGNATURES.zip;
  if (!signature) return true;
  
  try {
    const bytes = await file.slice(0, signature.length).arrayBuffer();
    const header = Buffer.from(bytes);
    return header.equals(signature);
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
    await requireAdmin();
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

      if (file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
          return NextResponse.json(
            { error: '不支持的文件格式，请上传 .md、.pptx、.ppt 或 .pdf 文件' },
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

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'learning');
        await mkdir(uploadDir, { recursive: true });

        const uuid = crypto.randomUUID();
        const safeExt = sanitizeFileName(fileExt);
        const fileName = `${uuid}.${safeExt}`;
        const fullPath = resolve(uploadDir, fileName);

        const resolvedUploadDir = resolve(uploadDir);
        if (!fullPath.startsWith(resolvedUploadDir)) {
          return NextResponse.json(
            { error: '文件路径无效' },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        await writeFile(fullPath, Buffer.from(bytes));

        filePath = `/uploads/learning/${fileName}`;
        fileSize = formatFileSize(file.size);

        if (fileExt === 'pdf') {
          pageCount = await getPdfPageCount(fullPath);
        }
      }

      const resource = await prisma.learningResource.create({
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
    await requireAdmin();
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