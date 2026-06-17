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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: { select: { storeName: true } },
        plans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        aiAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: '客户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      basic: {
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
        createdAt: customer.createdAt,
      },
      conversations: customer.aiAnalyses.map((analysis: typeof customer.aiAnalyses[number]) => ({
        id: analysis.id,
        content: analysis.content,
        reportContent: analysis.reportContent,
        structuredData: analysis.structuredData,
        createdAt: analysis.createdAt,
      })),
      plans: customer.plans.map((plan: typeof customer.plans[number]) => ({
        id: plan.id,
        version: plan.version,
        status: plan.status,
        structuredContent: plan.structuredContent,
        coreProjects: plan.coreProjects,
        assistantProjects: plan.assistantProjects,
        actualCounts: plan.actualCounts,
        createdAt: plan.createdAt,
        completedAt: plan.completedAt,
      })),
    });
  } catch (error) {
    console.error('Get customer detail error:', error);
    return NextResponse.json(
      { error: '获取客户详情失败' },
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
      hasAbortionHistory,
      height,
      weight,
      password,
    } = body;

    if (phone) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { phone },
      });
      if (existingCustomer && existingCustomer.id !== id) {
        return NextResponse.json(
          { error: '该手机号已被其他客户使用' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
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
      hasAbortionHistory,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { error: '更新客户失败' },
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
    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: '删除客户失败' },
      { status: 500 }
    );
  }
}
