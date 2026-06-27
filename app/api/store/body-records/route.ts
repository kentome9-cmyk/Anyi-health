import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const customerId = searchParams.get('customerId') || '';
    const storeId = searchParams.get('storeId') || '';
    const planId = searchParams.get('planId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (customerId) {
      where.customerId = customerId;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (planId) {
      where.planId = planId;
    }

    const [records, total] = await Promise.all([
      prisma.bodyRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          plan: { select: { id: true, version: true } },
        },
      }),
      prisma.bodyRecord.count({ where }),
    ]);

    const recordList = records.map((record: typeof records[number]) => ({
      id: record.id,
      storeId: record.storeId,
      customerId: record.customerId,
      customerName: record.customer.name,
      customerPhone: record.customer.phone,
      planId: record.planId,
      planVersion: record.plan?.version || null,
      visitCount: record.visitCount,
      visitDate: record.visitDate,
      records: record.records,
      notes: record.notes,
      createdAt: record.createdAt,
    }));

    return NextResponse.json({
      list: recordList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get store body records error:', error);
    return NextResponse.json(
      { error: '获取身体记录列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[DEBUG] Store create body record request body:', JSON.stringify(body, null, 2));
    
    const {
      storeId,
      customerId,
      planId,
      visitCount,
      visitDate,
      records,
      notes,
    } = body;

    if (!storeId || !customerId || !visitDate) {
      console.error('[ERROR] Body record validation failed: storeId/customerId/visitDate is empty');
      return NextResponse.json(
        { error: '门店、客户和到店日期不能为空' },
        { status: 400 }
      );
    }

    const record = await prisma.bodyRecord.create({
      data: {
        storeId,
        customerId,
        planId: planId || null,
        visitCount: visitCount ? parseInt(visitCount) : 1,
        visitDate: new Date(visitDate),
        records,
        notes,
      },
    });

    console.log('[DEBUG] Body record created successfully:', record.id);
    return NextResponse.json(record);
  } catch (error) {
    console.error('[ERROR] Create body record error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
    }
    return NextResponse.json(
      { error: '创建身体记录失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
