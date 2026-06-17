import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const storeId = searchParams.get('storeId') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (storeId) {
      where.storeId = storeId;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { storeName: true } },
          plans: { where: { isLatest: true }, select: { status: true } },
          bodyRecords: {
            orderBy: { visitDate: 'desc' },
            take: 1,
            select: { visitDate: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const customerList = customers.map((customer: typeof customers[number]) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      age: customer.age,
      storeId: customer.storeId,
      storeName: customer.store.storeName,
      postpartumDays: customer.postpartumDays,
      postpartumTime: customer.postpartumTime,
      deliveryMethod: customer.deliveryMethod,
      birthOrder: customer.birthOrder,
      allergy: customer.allergy,
      notes: customer.notes,
      hasAbortionHistory: customer.hasAbortionHistory,
      height: customer.height,
      weight: customer.weight,
      planStatus: customer.plans[0]?.status || '',
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
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: '获取客户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      age,
      storeId,
      postpartumDays,
      postpartumTime,
      deliveryMethod,
      birthOrder,
      allergy,
      notes,
      password,
      hasAbortionHistory,
      height,
      weight,
    } = body;

    if (!name || !phone || !storeId) {
      return NextResponse.json(
        { error: '姓名、手机号和门店不能为空' },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: '该手机号已存在' },
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
        postpartumTime: postpartumTime ? new Date(postpartumTime) : null,
        deliveryMethod,
        birthOrder: birthOrder ? parseInt(birthOrder) : null,
        allergy,
        notes,
        hasAbortionHistory: Boolean(hasAbortionHistory),
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        password: password ? await bcrypt.hash(password, 10) : null,
      },
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: '创建客户失败' },
      { status: 500 }
    );
  }
}
