import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const name = (body.name || '').trim() || null;
    const admin = await prisma.admin.update({
      where: { id },
      data: { name: name ?? null },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(admin);
  } catch (error) {
    console.error('[admin/admins/:id PUT] error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const count = await prisma.admin.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: '系统至少需要保留 1 个管理员账号' },
      { status: 400 }
    );
  }

  try {
    await prisma.admin.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/admins/:id DELETE] error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
