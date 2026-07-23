import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function GET() {
  try {
    const [
      totalStores,
      totalCustomers,
      totalPlans,
      activePlans,
      lastBackupLog,
      loginLog7d,
      operationLog7d,
    ] = await Promise.all([
      prisma.store.count(),
      prisma.customer.count(),
      prisma.plan.count(),
      prisma.plan.count({ where: { status: 'active' } }),
      prisma.operationLog.findFirst({
        where: { module: 'database', action: 'export' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.loginLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.operationLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const tableCounts = await Promise.all(
      TABLE_STATS_DEF.map(async (def) => {
        try {
          const model = (prisma as unknown as Record<string, { count: () => Promise<number> }>)[def.key];
          const count = model ? await model.count() : 0;
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
          where: { createdAt: { gte: startOfDay, lt: endOfDay } },
        }),
        prisma.operationLog.count({
          where: { createdAt: { gte: startOfDay, lt: endOfDay } },
        }),
        prisma.aiAnalysis.count({
          where: { createdAt: { gte: startOfDay, lt: endOfDay } },
        }),
        prisma.menstrualChatMessage.count({
          where: { createdAt: { gte: startOfDay, lt: endOfDay } },
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
