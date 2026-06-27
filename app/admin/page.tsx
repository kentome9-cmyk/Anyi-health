'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Store,
  Users,
  BookOpen,
  Settings,
  FileText,
  ScrollText,
  Bot,
  MessageSquare,
  ClipboardList,
  Database,
  Download,
  CalendarClock,
  History,
  FileSpreadsheet,
} from '@/lib/icons';

interface TableStat {
  name: string;
  label: string;
  count: number;
}

interface Stats {
  totalStores: number;
  totalCustomers: number;
  totalPlans: number;
  activePlans: number;
  tableStats: TableStat[];
  lastBackupAt: string | null;
  loginLog7d: number;
  operationLog7d: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'sql' | 'json'>('sql');

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

  const statCards = [
    { title: '门店总数', value: loading ? '-' : stats?.totalStores ?? 0, icon: Store, href: '/admin/stores', color: 'text-blue-600' },
    { title: '客户总数', value: loading ? '-' : stats?.totalCustomers ?? 0, icon: Users, href: '/admin/customers', color: 'text-green-600' },
    { title: '方案总数', value: loading ? '-' : stats?.totalPlans ?? 0, icon: FileText, href: '/admin/plan-records', color: 'text-purple-600' },
    { title: '进行中方案', value: loading ? '-' : stats?.activePlans ?? 0, icon: ScrollText, href: '/admin/plan-records', color: 'text-orange-600' },
  ];

  const quickActions = [
    { title: '门店管理', description: '管理门店信息', href: '/admin/stores', icon: Store },
    { title: '客户管理', description: '查看客户列表', href: '/admin/customers', icon: Users },
    { title: '对话记录', description: '查看AI对话', href: '/admin/plan-records', icon: ScrollText },
    { title: '问答管理', description: '管理问答库', href: '/admin/ai-qa', icon: MessageSquare },
    { title: '提示词管理', description: 'AI提示词配置', href: '/admin/prompts', icon: ClipboardList },
    { title: '知识库', description: '管理知识库', href: '/admin/knowledge-base', icon: BookOpen },
    { title: 'AI 设置', description: 'AI参数配置', href: '/admin/ai-settings', icon: Settings },
    { title: '系统设置', description: '站点主题等配置', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理员首页</h2>
          <p className="text-gray-500">欢迎使用产后健康管理系统</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 系统信息 + 数据备份 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 系统信息 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              数据库概览
            </CardTitle>
            <CardDescription>各表数据量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-400">加载中...</div>
                      <div className="text-lg font-bold text-gray-200 mt-1">-</div>
                    </div>
                  ))
                : (stats?.tableStats || []).slice(0, 8).map((t) => (
                    <div key={t.name} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">{t.label}</div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {t.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        {/* 数据备份 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              数据备份
            </CardTitle>
            <CardDescription>导出完整数据库备份</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">上次备份：</span>
                <span className="text-gray-700 font-medium">
                  {loading
                    ? '-'
                    : stats?.lastBackupAt
                      ? new Date(stats.lastBackupAt).toLocaleString('zh-CN', { hour12: false })
                      : '暂无记录'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">7 天操作日志：</span>
                <span className="text-gray-700 font-medium">
                  {loading ? '-' : stats?.operationLog7d?.toLocaleString() ?? 0} 条
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-500">导出格式</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('sql')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                    exportFormat === 'sql'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-1" />
                  SQL
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                    exportFormat === 'json'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                  JSON
                </button>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? '导出中...' : `导出 ${exportFormat.toUpperCase()} 备份`}
            </Button>

            <p className="text-xs text-gray-400">
              {exportFormat === 'sql'
                ? 'SQL 格式可直接导入 PostgreSQL 恢复（需 pg_dump 可用）'
                : 'JSON 格式兼容性好，所有表数据以 JSON 导出'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>快速访问常用功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                    <action.icon className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
