'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { SidebarNav } from '@/components/ui/sidebar-nav';
import {
  LayoutDashboard,
  Store,
  Users,
  BookOpen,
  Settings,
  ScrollText,
  Bot,
  FileText,
  MessageSquare,
  Lightbulb,
} from '@/lib/icons';

const navigation = [
  { name: '首页', href: '/admin', icon: LayoutDashboard },
  { name: '门店管理', href: '/admin/stores', icon: Store },
  {
    name: '客户服务',
    icon: Users,
    children: [
      { name: '客户管理', href: '/admin/customers', icon: Users },
      { name: '对话记录', href: '/admin/plan-records', icon: ScrollText },
    ],
  },
  {
    name: 'AI 助手',
    icon: Bot,
    children: [
      { name: '内容生成', href: '/admin/ai-content', icon: FileText },
      { name: '问答管理', href: '/admin/ai-qa', icon: MessageSquare },
      { name: '提示词管理', href: '/admin/prompts', icon: Lightbulb },
    ],
  },
  { name: '知识库', href: '/admin/knowledge-base', icon: BookOpen },
  { name: 'AI 设置', href: '/admin/ai-settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, userType, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login/admin');
      return;
    }
    if (userType !== 'admin') {
      router.push('/login/admin');
    }
  }, [_hasHydrated, isAuthenticated, userType, router]);

  if (!_hasHydrated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className="w-60 flex flex-col" style={{ backgroundColor: '#044332' }}>
        {/* Logo 区域 */}
        <div className="px-5 py-5">
          <h1 className="text-base font-semibold text-white">产后健康管理</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>管理员后台</p>
        </div>
        
        {/* 导航 */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <SidebarNav items={navigation} pathname={pathname} />
        </nav>

        {/* 底部退出 */}
        <div className="p-3 mt-auto">
          <Link href="/login">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sm"
              style={{ 
                color: 'rgba(255,255,255,0.8)',
                backgroundColor: 'transparent',
              }}
            >
              退出登录
            </Button>
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
