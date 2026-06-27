import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
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

    const reportList = reports.map((report: typeof reports[number]) => ({
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
    console.error('Get store reports error:', error);
    return NextResponse.json(
      { error: '获取报告列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[DEBUG] Store create report request body:', JSON.stringify(body, null, 2));
    
    const {
      storeId,
      customerId,
      type,
      content,
      images,
      structuredData,
    } = body;

    if (!storeId || !customerId) {
      console.error('[ERROR] Report validation failed: storeId/customerId is empty');
      return NextResponse.json(
        { error: '门店和客户不能为空' },
        { status: 400 }
      );
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        storeId,
        customerId,
        content,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingReport) {
      console.log('[DEBUG] Report already exists, returning existing:', existingReport.id);
      return NextResponse.json(existingReport);
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

    console.log('[DEBUG] Report created successfully:', report.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error('[ERROR] Create report error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
    }
    return NextResponse.json(
      { error: '创建报告失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
