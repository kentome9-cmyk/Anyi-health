import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { isFilmed } = await request.json();

    // 尝试使用类型安全的 Prisma API
    try {
      // @ts-ignore - 忽略类型检查，因为 isFilmed 字段在旧的 Prisma Client 中不存在
      const script = await (prisma.scriptRecord as any).update({
        where: { id },
        data: { isFilmed },
      });
      return NextResponse.json({ success: true, script });
    } catch (prismaError: any) {
      // 如果 Prisma Client 没有识别新字段，降级到 raw query
      if (prismaError.message && prismaError.message.includes('isFilmed')) {
        console.warn('Prisma Client 未识别 isFilmed 字段，使用 raw query 降级处理');
        const result = await prisma.$executeRaw`
          UPDATE script_records 
          SET "isFilmed" = ${isFilmed} 
          WHERE id = ${id}
        `;
        if (result === 0) {
          return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Failed to update filmed status:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}