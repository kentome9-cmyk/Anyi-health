import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/services/auth.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(admins);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';
    const name = (body.name || '').trim() || null;

    if (username.length < 3 || username.length > 100) {
      return NextResponse.json(
        { error: '用户名长度需在 3-100 个字符之间' },
        { status: 400 }
      );
    }
    if (password.length < 6 || password.length > 50) {
      return NextResponse.json(
        { error: '密码长度需在 6-50 个字符之间' },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_@.\-]+$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字、下划线、@、.、-' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: { username, password: hashed, name: name ?? undefined },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admin);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    console.error('[admin/admins POST] error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
