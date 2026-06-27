import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth-cookie';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/services/auth.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getAuthCookie();
  if (!session || session.userType !== 'admin') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写原密码和新密码' }, { status: 400 });
    }
    if (newPassword.length < 6 || newPassword.length > 50) {
      return NextResponse.json(
        { error: '新密码长度需在 6-50 个字符之间' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.userId },
    });
    if (!admin) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const valid = await verifyPassword(oldPassword, admin.password);
    if (!valid) {
      return NextResponse.json({ error: '原密码错误' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/change-password] error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
