'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen,
  Bot,
  CalendarClock,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Lightbulb,
  MessageCircleQuestion,
  MessageSquare,
  ScrollText,
  Store,
  User,
  Users,
} from '@/lib/icons';
import { useSiteSettings } from '@/hooks/use-site-settings';

interface TableStat {
  name: string;
  label: string;
  count: number;
}

interface DailyTrend {
  date: string;
  loginCount: number;
  operationCount: number;
  aiAnalysisCount: number;
  chatMessageCount: number;
}

interface StoreStat {
  id: string;
  name: string;
  customerCount: number;
  planCount: number;
  aiAnalysisCount: number;
}

interface Stats {
  totalStores: number;
  totalCustomers: number;
  totalPlans: number;
  activePlans: number;
  tableStats?: TableStat[];
  lastBackupAt: string | null;
  loginLog7d: number;
  operationLog7d: number;
  dailyTrends?: DailyTrend[];
  storeStats?: StoreStat[];
}

type TrendKey = 'loginCount' | 'operationCount' | 'aiAnalysisCount' | 'chatMessageCount';

const iconMap: Record<string, React.ElementType> = {
  store: Store,
  customer: Users,
  storeUser: User,
  plan: ClipboardList,
  report: FileText,
  aiAnalysis: Bot,
  scriptRecord: ScrollText,
  topic: Lightbulb,
  knowledgeBase: BookOpen,
  qaItem: MessageCircleQuestion,
  prompt: FileSpreadsheet,
  learningResource: BookOpen,
  menstrualChatSession: MessageSquare,
  menstrualChatMessage: MessageSquare,
  loginLog: History,
  operationLog: ClipboardList,
};

const categoryGroups = [
  {
    name: '客户服务',
    icon: Users,
    items: ['customer', 'report', 'plan'],
  },
  {
    name: 'AI功能',
    icon: Bot,
    items: ['aiAnalysis', 'scriptRecord', 'topic'],
  },
  {
    name: '知识管理',
    icon: BookOpen,
    items: ['knowledgeBase', 'qaItem', 'prompt'],
  },
  {
    name: '月经助手',
    icon: MessageSquare,
    items: ['menstrualChatSession', 'menstrualChatMessage'],
  },
  {
    name: '学习中心',
    icon: BookOpen,
    items: ['learningResource'],
  },
];

