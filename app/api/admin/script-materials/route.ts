import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

// 获取素材列表
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = {};
    if (category) where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { source: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.scriptMaterial.findMany({
        where,
        include: {
          uploader: {
            select: { id: true, name: true, username: true },
          },
          _count: {
            select: { rewrites: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scriptMaterial.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logError('Failed to fetch script materials', error);
    return handleAuthError(error);
  }
}

// 新增素材
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { title, content, source, category } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: '标题不能超过 255 个字符' },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { error: '内容不能超过 50000 个字符' },
        { status: 400 }
      );
    }

    const item = await prisma.scriptMaterial.create({
      data: {
        title,
        content,
        source: source || null,
        category: category || null,
        uploadedById: session.userId,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logError('Failed to create script material', error);
    return handleAuthError(error);
  }
}
