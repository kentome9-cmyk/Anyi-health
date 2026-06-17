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
        store: { select: { storeName: true } },
        plan: { select: { id: true, version: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Body record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Get body record error:', error);
    return NextResponse.json({ error: 'Failed to get body record' }, { status: 500 });
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
    console.error('Update body record error:', error);
    return NextResponse.json({ error: 'Failed to update body record' }, { status: 500 });
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
    console.error('Delete body record error:', error);
    return NextResponse.json({ error: 'Failed to delete body record' }, { status: 500 });
  }
}
