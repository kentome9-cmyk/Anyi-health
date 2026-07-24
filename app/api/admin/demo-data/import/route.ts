import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { assertWritableAdmin, handleAuthError, requireAdmin } from '@/lib/auth';
import { normalizeDemoDashboardConfig, writeDemoDashboardConfig } from '@/lib/demo-dashboard';
import { seedDemoData } from '../../../../../scripts/seed-demo-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_COUNT = 99999999;
const DEMO_DATA_DIR = path.join(process.cwd(), 'scripts', 'demo-data');
const DEMO_FILES = ['stores.csv', 'customers.csv', 'service-records.csv', 'video-scripts.csv'] as const;
const REQUIRED_HEADERS: Record<(typeof DEMO_FILES)[number], string[][]> = {
  'stores.csv': [['门店编号', 'store_key'], ['门店名称', 'store_name']],
  'customers.csv': [['客户编号', 'customer_key'], ['门店编号', 'store_key']],
  'service-records.csv': [['客户编号', 'customer_key'], ['客户报告', 'report_content']],
  'video-scripts.csv': [['门店编号', 'store_key'], ['短视频选题', 'video_topic']],
};

function replacementCount(value: string) {
  return (value.match(/\uFFFD/g) || []).length;
}

function decodeCsvContent(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');
  const gbk = new TextDecoder('gb18030', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');

  if (replacementCount(utf8) > replacementCount(gbk)) {
    return gbk;
  }

  return utf8;
}

function validateCsvHeaders(fileName: (typeof DEMO_FILES)[number], content: string) {
  const headerLine = content.split(/\r?\n/)[0] || '';
  const missing = REQUIRED_HEADERS[fileName].filter((group) => !group.some((header) => headerLine.includes(header)));

  if (missing.length > 0) {
    return `${fileName} 表头无法识别，请使用中文模板表头，或上传原始 CSV 文件。常见原因是 Excel 另存为 ANSI/GBK 后旧接口已保存成乱码，需要重新上传原文件。`;
  }

  return null;
}

function formCount(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.min(Math.floor(value), MAX_COUNT);
}

function dashboardConfigFromForm(formData: FormData) {
  return normalizeDemoDashboardConfig({
    totalStores: formCount(formData, 'totalStores', 58),
    totalCustomers: formCount(formData, 'totalCustomers', 12860),
    totalPlans: formCount(formData, 'totalPlans', 9360),
    activePlans: formCount(formData, 'activePlans', 2140),
    reports: formCount(formData, 'reports', 11280),
    aiAnalyses: formCount(formData, 'aiAnalyses', 5280),
    scriptRecords: formCount(formData, 'scriptRecords', 1860),
    topics: formCount(formData, 'topics', 960),
    knowledgeBase: formCount(formData, 'knowledgeBase', 320),
    qaItems: formCount(formData, 'qaItems', 680),
    prompts: formCount(formData, 'prompts', 48),
    learningResources: formCount(formData, 'learningResources', 120),
    chatSessions: formCount(formData, 'chatSessions', 2480),
    chatMessages: formCount(formData, 'chatMessages', 18600),
    trendTotals: {
      loginCount: formCount(formData, 'loginCount', 1240),
      operationCount: formCount(formData, 'operationCount', 6800),
      aiAnalysisCount: formCount(formData, 'aiAnalysisCount', 1850),
      chatMessageCount: formCount(formData, 'chatMessageCount', 9200),
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);

    const formData = await request.formData();
    const dashboardOnly = formData.get('dashboardOnly') === '1';
    const dashboardConfig = dashboardConfigFromForm(formData);
    await writeDemoDashboardConfig(dashboardConfig);
    await fs.mkdir(DEMO_DATA_DIR, { recursive: true });

    const savedFiles: string[] = [];
    for (const fileName of DEMO_FILES) {
      const file = formData.get(fileName) as File | null;
      if (!file) {
        continue;
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        return NextResponse.json({ error: `${fileName} 仅支持 CSV 文件` }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${fileName} 不能超过 5MB` }, { status: 400 });
      }

      const content = decodeCsvContent(await file.arrayBuffer());
      if (!content.trim()) {
        return NextResponse.json({ error: `${fileName} 内容为空` }, { status: 400 });
      }

      const headerError = validateCsvHeaders(fileName, content);
      if (headerError) {
        return NextResponse.json({ error: headerError }, { status: 400 });
      }

      await fs.writeFile(path.join(DEMO_DATA_DIR, fileName), content, 'utf8');
      savedFiles.push(`scripts/demo-data/${fileName}`);
    }

    if (savedFiles.length === 0 && !dashboardOnly) {
      return NextResponse.json({ error: '请至少上传一张 CSV 表，或使用保存首页模拟数据按钮' }, { status: 400 });
    }

    const totals = dashboardOnly ? null : await seedDemoData({ generateMissing: false, createLogs: false });

    return NextResponse.json({
      success: true,
      message: dashboardOnly
        ? '首页模拟数据已保存'
        : `已导入 ${savedFiles.length} 张表，并按已上传 CSV 刷新演示数据`,
      files: savedFiles,
      dashboard: dashboardConfig,
      totals,
    });
  } catch (error) {
    console.error('[admin/demo-data/import] error:', error);
    return handleAuthError(error);
  }
}
