'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { LayoutDashboard, Users, FileText, ClipboardList } from '@/lib/icons';

const navigation = [
  { name: '首页', href: '/store', icon: LayoutDashboard },
  { name: '客户管理', href: '/store/customers', icon: Users },
  { name: '在线分析', href: '/store/report-submit', icon: ClipboardList },
];

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userName, storeId, logout, isAuthenticated, userType, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (userType !== 'store_user' && userType !== 'admin') {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, userType, router]);

  if (!_hasHydrated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:min-h-screen print:bg-white print:overflow-visible">
      {/* 侧边栏 - 打印时隐藏 */}
      <aside className="w-60 flex flex-col flex-shrink-0 print:hidden" style={{ backgroundColor: '#044332' }}>
        {/* Logo 区域 */}
        <div className="px-5 py-5">
          <h1 className="text-base font-semibold text-white">产后健康管理</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>门店端</p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              let isActive = false;
              if (item.href === '/store') {
                isActive = pathname === '/store' || pathname === '/store/';
              } else {
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
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm"
            style={{ 
              color: 'rgba(255,255,255,0.8)',
              backgroundColor: 'transparent',
            }}
            onClick={logout}
          >
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区 - 打印时全屏显示 */}
      <main className="flex-1 overflow-hidden flex flex-col print:overflow-visible print:w-full print:min-h-screen print:p-0 print:m-0">
        {children}
      </main>
    </div>
  );
}
