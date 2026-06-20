import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const item = await prisma.qaItem.findUnique({
      where: { id },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: '问答不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Get QA item error:', error);
    return NextResponse.json(
      { error: '获取问答详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { question, answer, category, keywords, roleId, isActive } = body;

    const item = await prisma.qaItem.update({
      where: { id },
      data: {
        question,
        answer,
        category: category || null,
        keywords: keywords || null,
        roleId: roleId || null,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Update QA item error:', error);
    return NextResponse.json(
      { error: '更新问答失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.qaItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete QA item error:', error);
    return NextResponse.json(
      { error: '删除问答失败' },
      { status: 500 }
    );
  }
}
