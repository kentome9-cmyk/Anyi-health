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
    console.error('Get store body record error:', error);
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
    console.log('[DEBUG] Store update body record request body:', JSON.stringify(body, null, 2));
    
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

    console.log('[DEBUG] Body record updated successfully:', record.id);
    return NextResponse.json(record);
  } catch (error) {
    console.error('[ERROR] Update body record error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
    }
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
    console.log('[DEBUG] Body record deleted successfully:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Delete body record error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
    }
    return NextResponse.json(
      { error: '删除记录失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