const trendRows: Array<{
  title: string;
  icon: React.ElementType;
  key: TrendKey;
  totalKey?: 'loginLog7d' | 'operationLog7d';
}> = [
  { title: '登录次数', icon: Globe, key: 'loginCount', totalKey: 'loginLog7d' },
  { title: '操作次数', icon: Activity, key: 'operationCount', totalKey: 'operationLog7d' },
  { title: 'AI分析次数', icon: Bot, key: 'aiAnalysisCount' },
  { title: '聊天消息', icon: MessageSquare, key: 'chatMessageCount' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'sql' | 'json'>('sql');
  const { themeColor } = useSiteSettings();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/backup/export?format=${exportFormat}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '导出失败');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `anyi-health-backup.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      loadStats();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const tableStats = stats?.tableStats ?? [];
  const dailyTrends = stats?.dailyTrends ?? [];
  const storeStats = stats?.storeStats ?? [];
  const tint = (amount: number) => `color-mix(in srgb, ${themeColor} ${amount}%, white)`;
  const statByName = (name: string) => tableStats.find((item) => item.name === name);
  const maxValue = (key: TrendKey) => Math.max(...dailyTrends.map((item) => item[key]), 1);

  const coreStats = [
    { title: '门店总数', value: loading ? '-' : stats?.totalStores ?? 0, icon: Store },
    { title: '客户总数', value: loading ? '-' : stats?.totalCustomers ?? 0, icon: Users },
    { title: '方案总数', value: loading ? '-' : stats?.totalPlans ?? 0, icon: ClipboardList },
    { title: '进行中方案', value: loading ? '-' : stats?.activePlans ?? 0, icon: ScrollText },
  ];

  const renderMiniTrend = (key: TrendKey) => (
    <div className="mt-3 flex h-5 items-end gap-2 border-b border-gray-200">
      {dailyTrends.map((trend) => (
        <div
          key={`${key}-${trend.date}`}
          className="flex-1 rounded-t-sm bg-gray-200"
          style={{
            height: `${Math.max((trend[key] / maxValue(key)) * 18, trend[key] > 0 ? 4 : 2)}px`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start gap-4">
        <div>
          <h2 className="text-[26px] font-semibold leading-tight text-gray-950">管理员首页</h2>
          <p className="mt-1 text-sm text-gray-500">欢迎使用产后健康管理系统</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {coreStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="rounded-lg border border-gray-100 bg-white py-0 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-0"
            >
              <CardContent className="flex min-h-[96px] items-center justify-between px-5">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <div className="mt-2 text-3xl font-bold leading-none" style={{ color: themeColor }}>
                    {stat.value}
                  </div>
                </div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: tint(14), color: themeColor }}
                >
                  <Icon className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_308px]">
        <div className="space-y-6">
          <Card className="rounded-lg border border-gray-100 bg-white py-0 shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-0">
            <CardHeader className="px-6 pb-0 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-950">
                <BarChart3 className="h-5 w-5" style={{ color: themeColor }} />
                7日数据趋势
              </CardTitle>
              <CardDescription className="pt-3 text-sm text-gray-500">
                登录、操作、AI分析、聊天消息的每日统计
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-7 pt-7">
              {loading || !stats ? (
                <div className="flex h-[360px] items-end gap-2">
                  {[16, 24, 18, 34, 22, 44, 68].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-sm bg-gray-100" style={{ height }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-7">
                  {trendRows.map((row, rowIndex) => {
                    const Icon = row.icon;
                    const max = maxValue(row.key);
                    const total = row.totalKey ? stats[row.totalKey] : undefined;
                    const isPrimary = rowIndex === 0;

                    return (
                      <div key={row.key}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Icon className="h-4 w-4" style={{ color: isPrimary ? themeColor : '#4b5563' }} />
                            {row.title}
                          </div>
                          {total !== undefined && (
                            <div
                              className="rounded px-3 py-1 text-xs font-medium text-white"
                              style={{ backgroundColor: themeColor }}
                            >
                              7日总计: {total}
                            </div>
                          )}
                        </div>

                        {isPrimary ? (
                          <div className="mt-6">
                            <div className="flex h-[132px] items-end gap-1 border-b border-gray-200">
                              {dailyTrends.map((trend) => {
                                const percent = (trend[row.key] / max) * 100;
                                return (
                                  <div key={trend.date} className="flex min-w-0 flex-1 flex-col items-center">
                                    <span className="mb-2 text-xs text-gray-500">{trend.date}</span>
                                    <div
                                      className="w-full max-w-[82px] rounded-t-sm transition-all duration-500"
                                      style={{
                                        backgroundColor: trend[row.key] > 0 ? themeColor : '#e5e7eb',
                                        height: `${Math.max(percent, trend[row.key] > 0 ? 10 : 3)}px`,
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="grid grid-cols-7 pt-2 text-center text-xs font-semibold text-gray-900">
                              {dailyTrends.map((trend) => (
                                <span key={`value-${trend.date}`}>{trend[row.key]}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-[1fr_auto]">
                            <div>
                              {renderMiniTrend(row.key)}
                              <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                                <span>{dailyTrends[0]?.date}</span>
                                <span>{dailyTrends.at(-1)?.date}</span>
                              </div>
                            </div>
                            <div className="min-w-24 text-right text-sm font-semibold" style={{ color: themeColor }}>
                              {dailyTrends.reduce((sum, item) => sum + item[row.key], 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-gray-100 bg-white py-0 shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-0">
            <CardHeader className="px-6 pb-0 pt-6">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-950">
                <TrendingUp className="h-4 w-4" style={{ color: themeColor }} />
                门店活跃度排行
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">按客户数量排序</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-7 pt-5">
              {loading ? (
                <div className="space-y-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-gray-100" />
                      <div className="h-5 w-32 rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : storeStats.length > 0 ? (
                <div className="space-y-5">
                  {storeStats.map((store, index) => {
                    const rankColor = index === 0 ? themeColor : index < 3 ? '#5f8077' : '#e8eceb';
                    return (
                      <div key={store.id} className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                            style={{
                              backgroundColor: rankColor,
                              color: index < 3 ? '#fff' : '#65716e',
                            }}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-950">{store.name}</div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
                              <span>客户: {store.customerCount}</span>
                              <span>方案: {store.planCount}</span>
                              <span>AI: {store.aiAnalysisCount}</span>
                            </div>
                          </div>
                        </div>
                        <span className="hidden text-xs text-gray-600 sm:block">
                          {store.customerCount > 0 ? '活跃中' : '需关注'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-gray-400">暂无门店数据</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {categoryGroups.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.name}
                className="rounded-lg border border-gray-100 bg-white py-0 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-0"
              >
                <CardHeader className="px-5 pb-0 pt-5">
                  <CardTitle className="flex items-center gap-2 border-b border-gray-200 pb-3 text-base font-medium text-gray-950">
                    <Icon className="h-4 w-4" style={{ color: themeColor }} />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 py-5">
                  {category.items.map((itemName) => {
                    const ItemIcon = iconMap[itemName] || Activity;
                    const stat = statByName(itemName);
                    return (
                      <div key={itemName} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                          <ItemIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                          <span className="truncate">{stat?.label || itemName}</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums text-gray-950" style={{ color: themeColor }}>
                          {loading ? '-' : stat?.count?.toLocaleString() ?? 0}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="rounded-lg border border-gray-100 bg-white py-0 shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-0">
        <CardHeader className="px-6 pb-0 pt-6">
          <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-950">
            <Download className="h-5 w-5" style={{ color: themeColor }} />
            数据备份
          </CardTitle>
          <CardDescription className="pt-3 text-sm text-gray-500">导出完整数据库备份</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 px-6 pb-7 pt-5 lg:grid-cols-[minmax(0,440px)_1fr]">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-5">
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-4 w-4 text-gray-500" />
                <span>上次备份：</span>
                <span className="font-medium text-gray-950">
                  {loading
                    ? '-'
                    : stats?.lastBackupAt
                      ? new Date(stats.lastBackupAt).toLocaleString('zh-CN', { hour12: false })
                      : '暂无记录'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-gray-500" />
                <span>7天操作日志：</span>
                <span className="font-semibold" style={{ color: themeColor }}>
                  {loading ? '-' : stats?.operationLog7d?.toLocaleString() ?? 0} 条
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-gray-500" />
                <span>7天登录：</span>
                <span className="font-semibold" style={{ color: themeColor }}>
                  {loading ? '-' : stats?.loginLog7d?.toLocaleString() ?? 0} 次
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setExportFormat('sql')}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
                  exportFormat === 'sql' ? 'border-transparent text-white shadow-lg' : 'border-gray-300 bg-white text-gray-900'
                }`}
                style={exportFormat === 'sql' ? { backgroundColor: themeColor } : {}}
              >
                <Database className="h-5 w-5" />
                SQL
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
                  exportFormat === 'json' ? 'border-transparent text-white shadow-lg' : 'border-gray-300 bg-white text-gray-900'
                }`}
                style={exportFormat === 'json' ? { backgroundColor: themeColor } : {}}
              >
                <FileSpreadsheet className="h-5 w-5" />
                JSON
              </button>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="h-13 w-full rounded-lg text-sm font-semibold shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? '导出中...' : `导出 ${exportFormat.toUpperCase()} 备份`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
