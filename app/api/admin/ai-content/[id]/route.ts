import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const template = await prisma.contentTemplate.findUnique({
      where: { id },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Get content template error:', error);
    return NextResponse.json(
      { error: '获取内容模板详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, prompt, variables, outputFormat, exampleOutput, roleId, isActive } = body;

    const template = await prisma.contentTemplate.update({
      where: { id },
      data: {
        name,
        description: description || null,
        prompt,
        variables: variables || null,
        outputFormat: outputFormat || 'text',
        exampleOutput: exampleOutput || null,
        roleId: roleId || null,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Update content template error:', error);
    return NextResponse.json(
      { error: '更新内容模板失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.contentTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete content template error:', error);
    return NextResponse.json(
      { error: '删除内容模板失败' },
      { status: 500 }
    );
  }
}
