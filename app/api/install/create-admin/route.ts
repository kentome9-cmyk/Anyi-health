import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAdmin } from '@/services/auth.service';

// 强制使用 Node.js 运行时
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateAdminBody {
  username?: string;
  password?: string;
  name?: string;
}

/**
 * 创建初始管理员账号
 * - 校验参数：用户名（3-100）、密码（6-50）
 * - 校验：系统中尚无管理员时方可创建（避免重复初始化）
 */
export async function POST(request: Request) {
  let body: CreateAdminBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: '请求体格式错误' },
      { status: 400 }
    );
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  const name = (body.name || '').trim() || null;

  // 校验
  if (username.length < 3 || username.length > 100) {
    return NextResponse.json(
      { success: false, message: '用户名长度需在 3-100 个字符之间' },
      { status: 400 }
    );
  }
  if (password.length < 6 || password.length > 50) {
    return NextResponse.json(
      { success: false, message: '密码长度需在 6-50 个字符之间' },
      { status: 400 }
    );
  }
  if (!/^[a-zA-Z0-9_@.\-]+$/.test(username)) {
    return NextResponse.json(
      {
        success: false,
        message: '用户名只能包含字母、数字、下划线、@、.、-',
      },
      { status: 400 }
    );
  }

  try {
    // 检查是否已存在管理员
    const existing = await prisma.admin.count();
    if (existing > 0) {
      return NextResponse.json(
        {
          success: false,
          message: '系统已初始化完成，无需重复创建管理员',
        },
        { status: 400 }
      );
    }

    const admin = await createAdmin(username, password, name || undefined);

    return NextResponse.json({
      success: true,
      message: '管理员账号创建成功',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, message: '用户名已存在' },
        { status: 400 }
      );
    }

    // 可能是表不存在等错误
    const detail = error instanceof Error ? error.message : '未知错误';
    const isTableMissing =
      detail.includes('does not exist') ||
      detail.includes('relation') ||
      detail.includes('table');

    return NextResponse.json(
      {
        success: false,
        message: isTableMissing
          ? '数据库表尚未创建，请先执行数据库迁移'
          : '创建管理员失败',
        detail,
      },
      { status: 500 }
    );
  }
}
