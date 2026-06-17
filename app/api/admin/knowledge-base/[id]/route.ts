import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const knowledge = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!knowledge) {
      return NextResponse.json(
        { error: '知识库条目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    return NextResponse.json(
      { error: '获取知识库条目失败' },
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
      project,
      manifestation,
      pairingEffect,
      symptom,
      pairingItem,
      pairingReason,
      carePlan,
      effectEstimation,
    } = body;

    const knowledge = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        project,
        manifestation,
        pairingEffect,
        symptom,
        pairingItem,
        pairingReason,
        carePlan,
        effectEstimation,
      },
    });

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Update knowledge base error:', error);
    return NextResponse.json(
      { error: '更新知识库条目失败' },
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
    await prisma.knowledgeBase.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    return NextResponse.json(
      { error: '删除知识库条目失败' },
      { status: 500 }
    );
  }
}
