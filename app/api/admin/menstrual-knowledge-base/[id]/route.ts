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
    const item = await prisma.menstrualKnowledgeBase.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: '知识条目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Get menstrual knowledge item error:', error);
    return NextResponse.json(
      { error: '获取知识条目失败' },
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
    const body = await request.json();
    const {
      category,
      symptom,
      cause,
      suggestion,
      dietAdvice,
      lifestyleAdvice,
      attention,
    } = body;

    if (!category || !symptom) {
      return NextResponse.json(
        { error: '分类和症状不能为空' },
        { status: 400 }
      );
    }

    // 获取现有数据
    const existing = await prisma.menstrualKnowledgeBase.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '知识条目不存在' },
        { status: 404 }
      );
    }

    // 如果 embedding 为空，则生成新的向量
    let embedding = existing.embedding as number[] | null;
    if (!embedding) {
      const text = [
        category,
        symptom,
        cause,
        suggestion,
        dietAdvice,
        lifestyleAdvice,
        attention,
      ]
        .filter(Boolean)
        .join(' ');
      embedding = await getEmbedding(text);
    }

    const item = await prisma.menstrualKnowledgeBase.update({
      where: { id },
      data: {
        category,
        symptom,
        cause,
        suggestion,
        dietAdvice,
        lifestyleAdvice,
        attention,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Update menstrual knowledge item error:', error);
    return NextResponse.json(
      { error: '更新知识条目失败' },
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

    await prisma.menstrualKnowledgeBase.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete menstrual knowledge item error:', error);
    return NextResponse.json(
      { error: '删除知识条目失败' },
      { status: 500 }
    );
  }
}
