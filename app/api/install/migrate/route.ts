import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function checkInstallationStatus(): Promise<boolean> {
  try {
    const result = await execAsync('npx prisma db query "SELECT COUNT(*) FROM admin"', {
      env: process.env,
      timeout: 10_000,
    });
    const count = parseInt(result.stdout.trim());
    return count > 0;
  } catch {
    return false;
  }
}

async function validateInstallationToken(request: Request): Promise<boolean> {
  const INSTALL_TOKEN = process.env.INSTALL_TOKEN;
  
  if (!INSTALL_TOKEN) {
    return false;
  }
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === INSTALL_TOKEN;
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, message: '未配置 DATABASE_URL 环境变量' },
        { status: 400 }
      );
    }

    const isInstalled = await checkInstallationStatus();
    if (isInstalled) {
      return NextResponse.json(
        { success: false, message: '系统已安装完成，禁止重复迁移' },
        { status: 403 }
      );
    }

    const isValidToken = await validateInstallationToken(request);
    if (!isValidToken) {
      return NextResponse.json(
        { success: false, message: '安装令牌无效' },
        { status: 403 }
      );
    }

    const cwd = process.cwd();
    const command = 'npx prisma db push --skip-generate';

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 110_000,
    });

    return NextResponse.json({
      success: true,
      message: '数据库表创建/同步成功',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: '数据库迁移失败',
      },
      { status: 500 }
    );
  }
}