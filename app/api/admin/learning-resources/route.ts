import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile, stat, unlink } from 'fs/promises';
import { join } from 'path';

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

export async function GET(request: Request) {
  try {
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
    console.error('Get learning resources error:', error);
    return NextResponse.json(
      { error: '获取学习资源失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    console.error('Create learning resource error:', error);
    return NextResponse.json(
      { error: '创建学习资源失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
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
    console.error('Update learning resource error:', error);
    return NextResponse.json(
      { error: '更新学习资源失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
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

    for (const resource of resources) {
      if (resource.filePath) {
        const fullPath = join(process.cwd(), 'public', resource.filePath);
        try {
          await stat(fullPath);
          await unlink(fullPath);
        } catch {
          console.warn(`File not found or cannot delete: ${fullPath}`);
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
    console.error('Delete learning resources error:', error);
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