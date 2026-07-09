import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStoreUser(request);
    const { id } = await params;

    const script = await prisma.scriptRecord.findUnique({
      where: { id },
    });

    if (!script) {
      return NextResponse.json({ error: '脚本不存在' }, { status: 404 });
    }

    return NextResponse.json({ script });
  } catch (error) {
    return handleAuthError(error);
  }
}

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
