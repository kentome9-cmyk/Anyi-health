import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ALL_STORE_PERMISSIONS } from '@/lib/store-permissions';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

const isValidPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

const isValidPassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
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
    logError('Get stores error', error);
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const {
      storeName,
      description,
      address,
      contactPhone,
      expirationTime,
      userPhone,
      userPassword,
      userName,
      userId,
    } = body;

    if (!storeName) {
      return NextResponse.json(
        { error: '门店名称不能为空' },
        { status: 400 }
      );
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
      return NextResponse.json(
        { error: '联系电话格式不正确（需为11位手机号）' },
        { status: 400 }
      );
    }

    let finalUserId = userId;

    if (!finalUserId) {
      if (!userPhone || !userPassword) {
        return NextResponse.json(
          { error: '请填写登录手机号和密码' },
          { status: 400 }
        );
      }

      if (!isValidPhone(userPhone)) {
        return NextResponse.json(
          { error: '登录手机号格式不正确（需为11位手机号）' },
          { status: 400 }
        );
      }

      if (!isValidPassword(userPassword)) {
        return NextResponse.json(
          { error: '密码至少需要6位字符' },
          { status: 400 }
        );
      }

      const existingUser = await prisma.storeUser.findUnique({
        where: { phone: userPhone },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: '该手机号已被其他门店使用' },
          { status: 400 }
        );
      }

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
    } else {
      const existingUser = await prisma.storeUser.findUnique({
        where: { id: finalUserId },
        include: { stores: true },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: 400 }
        );
      }

      if (existingUser.stores.length > 0) {
        return NextResponse.json(
          { error: '该用户已关联门店，无法重复创建' },
          { status: 400 }
        );
      }
    }

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
    logError('Create store error', error);
    return handleAuthError(error);
  }
}