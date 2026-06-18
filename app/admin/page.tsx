'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Store, Users, BookOpen, Settings, FileText, ScrollText } from '@/lib/icons';

interface Stats {
  totalStores: number;
  totalCustomers: number;
  totalPlans: number;
  activePlans: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const statCards = [
    { title: '门店总数', value: loading ? '-' : stats?.totalStores ?? 0, icon: Store, href: '/admin/stores', color: 'text-blue-600' },
    { title: '客户总数', value: loading ? '-' : stats?.totalCustomers ?? 0, icon: Users, href: '/admin/customers', color: 'text-green-600' },
    { title: '方案总数', value: loading ? '-' : stats?.totalPlans ?? 0, icon: FileText, href: '/admin/plan-records', color: 'text-purple-600' },
    { title: '进行中方案', value: loading ? '-' : stats?.activePlans ?? 0, icon: ScrollText, href: '/admin/plan-records', color: 'text-orange-600' },
  ];

  const quickActions = [
    { title: '门店管理', description: '添加、编辑、删除门店', href: '/admin/stores', icon: Store },
    { title: '客户管理', description: '查看和管理所有客户', href: '/admin/customers', icon: Users },
    { title: '对话记录', description: '查看AI对话记录', href: '/admin/plan-records', icon: ScrollText },
    { title: '知识库', description: '管理产后健康知识', href: '/admin/knowledge-base', icon: BookOpen },
    { title: 'AI 设置', description: '配置 AI 分析参数', href: '/admin/ai-settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">管理员首页</h2>
        <p className="text-gray-500">欢迎使用产后健康管理系统</p>
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

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>快速访问常用功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
