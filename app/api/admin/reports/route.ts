import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const customerId = searchParams.get('customerId') || '';
    const storeId = searchParams.get('storeId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (customerId) {
      where.customerId = customerId;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    applyDemoStoreFilter(where, session);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          store: { select: { storeName: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    const reportList = reports.map((report: typeof reports[number]) => ({
      id: report.id,
      storeId: report.storeId,
      storeName: report.store.storeName,
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
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: '获取报告列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const body = await request.json();
    const {
      storeId,
      customerId,
      type,
      content,
      images,
      structuredData,
    } = body;

    if (!storeId || !customerId) {
      return NextResponse.json(
        { error: '门店和客户不能为空' },
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
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: '创建报告失败' },
      { status: 500 }
    );
  }
}
