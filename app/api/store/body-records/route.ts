import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const customerId = searchParams.get('customerId') || '';
    const planId = searchParams.get('planId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = { storeId };
    if (customerId) {
      where.customerId = customerId;
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

    const recordList = records.map((record) => ({
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
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);
    const body = await request.json();
    
    const {
      customerId,
      planId,
      visitCount,
      visitDate,
      records,
      notes,
    } = body;

    if (!customerId || !visitDate) {
      return NextResponse.json(
        { error: '客户和到店日期不能为空' },
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

    if (planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: planId, storeId },
      });
      if (!plan) {
        return NextResponse.json(
          { error: '方案不存在或不属于当前门店' },
          { status: 400 }
        );
      }
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
    return handleAuthError(error);
  }
}