import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const record = await prisma.bodyRecord.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        plan: { select: { id: true, version: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    logError('Get store body record error', error);
    return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const record = await prisma.bodyRecord.update({
      where: { id },
      data: {
        planId: body.planId || null,
        visitCount: body.visitCount ? parseInt(body.visitCount) : undefined,
        visitDate: body.visitDate ? new Date(body.visitDate) : undefined,
        records: body.records,
        notes: body.notes,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    logError('Update body record error', error);
    return NextResponse.json(
      { error: '更新记录失败', detail: error instanceof Error ? error.message : 'unknown' },
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
    await prisma.bodyRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete body record error', error);
    return NextResponse.json(
      { error: '删除记录失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}