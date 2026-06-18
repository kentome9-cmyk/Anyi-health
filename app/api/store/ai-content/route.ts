import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    const where: any = { isActive: true };
    if (roleId) {
      where.roleId = roleId;
    }

    const templates = await prisma.contentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: { id: true, name: true, systemPrompt: true },
        },
      },
    });

    // 获取所有可用的角色
    const roles = await prisma.aIRole.findMany({
      where: { isActive: true, category: 'generation' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, description: true },
    });

    return NextResponse.json({
      templates,
      roles,
    });
  } catch (error) {
    console.error('Get store content templates error:', error);
    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    );
  }
}
