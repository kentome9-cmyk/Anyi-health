import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/openai';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const item = await prisma.product.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: '获取产品失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, name, spec, price, ingredients, effects, targetAudience, usage } = body;

    if (!category || !name) {
      return NextResponse.json({ error: '分类和产品名称不能为空' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    let embedding = existing.embedding as number[] | null;
    if (!embedding) {
      const text = [name, category, effects, targetAudience, ingredients]
        .filter(Boolean)
        .join(' ');
      embedding = await getEmbedding(text);
    }

    const item = await prisma.product.update({
      where: { id },
      data: {
        category, name, spec, price, ingredients, effects, targetAudience, usage,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: '更新产品失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: '删除产品失败' }, { status: 500 });
  }
}
