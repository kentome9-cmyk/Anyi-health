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
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        customer: true,
        store: { select: { id: true, storeName: true, address: true, contactPhone: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      storeId: report.storeId,
      store: report.store,
      storeName: report.store.storeName,
      customerId: report.customerId,
      customer: report.customer,
      customerName: report.customer.name,
      customerPhone: report.customer.phone,
      type: report.type,
      content: report.content,
      images: report.images,
      structuredData: report.structuredData,
      createdAt: report.createdAt,
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json({ error: 'Failed to get report' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    await prisma.report.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
