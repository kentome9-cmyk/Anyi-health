import fs from 'fs/promises';
import path from 'path';

export type DemoTrendTotals = {
  loginCount: number;
  operationCount: number;
  aiAnalysisCount: number;
  chatMessageCount: number;
};

export type DemoDashboardConfig = {
  totalStores: number;
  totalCustomers: number;
  totalPlans: number;
  activePlans: number;
  reports: number;
  aiAnalyses: number;
  scriptRecords: number;
  topics: number;
  knowledgeBase: number;
  qaItems: number;
  prompts: number;
  learningResources: number;
  chatSessions: number;
  chatMessages: number;
  trendTotals: DemoTrendTotals;
};

export const DEFAULT_DEMO_DASHBOARD_CONFIG: DemoDashboardConfig = {
  totalStores: 58,
  totalCustomers: 12860,
  totalPlans: 9360,
  activePlans: 2140,
  reports: 11280,
  aiAnalyses: 5280,
  scriptRecords: 1860,
  topics: 960,
  knowledgeBase: 320,
  qaItems: 680,
  prompts: 48,
  learningResources: 120,
  chatSessions: 2480,
  chatMessages: 18600,
  trendTotals: {
    loginCount: 1240,
    operationCount: 6800,
    aiAnalysisCount: 1850,
    chatMessageCount: 9200,
  },
};

const DEMO_DATA_DIR = process.env.DEMO_DATA_DIR || path.join(process.cwd(), 'scripts', 'demo-data');
const CONFIG_FILE = path.join(DEMO_DATA_DIR, 'dashboard-config.json');

function finiteCount(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), 99999999);
}

export function normalizeDemoDashboardConfig(input: Partial<DemoDashboardConfig> = {}): DemoDashboardConfig {
  const trendTotals: Partial<DemoTrendTotals> = input.trendTotals || {};

  return {
    totalStores: finiteCount(input.totalStores, DEFAULT_DEMO_DASHBOARD_CONFIG.totalStores),
    totalCustomers: finiteCount(input.totalCustomers, DEFAULT_DEMO_DASHBOARD_CONFIG.totalCustomers),
    totalPlans: finiteCount(input.totalPlans, DEFAULT_DEMO_DASHBOARD_CONFIG.totalPlans),
    activePlans: finiteCount(input.activePlans, DEFAULT_DEMO_DASHBOARD_CONFIG.activePlans),
    reports: finiteCount(input.reports, DEFAULT_DEMO_DASHBOARD_CONFIG.reports),
    aiAnalyses: finiteCount(input.aiAnalyses, DEFAULT_DEMO_DASHBOARD_CONFIG.aiAnalyses),
    scriptRecords: finiteCount(input.scriptRecords, DEFAULT_DEMO_DASHBOARD_CONFIG.scriptRecords),
    topics: finiteCount(input.topics, DEFAULT_DEMO_DASHBOARD_CONFIG.topics),
    knowledgeBase: finiteCount(input.knowledgeBase, DEFAULT_DEMO_DASHBOARD_CONFIG.knowledgeBase),
    qaItems: finiteCount(input.qaItems, DEFAULT_DEMO_DASHBOARD_CONFIG.qaItems),
    prompts: finiteCount(input.prompts, DEFAULT_DEMO_DASHBOARD_CONFIG.prompts),
    learningResources: finiteCount(input.learningResources, DEFAULT_DEMO_DASHBOARD_CONFIG.learningResources),
    chatSessions: finiteCount(input.chatSessions, DEFAULT_DEMO_DASHBOARD_CONFIG.chatSessions),
    chatMessages: finiteCount(input.chatMessages, DEFAULT_DEMO_DASHBOARD_CONFIG.chatMessages),
    trendTotals: {
      loginCount: finiteCount(trendTotals.loginCount, DEFAULT_DEMO_DASHBOARD_CONFIG.trendTotals.loginCount),
      operationCount: finiteCount(trendTotals.operationCount, DEFAULT_DEMO_DASHBOARD_CONFIG.trendTotals.operationCount),
      aiAnalysisCount: finiteCount(trendTotals.aiAnalysisCount, DEFAULT_DEMO_DASHBOARD_CONFIG.trendTotals.aiAnalysisCount),
      chatMessageCount: finiteCount(trendTotals.chatMessageCount, DEFAULT_DEMO_DASHBOARD_CONFIG.trendTotals.chatMessageCount),
    },
  };
}

