import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId 缺失' }, { status: 400 });
    }

    await prisma.scriptRecord.deleteMany({
      where: { id, storeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete script:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
