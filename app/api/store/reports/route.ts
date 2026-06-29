import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser();
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const customerId = searchParams.get('customerId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = { storeId };
    if (customerId) {
      where.customerId = customerId;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    const reportList = reports.map((report) => ({
      id: report.id,
      storeId: report.storeId,
      customerId: report.customerId,
      customerName: report.customer.name,
      customerPhone: report.customer.phone,
      type: report.type,
      content: report.content,
      images: report.images,
      structuredData: report.structuredData,
      createdAt: report.createdAt,
    }));

    return NextResponse.json({
      list: reportList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { storeId } = await requireStoreUser();
    const body = await request.json();
    
    const {
      customerId,
      type,
      content,
      images,
      structuredData,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: '客户不能为空' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, storeId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: '客户不存在或不属于当前门店' },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        storeId,
        customerId,
        type: type || 'text',
        content,
        images,
        structuredData,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    return handleAuthError(error);
  }
}