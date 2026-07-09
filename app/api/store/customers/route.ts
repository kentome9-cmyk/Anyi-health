import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { storeId } = await requireStoreUser(request);
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const keyword = searchParams.get('keyword') || '';
    const skip = (page - 1) * pageSize;

    const where: any = { storeId };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          plans: { select: { status: true, isLatest: true } },
          bodyRecords: {
            orderBy: { visitDate: 'desc' },
            take: 1,
            select: { visitDate: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const customerList = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      age: customer.age,
      storeId: customer.storeId,
      postpartumDays: customer.postpartumDays,
      deliveryMethod: customer.deliveryMethod,
      birthOrder: customer.birthOrder,
      allergy: customer.allergy,
      hasAbortionHistory: customer.hasAbortionHistory,
      height: customer.height,
      weight: customer.weight,
      planStatus: customer.plans[0]?.status || '',
      planCount: customer.plans.length,
      lastServiceDate: customer.bodyRecords[0]?.visitDate || null,
      createdAt: customer.createdAt,
    }));

    return NextResponse.json({
      list: customerList,
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
      name,
      phone,
      age,
      postpartumDays,
      deliveryMethod,
      birthOrder,
      allergy,
      hasAbortionHistory,
      height,
      weight,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: '姓名和手机号不能为空' },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone, storeId },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: '该手机号已存在客户档案' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        age: age ? parseInt(age) : null,
        storeId,
        postpartumDays: postpartumDays ? parseInt(postpartumDays) : null,
        deliveryMethod,
        birthOrder: birthOrder ? parseInt(birthOrder) : null,
        allergy,
        hasAbortionHistory: Boolean(hasAbortionHistory),
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
      },
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}