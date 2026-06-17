'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard,
  Store,
  Users,
  BookOpen,
  Settings,
  ScrollText,
} from '@/lib/icons';

const navigation = [
  { name: '首页', href: '/admin', icon: LayoutDashboard },
  { name: '门店管理', href: '/admin/stores', icon: Store },
  { name: '客户管理', href: '/admin/customers', icon: Users },
  { name: '方案记录', href: '/admin/plan-records', icon: ScrollText },
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
        <nav className="flex-1 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              let isActive = false;
              if (item.href === '/admin') {
                // 首页：只有路径等于 /admin 或 /admin/ 时才算激活
                isActive = pathname === '/admin' || pathname === '/admin/';
              } else {
                // 其他页面：路径匹配或以该路径开头才算激活
                isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              }
              return (
                <Link key={item.name} href={item.href}>
                  <span className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
                          fontWeight: isActive ? 500 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                          }
                        }}
                  >
                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
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
