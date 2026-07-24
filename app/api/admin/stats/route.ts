import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, applyDemoStoreListFilter, getAdminVisibleStoreWhere, isDemoAdmin, requireAdmin } from '@/lib/auth';
import { buildDemoDashboardStats, readDemoDashboardConfig } from '@/lib/demo-dashboard';

const TABLE_STATS_DEF = [
  { key: 'store', label: '门店' },
  { key: 'customer', label: '客户' },
  { key: 'storeUser', label: '门店账号' },
  { key: 'plan', label: '调理方案' },
  { key: 'report', label: '客户报告' },
  { key: 'aiAnalysis', label: 'AI分析' },
  { key: 'scriptRecord', label: '脚本记录' },
  { key: 'topic', label: '选题' },
  { key: 'knowledgeBase', label: '知识库' },
  { key: 'qaItem', label: '问答库' },
  { key: 'prompt', label: '提示词' },
  { key: 'learningResource', label: '学习资源' },
  { key: 'menstrualChatSession', label: '月经会话' },
  { key: 'menstrualChatMessage', label: '月经消息' },
  { key: 'loginLog', label: '登录日志' },
  { key: 'operationLog', label: '操作日志' },
];

interface DailyTrend {
  date: string;
  loginCount: number;
  operationCount: number;
  aiAnalysisCount: number;
  chatMessageCount: number;
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const demoMode = isDemoAdmin(session);
    if (demoMode) {
      return NextResponse.json(buildDemoDashboardStats(await readDemoDashboardConfig()));
    }

