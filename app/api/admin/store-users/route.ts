import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.storeUser.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          stores: {
            select: { id: true, storeName: true },
          },
        },
      }),
      prisma.storeUser.count({ where }),
    ]);

    const userList = users.map((user: typeof users[number]) => ({
      id: user.id,
      phone: user.phone,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
      stores: user.stores.map((store: typeof user.stores[number]) => ({
        id: store.id,
        storeName: store.storeName,
      })),
    }));

    return NextResponse.json({
      list: userList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get store users error:', error);
    return NextResponse.json(
      { error: '获取门店用户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password, name } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: '手机号和密码不能为空' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.storeUser.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已存在' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.storeUser.create({
      data: {
        phone,
        password: hashedPassword,
        name,
      },
    });

    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
    });
  } catch (error) {
    console.error('Create store user error:', error);
    return NextResponse.json(
      { error: '创建门店用户失败' },
      { status: 500 }
    );
  }
}
