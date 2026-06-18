import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    const where = roleId ? { roleId } : {};

    const templates = await prisma.contentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      list: templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('Get content templates error:', error);
    return NextResponse.json(
      { error: '获取内容模板失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, prompt, variables, outputFormat, exampleOutput, roleId, isActive } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: '模板名称和提示词不能为空' },
        { status: 400 }
      );
    }

    const template = await prisma.contentTemplate.create({
      data: {
        name,
        description: description || null,
        prompt,
        variables: variables || null,
        outputFormat: outputFormat || 'text',
        exampleOutput: exampleOutput || null,
        roleId: roleId || null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Create content template error:', error);
    return NextResponse.json(
      { error: '创建内容模板失败' },
      { status: 500 }
    );
  }
}
