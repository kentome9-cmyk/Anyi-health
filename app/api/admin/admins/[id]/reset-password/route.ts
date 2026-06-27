import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/services/auth.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const password = body.password || '';
    if (password.length < 6 || password.length > 50) {
      return NextResponse.json(
        { error: '新密码长度需在 6-50 个字符之间' },
        { status: 400 }
      );
    }

    const exists = await prisma.admin.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: '管理员不存在' }, { status: 404 });
    }

    const hashed = await hashPassword(password);
    await prisma.admin.update({
      where: { id },
      data: { password: hashed },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/admins/:id/reset-password] error:', error);
    return NextResponse.json({ error: '重置失败' }, { status: 500 });
  }
}
