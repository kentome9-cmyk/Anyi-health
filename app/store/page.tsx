'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, BrainCircuit, MessageCircleQuestion, Sparkles, User, Wand2, Library, Heart, BookOpen, Briefcase, CalendarClock, Rocket, Zap } from '@/lib/icons';
import { hasPermission, type StorePermissionKey } from '@/lib/store-permissions';

interface StoreStats {
  totalCustomers: number;
  totalPlans: number;
  activePlans: number;
  totalChatSessions: number;
  totalChatMessages: number;
  totalScriptRecords: number;
  totalTopics: number;
}

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  permission?: StorePermissionKey;
}

interface FunctionModule {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permission?: StorePermissionKey;
  items: {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: StorePermissionKey;
  }[];
}

export default function StoreDashboard() {
  const router = useRouter();
  const { userName, storeId, permissions } = useAuthStore();
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/store/stats', {
        headers: { 'x-store-id': storeId || '' },
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    { 
      title: '客户总数', 
      value: loading ? '-' : stats?.totalCustomers ?? 0, 
      icon: Users, 
      href: '/store/customers', 
      permission: 'customer_manage'
    },
    { 
      title: '方案总数', 
      value: loading ? '-' : stats?.totalPlans ?? 0, 
      icon: FileText, 
      href: '/store/ai-analysis', 
      permission: 'ai_analysis'
    },
    { 
      title: '进行中方案', 
      value: loading ? '-' : stats?.activePlans ?? 0, 
      icon: Zap, 
      href: '/store/ai-analysis', 
      permission: 'ai_analysis'
    },
    { 
      title: '对话会话', 
      value: loading ? '-' : stats?.totalChatSessions ?? 0, 
      icon: MessageCircleQuestion, 
      href: '/store/menstrual-chat', 
      permission: 'menstrual_chat'
    },
    { 
      title: '脚本记录', 
      value: loading ? '-' : stats?.totalScriptRecords ?? 0, 
      icon: Library, 
      href: '/store/ai-scripts', 
      permission: 'short_video'
    },
    { 
      title: '选题数量', 
      value: loading ? '-' : stats?.totalTopics ?? 0, 
      icon: Rocket, 
      href: '/store/ai-topics', 
      permission: 'short_video'
    },
  ];

  const functionModules: FunctionModule[] = [
    {
      title: '方案搭配',
      icon: Briefcase,
      description: 'AI智能生成调理方案',
      permission: 'customer_manage',
      items: [
        {
          title: '客户管理',
          description: '客户档案和服务记录',
          href: '/store/customers',
          icon: Users,
          permission: 'customer_manage'
        },
        {
          title: '在线分析',
          description: 'AI智能分析生成方案',
          href: `/store/report-submit?storeId=${storeId}`,
          icon: BrainCircuit,
          permission: 'ai_analysis'
        },
      ]
    },
    {
      title: '月经助手',
      icon: Heart,
      description: '智能问答和健康咨询',
      permission: 'menstrual_chat',
      items: [
        {
          title: '产品搭配',
          description: '智能推荐产品搭配',
          href: '/store/menstrual-chat',
          icon: MessageCircleQuestion,
          permission: 'menstrual_chat'
        },
        {
          title: '知识问答',
          description: '查询产后健康知识',
          href: '/store/ai-qa',
          icon: BookOpen,
          permission: 'menstrual_chat'
        },
      ]
    },
    {
      title: '短视频助手',
      icon: Sparkles,
      description: 'AI生成短视频内容',
      permission: 'short_video',
      items: [
        {
          title: '创作者身份',
          description: '设定赛道和人设风格',
          href: '/store/ai-identity',
          icon: User,
          permission: 'short_video'
        },
        {
          title: '内容创作',
          description: 'AI生成短视频脚本',
          href: '/store/ai-content',
          icon: Wand2,
          permission: 'short_video'
        },
        {
          title: '脚本库',
          description: '查看和管理脚本',
          href: '/store/ai-scripts',
          icon: Library,
          permission: 'short_video'
        },
      ]
    },
    {
      title: '学习中心',
      icon: BookOpen,
      description: '学习产后健康知识',
      permission: 'learning_center',
      items: [
        {
          title: '学习资源',
          description: '观看学习视频',
          href: '/store/learning-center',
          icon: BookOpen,
          permission: 'learning_center'
        },
      ]
    },
  ];

  const filteredStatCards = statCards.filter(card => !card.permission || hasPermission(permissions, card.permission));
  const filteredModules = functionModules.filter(module => {
    if (!module.permission) return true;
    return hasPermission(permissions, module.permission);
  }).map(module => ({
    ...module,
    items: module.items.filter(item => !item.permission || hasPermission(permissions, item.permission))
  })).filter(module => module.items.length > 0);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 页面标题 */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">门店端首页</h1>
            <p className="text-gray-500 mt-1">欢迎回来，{userName || '门店用户'}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <CalendarClock className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {filteredStatCards.length > 0 && (
        <div className="px-4 md:px-6 pb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#004349]" /> 数据概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {filteredStatCards.map((stat) => (
              <Card 
                key={stat.title} 
                className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
                onClick={() => router.push(stat.href)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="p-2 rounded-lg bg-[rgba(0,67,73,0.05)]">
                    <stat.icon className="h-4 w-4 text-[#004349]" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 功能分类模块 */}
      {filteredModules.length > 0 && (
        <div className="px-4 md:px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredModules.map((module) => (
              <Card key={module.title}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <module.icon className="h-4 w-4 text-[#004349]" />
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {module.items.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => router.push(item.href)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[rgba(0,67,73,0.05)] transition-colors text-left group"
                      >
                        <item.icon className="h-4 w-4 text-gray-400 group-hover:text-[#004349] transition-colors" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 无权限提示 */}
      {filteredStatCards.length === 0 && filteredModules.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可用功能</h3>
            <p className="text-gray-500">请联系管理员开通相关权限</p>
          </div>
        </div>
      )}
    </div>
  );
}