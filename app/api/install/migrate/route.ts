import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// 强制使用 Node.js 运行时
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 安装过程可能耗时较长
export const maxDuration = 120;

/**
 * 执行数据库迁移
 * 通过 child_process 执行 `npx prisma db push --skip-generate`
 */
export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, message: '未配置 DATABASE_URL 环境变量' },
      { status: 400 }
    );
  }

  const cwd = process.cwd();
  const command = 'npx prisma db push --skip-generate --accept-data-loss';

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 110_000, // 110s
    });

    return NextResponse.json({
      success: true,
      message: '数据库表创建/同步成功',
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || '',
    });
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return NextResponse.json(
      {
        success: false,
        message: '数据库迁移失败',
        detail: err.message || '未知错误',
        stdout: err.stdout?.trim() || '',
        stderr: err.stderr?.trim() || '',
        exitCode: err.code,
        cwd,
        command,
      },
      { status: 500 }
    );
  }
}
