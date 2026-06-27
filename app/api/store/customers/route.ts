import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      postpartumDays: customer.postpartumDays,
      deliveryMethod: customer.deliveryMethod,
      birthOrder: customer.birthOrder,
      allergy: customer.allergy,
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
    console.error('Get store customers error:', error);
    return NextResponse.json(
      { error: '获取客户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[DEBUG] Store create customer request body:', JSON.stringify(body, null, 2));
    
    const {
      name,
      phone,
      age,
      storeId,
      postpartumDays,
      deliveryMethod,
      birthOrder,
      allergy,
      hasAbortionHistory,
      height,
      weight,
    } = body;

    console.log('[DEBUG] name:', name, 'phone:', phone, 'storeId:', storeId);

    if (!name || !phone || !storeId) {
      console.error('[ERROR] Validation failed: name/phone/storeId is empty');
      return NextResponse.json(
        { error: '姓名、手机号和门店不能为空' },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone },
    });

    if (existingCustomer) {
      console.log('[DEBUG] Customer already exists with phone:', phone, 'using existing id:', existingCustomer.id);
      return NextResponse.json({
        id: existingCustomer.id,
        name: existingCustomer.name,
      });
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

    console.log('[DEBUG] Customer created successfully:', customer.id);
    return NextResponse.json({
      id: customer.id,
      name: customer.name,
    });
  } catch (error) {
    console.error('[ERROR] Create store customer error:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message);
      console.error('[ERROR] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: '创建客户失败', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
