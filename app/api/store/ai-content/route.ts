import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const templates = await prisma.contentTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      templates,
    });
  } catch (error) {
    console.error('Get store content templates error:', error);
    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    );
  }
}