export async function readDemoDashboardConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return normalizeDemoDashboardConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_DEMO_DASHBOARD_CONFIG;
  }
}

export async function writeDemoDashboardConfig(config: DemoDashboardConfig) {
  await fs.mkdir(DEMO_DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(normalizeDemoDashboardConfig(config), null, 2)}\n`, 'utf8');
}

function spreadSevenDays(total: number) {
  const weights = [0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.22];
  const values = weights.map((weight) => Math.floor(total * weight));
  let remainder = total - values.reduce((sum, value) => sum + value, 0);
  for (let i = values.length - 1; i >= 0 && remainder > 0; i--) {
    values[i]++;
    remainder--;
  }
  return values;
}

export function buildDemoDashboardStats(config: DemoDashboardConfig) {
  const login = spreadSevenDays(config.trendTotals.loginCount);
  const operation = spreadSevenDays(config.trendTotals.operationCount);
  const ai = spreadSevenDays(config.trendTotals.aiAnalysisCount);
  const chat = spreadSevenDays(config.trendTotals.chatMessageCount);

  const dailyTrends = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      loginCount: login[index],
      operationCount: operation[index],
      aiAnalysisCount: ai[index],
      chatMessageCount: chat[index],
    };
  });

  const storeStats = Array.from({ length: Math.min(config.totalStores, 5) }, (_, index) => ({
    id: `demo-dashboard-store-${index + 1}`,
    name: ['上海静安演示店', '杭州西湖演示店', '深圳南山演示店', '成都高新演示店', '南京鼓楼演示店'][index],
    customerCount: Math.max(Math.floor(config.totalCustomers * [0.18, 0.15, 0.13, 0.11, 0.09][index]), 0),
    planCount: Math.max(Math.floor(config.totalPlans * [0.17, 0.14, 0.12, 0.1, 0.08][index]), 0),
    aiAnalysisCount: Math.max(Math.floor(config.aiAnalyses * [0.18, 0.14, 0.12, 0.1, 0.08][index]), 0),
  }));

  return {
    totalStores: config.totalStores,
    totalCustomers: config.totalCustomers,
    totalPlans: config.totalPlans,
    activePlans: config.activePlans,
    tableStats: [
      { name: 'store', label: '门店', count: config.totalStores },
      { name: 'customer', label: '客户', count: config.totalCustomers },
      { name: 'storeUser', label: '门店账号', count: config.totalStores },
      { name: 'plan', label: '调理方案', count: config.totalPlans },
      { name: 'report', label: '客户报告', count: config.reports },
      { name: 'aiAnalysis', label: 'AI分析', count: config.aiAnalyses },
      { name: 'scriptRecord', label: '脚本记录', count: config.scriptRecords },
      { name: 'topic', label: '选题', count: config.topics },
      { name: 'knowledgeBase', label: '知识库', count: config.knowledgeBase },
      { name: 'qaItem', label: '问答库', count: config.qaItems },
      { name: 'prompt', label: '提示词', count: config.prompts },
      { name: 'learningResource', label: '学习资源', count: config.learningResources },
      { name: 'menstrualChatSession', label: '月经会话', count: config.chatSessions },
      { name: 'menstrualChatMessage', label: '月经消息', count: config.chatMessages },
      { name: 'loginLog', label: '登录日志', count: config.trendTotals.loginCount },
      { name: 'operationLog', label: '操作日志', count: config.trendTotals.operationCount },
    ],
    lastBackupAt: null,
    loginLog7d: config.trendTotals.loginCount,
    operationLog7d: config.trendTotals.operationCount,
    dailyTrends,
    storeStats,
  };
}
