import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 强制使用 Node.js 运行时
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 检查系统是否已安装
 * 已安装标准：Admin 表中至少存在一条记录
 */
export async function GET() {
  try {
    const adminCount = await prisma.admin.count();
    return NextResponse.json({
      installed: adminCount > 0,
      adminCount,
    });
  } catch (error) {
    // 数据库连接失败或表不存在，说明未安装
    console.error('[install/status] 检查安装状态失败:', error);
    return NextResponse.json({
      installed: false,
      adminCount: 0,
      dbError: true,
    });
  }
}
