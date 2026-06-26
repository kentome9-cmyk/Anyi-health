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
    const item = await prisma.healthPlan.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Get health plan error:', error);
    return NextResponse.json({ error: '获取方案失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, targetAudience, productCombo, usage } = body;

    if (!type) {
      return NextResponse.json({ error: '调理类型不能为空' }, { status: 400 });
    }

    const existing = await prisma.healthPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    let embedding = existing.embedding as number[] | null;
    if (!embedding) {
      const text = [type, targetAudience, productCombo]
        .filter(Boolean)
        .join(' ');
      embedding = await getEmbedding(text);
    }

    const item = await prisma.healthPlan.update({
      where: { id },
      data: {
        type, targetAudience, productCombo, usage,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Update health plan error:', error);
    return NextResponse.json({ error: '更新方案失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    await prisma.healthPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete health plan error:', error);
    return NextResponse.json({ error: '删除方案失败' }, { status: 500 });
  }
}
