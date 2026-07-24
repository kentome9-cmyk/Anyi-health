import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
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
    applyDemoStoreFilter(where, session);

    const [records, total] = await Promise.all([
      prisma.bodyRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          store: { select: { storeName: true } },
          plan: { select: { id: true, version: true } },
        },
      }),
      prisma.bodyRecord.count({ where }),
    ]);

    const recordList = records.map((record: typeof records[number]) => ({
      id: record.id,
      storeId: record.storeId,
      storeName: record.store.storeName,
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
    logError('Get body records error', error);
    return handleAuthError(error);
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
      planId,
      visitCount,
      visitDate,
      records,
      notes,
    } = body;

    if (!storeId || !customerId || !visitDate) {
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

    return NextResponse.json(record);
  } catch (error) {
    logError('Create body record error', error);
    return handleAuthError(error);
  }
}
