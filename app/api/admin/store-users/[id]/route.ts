import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const user = await prisma.storeUser.findUnique({
      where: { id },
      include: {
        stores: {
          select: { id: true, storeName: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '门店用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
      stores: user.stores.map((store: typeof user.stores[number]) => ({
        id: store.id,
        storeName: store.storeName,
      })),
    });
  } catch (error) {
    console.error('Get store user error:', error);
    return NextResponse.json(
      { error: '获取门店用户失败' },
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
    const { phone, name, password, status } = body;

    if (phone) {
      const existingUser = await prisma.storeUser.findUnique({
        where: { phone },
      });
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: '该手机号已被其他用户使用' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      phone,
      name,
      status,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.storeUser.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
    });
  } catch (error) {
    console.error('Update store user error:', error);
    return NextResponse.json(
      { error: '更新门店用户失败' },
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
    await prisma.storeUser.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete store user error:', error);
    return NextResponse.json(
      { error: '删除门店用户失败' },
      { status: 500 }
    );
  }
}
