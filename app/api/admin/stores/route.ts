import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ALL_STORE_PERMISSIONS } from '@/lib/store-permissions';

// 手机号格式验证：中国大陆11位手机号
const isValidPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

// 密码验证：至少6位
const isValidPassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          storeUser: {
            select: { id: true, phone: true, name: true, permissions: true },
          },
          _count: {
            select: { customers: true, plans: true },
          },
        },
      }),
      prisma.store.count(),
    ]);

    const storeList = stores.map((store: typeof stores[number]) => ({
      id: store.id,
      storeName: store.storeName,
      description: store.description,
      address: store.address,
      contactPhone: store.contactPhone,
      status: store.status,
      expirationTime: store.expirationTime,
      createdAt: store.createdAt,
      customerCount: store._count.customers,
      planCount: store._count.plans,
      storeUser: store.storeUser,
    }));

    return NextResponse.json({
      list: storeList,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: '获取门店列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      storeName,
      description,
      address,
      contactPhone,
      expirationTime,
      // 登录凭据字段
      userPhone,
      userPassword,
      userName,
      // 兼容旧字段（直接传入已有userId）
      userId,
    } = body;

    if (!storeName) {
      return NextResponse.json(
        { error: '门店名称不能为空' },
        { status: 400 }
      );
    }

    // 联系电话选填校验（如果填了就要验证格式）
    if (contactPhone && !isValidPhone(contactPhone)) {
      return NextResponse.json(
        { error: '联系电话格式不正确（需为11位手机号）' },
        { status: 400 }
      );
    }

    let finalUserId = userId;

    // 如果没有传入userId，则使用登录凭据创建新的StoreUser
    if (!finalUserId) {
      if (!userPhone || !userPassword) {
        return NextResponse.json(
          { error: '请填写登录手机号和密码' },
          { status: 400 }
        );
      }

      // 手机号格式校验
      if (!isValidPhone(userPhone)) {
        return NextResponse.json(
          { error: '登录手机号格式不正确（需为11位手机号）' },
          { status: 400 }
        );
      }

      // 密码格式校验
      if (!isValidPassword(userPassword)) {
        return NextResponse.json(
          { error: '密码至少需要6位字符' },
          { status: 400 }
        );
      }

      // 检查手机号是否已存在
      const existingUser = await prisma.storeUser.findUnique({
        where: { phone: userPhone },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: '该手机号已被其他门店使用' },
          { status: 400 }
        );
      }

      // 创建新的StoreUser（管理员创建时默认全权限）
      const hashedPassword = await bcrypt.hash(userPassword, 10);
      const newUser = await prisma.storeUser.create({
        data: {
          phone: userPhone,
          password: hashedPassword,
          name: userName || null,
          permissions: JSON.stringify(ALL_STORE_PERMISSIONS),
        },
      });

      finalUserId = newUser.id;
    }

    // 创建门店
    const store = await prisma.store.create({
      data: {
        storeUserId: finalUserId,
        storeName,
        description,
        address,
        contactPhone,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
      },
    });

    return NextResponse.json({
      id: store.id,
      storeName: store.storeName,
    });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { error: '创建门店失败' },
      { status: 500 }
    );
  }
}