    const storeWhere = getAdminVisibleStoreWhere(session);
    const storeLinkedWhere = <T extends Record<string, unknown> & { store?: object }>(where: T = {} as T) =>
      applyDemoStoreFilter(where, session);
    const hiddenDemoUserIds = demoMode ? [] : await getDemoPrincipalIds();
    const loginLogWhere = (createdAt?: object) => demoMode
      ? { userId: session.userId, userAgent: 'Demo Seed', ...(createdAt ? { createdAt } : {}) }
      : {
          ...(createdAt ? { createdAt } : {}),
          NOT: [
            { userId: { in: hiddenDemoUserIds } },
            { userName: { startsWith: 'demo_' } },
          ],
        };
    const operationLogWhere = (createdAt?: object) => demoMode
      ? { operatorId: session.userId, ...(createdAt ? { createdAt } : {}) }
      : {
          ...(createdAt ? { createdAt } : {}),
          NOT: [
            { operatorId: { in: hiddenDemoUserIds } },
            { operatorName: { startsWith: 'demo_' } },
            { detail: { contains: 'DEMO_INVESTOR_V1' } },
          ],
        };
    const [
      totalStores,
      totalCustomers,
      totalPlans,
      activePlans,
      lastBackupLog,
      loginLog7d,
      operationLog7d,
    ] = await Promise.all([
      prisma.store.count({ where: applyDemoStoreListFilter({}, session) }),
      prisma.customer.count({ where: storeLinkedWhere() }),
      prisma.plan.count({ where: storeLinkedWhere() }),
      prisma.plan.count({ where: storeLinkedWhere({ status: 'active' }) }),
      prisma.operationLog.findFirst({
        where: demoMode
          ? { operatorId: session.userId }
          : { module: 'database', action: 'export' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.loginLog.count({
        where: loginLogWhere({ gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
      }),
      prisma.operationLog.count({
        where: operationLogWhere({ gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
      }),
    ]);

    const tableCounts = await Promise.all(
      TABLE_STATS_DEF.map(async (def) => {
        try {
          const count = await getTableCount(def.key, session);
          return { name: def.key, label: def.label, count };
        } catch {
          return { name: def.key, label: def.label, count: 0 };
        }
      })
    );

    const dailyTrends: DailyTrend[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const [loginCount, operationCount, aiAnalysisCount, chatMessageCount] = await Promise.all([
        prisma.loginLog.count({
          where: loginLogWhere({ gte: startOfDay, lt: endOfDay }),
        }),
        prisma.operationLog.count({
          where: operationLogWhere({ gte: startOfDay, lt: endOfDay }),
        }),
        prisma.aiAnalysis.count({
          where: storeLinkedWhere({ createdAt: { gte: startOfDay, lt: endOfDay } }),
        }),
        prisma.menstrualChatMessage.count({
          where: demoMode
            ? { createdAt: { gte: startOfDay, lt: endOfDay }, session: { store: storeWhere } }
            : { createdAt: { gte: startOfDay, lt: endOfDay }, session: { store: storeWhere } },
        }),
      ]);

      dailyTrends.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        loginCount,
        operationCount,
        aiAnalysisCount,
        chatMessageCount,
      });
    }

    const stores = await prisma.store.findMany({
      where: storeWhere,
      select: { id: true, storeName: true },
      take: 5,
    });

    const storeStats = await Promise.all(
      stores.map(async (store) => ({
        id: store.id,
        name: store.storeName,
        customerCount: await prisma.customer.count({ where: { storeId: store.id } }),
        planCount: await prisma.plan.count({ where: { storeId: store.id } }),
        aiAnalysisCount: await prisma.aiAnalysis.count({ where: { storeId: store.id } }),
      }))
    ).then((items) => items.sort((a, b) => b.customerCount - a.customerCount));

    return NextResponse.json({
      totalStores,
      totalCustomers,
      totalPlans,
      activePlans,
      tableStats: tableCounts,
      lastBackupAt: lastBackupLog?.createdAt?.toISOString() ?? null,
      loginLog7d: loginLog7d,
      operationLog7d: operationLog7d,
      dailyTrends,
      storeStats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}

async function getTableCount(key: string, session: Awaited<ReturnType<typeof requireAdmin>>) {
  const demoMode = isDemoAdmin(session);
  const storeWhere = getAdminVisibleStoreWhere(session);

  switch (key) {
    case 'store':
      return prisma.store.count({ where: applyDemoStoreListFilter({}, session) });
    case 'customer':
      return prisma.customer.count({ where: applyDemoStoreFilter({}, session) });
    case 'plan':
      return prisma.plan.count({ where: applyDemoStoreFilter({}, session) });
    case 'report':
      return prisma.report.count({ where: applyDemoStoreFilter({}, session) });
    case 'aiAnalysis':
      return prisma.aiAnalysis.count({ where: applyDemoStoreFilter({}, session) });
    case 'scriptRecord':
      return prisma.scriptRecord.count({ where: applyDemoStoreFilter({}, session) });
    case 'topic':
      return prisma.topic.count({ where: applyDemoStoreFilter({}, session) });
    case 'menstrualChatSession':
      return prisma.menstrualChatSession.count({ where: applyDemoStoreFilter({}, session) });
    case 'menstrualChatMessage':
      return prisma.menstrualChatMessage.count({
        where: { session: { store: storeWhere } },
      });
    case 'loginLog': {
      if (demoMode) {
        return prisma.loginLog.count({ where: { userId: session.userId, userAgent: 'Demo Seed' } });
      }
      const hiddenDemoUserIds = await getDemoPrincipalIds();
      return prisma.loginLog.count({
        where: {
          NOT: [
            { userId: { in: hiddenDemoUserIds } },
            { userName: { startsWith: 'demo_' } },
          ],
        },
      });
    }
    case 'operationLog': {
      if (demoMode) {
        return prisma.operationLog.count({ where: { operatorId: session.userId } });
      }
      const hiddenDemoUserIds = await getDemoPrincipalIds();
      return prisma.operationLog.count({
        where: {
          NOT: [
            { operatorId: { in: hiddenDemoUserIds } },
            { operatorName: { startsWith: 'demo_' } },
            { detail: { contains: 'DEMO_INVESTOR_V1' } },
          ],
        },
      });
    }
    default: {
      const model = (prisma as unknown as Record<string, { count: () => Promise<number> }>)[key];
      return model && !demoMode ? model.count() : 0;
    }
  }
}

async function getDemoPrincipalIds() {
  const [demoAdmins, demoStoreUsers] = await Promise.all([
    prisma.admin.findMany({ where: { isDemo: true }, select: { id: true } }),
    prisma.storeUser.findMany({ where: { isDemo: true }, select: { id: true } }),
  ]);
  return [...demoAdmins, ...demoStoreUsers].map((item) => item.id);
}
