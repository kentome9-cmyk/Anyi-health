import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthCookie } from '@/lib/auth-cookie';
import { ALL_STORE_PERMISSIONS, type StorePermissionKey } from '@/lib/store-permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthCookie();
    if (!auth || auth.userType !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const { permissions } = await request.json();

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: '权限格式错误' }, { status: 400 });
    }

    // 校验权限合法性
    const validPerms = permissions.filter(
      (p) => ALL_STORE_PERMISSIONS.includes(p as StorePermissionKey)
    );

    const user = await prisma.storeUser.update({
      where: { id },
      data: {
        permissions: JSON.stringify(validPerms),
      },
    });

    // 记录操作日志
    try {
      await prisma.operationLog.create({
        data: {
          operatorType: auth.userType,
          operatorId: auth.userId,
          action: 'update',
          module: 'store_user',
          targetId: user.id,
          targetName: user.name || user.phone,
          detail: `更新权限：${validPerms.join(', ')}`,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, permissions: validPerms });
  } catch (error) {
    console.error('Update store user permissions error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
