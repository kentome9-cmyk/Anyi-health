import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// 手机号格式验证：中国大陆11位手机号
const isValidPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

// 密码验证：至少6位
const isValidPassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        storeUser: {
          select: { id: true, phone: true, name: true },
        },
        _count: {
          select: { customers: true, plans: true },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: '门店不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: '获取门店信息失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      storeName,
      description,
      address,
      contactPhone,
      expirationTime,
      status,
      // 登录凭据字段
      userPhone,
      userPassword,
      userName,
    } = body;

    // 联系电话选填校验（如果填了就要验证格式）
    if (contactPhone && !isValidPhone(contactPhone)) {
      return NextResponse.json(
        { error: '联系电话格式不正确（需为11位手机号）' },
        { status: 400 }
      );
    }

    // 登录手机号选填校验（如果填了就要验证格式）
    if (userPhone && !isValidPhone(userPhone)) {
      return NextResponse.json(
        { error: '登录手机号格式不正确（需为11位手机号）' },
        { status: 400 }
      );
    }

    // 新密码选填校验（如果填了就要验证格式）
    if (userPassword && !isValidPassword(userPassword)) {
      return NextResponse.json(
        { error: '新密码至少需要6位字符' },
        { status: 400 }
      );
    }

    // 获取当前门店信息，找到关联的storeUserId
    const existingStore = await prisma.store.findUnique({
      where: { id },
      select: { storeUserId: true },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: '门店不存在' },
        { status: 404 }
      );
    }

    // 更新门店信息
    await prisma.store.update({
      where: { id },
      data: {
        storeName,
        description,
        address,
        contactPhone,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
        status,
      },
    });

    // 更新StoreUser信息（如果提供了字段）
    if (userPhone || userPassword || userName !== undefined) {
      // 如果修改了手机号，检查是否冲突
      if (userPhone) {
        const conflictUser = await prisma.storeUser.findFirst({
          where: {
            phone: userPhone,
            NOT: { id: existingStore.storeUserId },
          },
        });
        if (conflictUser) {
          return NextResponse.json(
            { error: '该手机号已被其他用户使用' },
            { status: 400 }
          );
        }
      }

      const userUpdateData: any = {};
      if (userPhone) userUpdateData.phone = userPhone;
      if (userName !== undefined) userUpdateData.name = userName || null;
      if (userPassword) {
        userUpdateData.password = await bcrypt.hash(userPassword, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.storeUser.update({
          where: { id: existingStore.storeUserId },
          data: userUpdateData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { error: '更新门店失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    // 获取门店信息，找到关联的storeUserId
    const store = await prisma.store.findUnique({
      where: { id },
      select: { storeUserId: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: '门店不存在' },
        { status: 404 }
      );
    }

    // 在一个事务中删除门店和关联的StoreUser
    // 注意：由于Store表有storeUserId外键，需要先删除Store，再删除StoreUser
    // 但Prisma的关系是Store -> StoreUser，删除StoreUser会因为外键约束失败
    // 所以我们先删除Store，再删除StoreUser
    await prisma.$transaction([
      prisma.store.delete({
        where: { id },
      }),
      prisma.storeUser.delete({
        where: { id: store.storeUserId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json(
      { error: '删除门店失败' },
      { status: 500 }
    );
  }
}
