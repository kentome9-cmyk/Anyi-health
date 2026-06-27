import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOperation } from '@/lib/operation-log';

export async function GET() {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Get prompts error:', error);
    return NextResponse.json(
      { error: '获取提示词失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, description, content, isActive, sortOrder } = body;

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const prompt = await prisma.prompt.create({
      data: {
        name,
        type,
        description: description || '',
        content,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    logOperation({
      action: 'create',
      module: 'prompt',
      targetId: prompt.id,
      targetName: prompt.name,
      detail: `创建提示词：${prompt.name}（${type}）`,
      request,
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Create prompt error:', error);
    return NextResponse.json(
      { error: '创建提示词失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, type, description, content, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少 ID' },
        { status: 400 }
      );
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        name,
        type,
        description,
        content,
        isActive,
        sortOrder,
      },
    });

    logOperation({
      action: 'update',
      module: 'prompt',
      targetId: prompt.id,
      targetName: prompt.name,
      detail: `更新提示词：${prompt.name}`,
      request,
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Update prompt error:', error);
    return NextResponse.json(
      { error: '更新提示词失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少 ID' },
        { status: 400 }
      );
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      select: { name: true, type: true },
    });

    await prisma.prompt.delete({
      where: { id },
    });

    logOperation({
      action: 'delete',
      module: 'prompt',
      targetId: id,
      targetName: prompt?.name,
      detail: prompt ? `删除提示词：${prompt.name}（${prompt.type}）` : `删除提示词 ID：${id}`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prompt error:', error);
    return NextResponse.json(
      { error: '删除提示词失败' },
      { status: 500 }
    );
  }
}
