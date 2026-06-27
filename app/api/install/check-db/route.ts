import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 强制使用 Node.js 运行时
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 测试数据库连接
 * 1. 检查 DATABASE_URL 是否存在
 * 2. 通过 Prisma 建立连接
 * 3. 查询当前 public schema 中已存在的表
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    return NextResponse.json(
      { success: false, message: '未配置 DATABASE_URL 环境变量' },
      { status: 400 }
    );
  }

  // 隐藏密码的连接字符串（用于显示）
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');

  try {
    // 基础连通性测试
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    // 查询 public schema 中已存在的表
    let existingTables: string[] = [];
    try {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      existingTables = result.map((r) => r.tablename);
    } catch {
      // 忽略表查询失败（说明权限不足或非 Postgres）
    }

    const tablesExist = existingTables.length > 0;

    return NextResponse.json({
      success: true,
      message: tablesExist
        ? `数据库连接成功（已存在 ${existingTables.length} 张表）`
        : '数据库连接成功，但尚未创建任何表',
      url: maskedUrl,
      tablesExist,
      existingTables,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '数据库连接失败';

    return NextResponse.json(
      {
        success: false,
        message: '数据库连接失败',
        url: maskedUrl,
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
