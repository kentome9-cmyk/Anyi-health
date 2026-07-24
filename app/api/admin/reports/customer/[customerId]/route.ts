import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, requireAdmin } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await requireAdmin(request);
    const { customerId } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || '';

    const where = applyDemoStoreFilter({
        customerId,
        ...(storeId ? { storeId } : {}),
      }, session);

    const reports = await prisma.report.findMany({
      where,
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
