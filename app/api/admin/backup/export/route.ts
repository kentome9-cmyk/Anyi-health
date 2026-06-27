import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthCookie } from '@/lib/auth-cookie';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TABLE_NAMES = [
  'admin',
  'login_log',
  'system_setting',
  'operation_log',
  'store_user',
  'store',
  'customer',
  'plan',
  'report',
  'body_record',
  'ai_settings',
  'prompt',
  'ai_analysis',
  'content_template',
  'qa_item',
  'knowledge_base',
  'menstrual_knowledge_base',
  'product',
  'health_plan',
  'menstrual_chat_session',
  'menstrual_chat_message',
  'creator_identity',
  'topic',
  'script_records',
  'learning_resource',
];

export async function GET(request: Request) {
  try {
    const auth = await getAuthCookie();
    if (!auth || auth.userType !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'sql').toLowerCase();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;

    if (format === 'sql') {
      try {
        const sqlContent = await exportAsSql();

        try {
          await prisma.operationLog.create({
            data: {
              operatorType: auth.userType,
              operatorId: auth.userId,
              operatorName: auth.userId,
              action: 'export',
              module: 'database',
              targetName: 'full_database',
              detail: `导出完整数据库（SQL格式），共 ${TABLE_NAMES.length} 张表`,
              ip,
              userAgent,
            },
          });
        } catch { /* 日志失败不影响主操作 */ }

        return new NextResponse(sqlContent, {
          headers: {
            'Content-Type': 'application/sql; charset=utf-8',
            'Content-Disposition': `attachment; filename="anyi-health-backup-${timestamp}.sql"`,
          },
        });
      } catch (sqlError) {
        console.error('SQL export failed, falling back to JSON:', sqlError);
        return exportAsJsonResponse(timestamp, ip, userAgent, auth);
      }
    }

    return exportAsJsonResponse(timestamp, ip, userAgent, auth);
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}

async function exportAsJsonResponse(
  timestamp: string,
  ip: string | null,
  userAgent: string | null,
  auth: { userType: string; userId: string }
) {
  const data: Record<string, unknown[]> = {};

  for (const table of TABLE_NAMES) {
    try {
      const modelName = table
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
      const prismaModel = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[
        modelName.charAt(0).toLowerCase() + modelName.slice(1)
      ];
      if (prismaModel && typeof prismaModel.findMany === 'function') {
        data[table] = await prismaModel.findMany();
      }
    } catch {
      // 单表失败不影响整体导出
    }
  }

  try {
    await prisma.operationLog.create({
      data: {
        operatorType: auth.userType,
        operatorId: auth.userId,
        operatorName: auth.userId,
        action: 'export',
        module: 'database',
        targetName: 'full_database',
        detail: `导出完整数据库（JSON格式），共 ${Object.keys(data).length} 张表`,
        ip,
        userAgent,
      },
    });
  } catch { /* 日志失败不影响主操作 */ }

  const jsonContent = JSON.stringify(data, null, 2);

  return new NextResponse(jsonContent, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="anyi-health-backup-${timestamp}.json"`,
    },
  });
}

async function exportAsSql(): Promise<string> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const parsed = new URL(dbUrl);
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = decodeURIComponent(parsed.pathname.replace('/', ''));

  const schema = 'public';

  const cmd =
    `pg_dump --host="${host}" --port="${port}" --username="${user}" ` +
    `--dbname="${database}" --schema="${schema}" ` +
    `--no-owner --no-privileges --column-inserts`;

  const { stdout } = await execAsync(cmd, {
    env: { ...process.env, PGPASSWORD: password },
    maxBuffer: 50 * 1024 * 1024, // 50MB
  });

  return stdout;
}
