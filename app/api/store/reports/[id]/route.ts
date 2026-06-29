import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { storeId } = await requireStoreUser();
    const { id } = await params;
    
    const report = await prisma.report.findUnique({
      where: { id, storeId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            age: true,
            storeId: true,
            postpartumDays: true,
            deliveryMethod: true,
            birthOrder: true,
            allergy: true,
            hasAbortionHistory: true,
            height: true,
            weight: true,
          },
        },
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
    return handleAuthError(error);
  }
}