import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { customerId } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || '';

    const reports = await prisma.report.findMany({
      where: {
        customerId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        store: { select: { storeName: true } },
      },
    });

    return NextResponse.json({
      list: reports.map((report: typeof reports[number]) => ({
        id: report.id,
        customerId: report.customerId,
        customerName: report.customer.name,
        customerPhone: report.customer.phone,
        storeId: report.storeId,
        storeName: report.store.storeName,
        type: report.type,
        content: report.content,
        images: report.images,
        structuredData: report.structuredData,
        createdAt: report.createdAt,
      })),
      total: reports.length,
    });
  } catch (error) {
    console.error('Get customer reports error:', error);
    return NextResponse.json({ error: 'Failed to get customer reports' }, { status: 500 });
  }
}
