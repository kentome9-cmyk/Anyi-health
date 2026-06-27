'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { SidebarNav } from '@/components/ui/sidebar-nav';
import { LayoutDashboard, Users, ClipboardList, Sparkles, BookOpen, Briefcase, User, Wand2, Library, LogOut, Home, MessageCircleQuestion, Clapperboard, Lightbulb, Heart, Settings } from '@/lib/icons';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { hasPermission, type StorePermissionKey } from '@/lib/store-permissions';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: StorePermissionKey;
  children?: NavItem[];
}

const allSidebarNav: NavItem[] = [
  { name: '首页', href: '/store', icon: LayoutDashboard },
  { name: '学习中心', href: '/store/learning-center', icon: BookOpen, permission: 'learning_center' },
  {
    name: '项目搭配',
    icon: Briefcase,
    children: [
      { name: '客户管理', href: '/store/customers', icon: Users, permission: 'customer_manage' },
      { name: '在线分析', href: '/store/report-submit', icon: ClipboardList, permission: 'ai_analysis' },
    ],
  },
  {
    name: '月经助手',
    icon: Heart,
    permission: 'menstrual_chat',
    children: [
      { name: '产品搭配', href: '/store/menstrual-chat', icon: MessageCircleQuestion, permission: 'menstrual_chat' },
      { name: '问答查询', href: '/store/ai-qa', icon: BookOpen, permission: 'menstrual_chat' },
    ],
  },
  {
    name: '短视频助手',
    icon: Sparkles,
    permission: 'short_video',
    children: [
      { name: '创作者身份', href: '/store/ai-identity', icon: User, permission: 'short_video' },
      { name: '选题策划', href: '/store/ai-topics', icon: Lightbulb, permission: 'short_video' },
      { name: '选题库', href: '/store/ai-topic-library', icon: BookOpen, permission: 'short_video' },
      { name: '内容创作', href: '/store/ai-content', icon: Wand2, permission: 'short_video' },
      { name: '脚本库', href: '/store/ai-scripts', icon: Library, permission: 'short_video' },
    ],
  },
  { name: '个人资料', href: '/store/profile', icon: Settings, permission: 'profile' },
];

const tabBarItems: NavItem[] = [
  { name: '首页', href: '/store', icon: Home },
  { name: '方案', href: '/store/customers', icon: Briefcase, permission: 'customer_manage' },
  { name: '问答', href: '/store/ai-qa', icon: MessageCircleQuestion, permission: 'menstrual_chat' },
  { name: '创作', href: '/store/ai-content', icon: Clapperboard, permission: 'short_video' },
];

function isTabActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === '/store') {
    return pathname === '/store' || pathname === '/store/';
  }
  return pathname === href || pathname?.startsWith(href + '/');
}

function findCurrentPageName(pathname: string | null, items: NavItem[]): string {
  if (!pathname) return '首页';
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        if (child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))) {
          return child.name;
        }
      }
    }
    if (item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))) {
      return item.name;
    }
  }
  return '首页';
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userName, storeId, logout, isAuthenticated, userType, _hasHydrated, permissions } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const { storeThemeColor: themeColor, siteName, siteSubtitle } = useSiteSettings();

  // 按权限过滤侧边栏菜单
  const sidebarNav = useMemo(() => {
    const userPerms = userType === 'admin' ? null : permissions; // admin 不受限
    function filterItems(items: NavItem[]): NavItem[] {
      return items
        .filter((item) => {
          if (!item.permission) return true;
          if (userType === 'admin') return true;
          return hasPermission(userPerms, item.permission);
        })
        .map((item) => {
          if (item.children) {
            const filteredChildren = filterItems(item.children);
            if (filteredChildren.length === 0) return null as unknown as NavItem;
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter(Boolean) as NavItem[];
    }
    return filterItems(allSidebarNav);
  }, [permissions, userType]);

  // 按权限过滤底部 TabBar
  const filteredTabBarItems = useMemo(() => {
    if (userType === 'admin') return tabBarItems;
    return tabBarItems.filter(
      (item) => !item.permission || hasPermission(permissions, item.permission)
    );
  }, [permissions, userType]);

  // 页面级权限检查：如果当前路径没有权限，跳转到首页
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !pathname) return;
    if (userType === 'admin') return;

    // 首页和 profile 页默认能进
    if (pathname === '/store' || pathname.startsWith('/store/profile')) return;

    // 检查路径对应哪个菜单项
    function findPermission(items: NavItem[]): StorePermissionKey | null {
      for (const item of items) {
        if (item.href && item.permission && (pathname === item.href || pathname.startsWith(item.href + '/'))) {
          return item.permission;
        }
        if (item.children) {
          const found = findPermission(item.children);
          if (found) return found;
        }
      }
      return null;
    }

    const requiredPerm = findPermission(allSidebarNav);
    if (requiredPerm && !hasPermission(permissions, requiredPerm)) {
      router.push('/store');
    }
  }, [_hasHydrated, isAuthenticated, userType, permissions, pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 忽略错误，继续清理本地状态
    }
    logout();
    router.push('/login');
  };

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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!_hasHydrated) {
    return null;
  }

  const currentPageName = findCurrentPageName(pathname, sidebarNav);
  const isFullScreenPage = pathname === '/store/ai-analysis' || pathname?.startsWith('/store/ai-analysis/');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:min-h-screen print:bg-white print:overflow-relative">
      {/* 桌面端侧边栏 */}
      <aside
        className="hidden md:flex w-60 flex-col flex-shrink-0 print:hidden"
        style={{ backgroundColor: themeColor }}
      >
        {/* Logo 区域 */}
        <div className="px-5 py-5">
          <h1 className="text-base font-semibold text-white truncate">{siteName}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {siteSubtitle || '门店端'}
          </p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <SidebarNav items={sidebarNav} pathname={pathname} />
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
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </aside>

      {/* 移动端：顶部栏 + 主内容 + 底部 TabBar */}
      <main
        className={`flex-1 overflow-hidden flex flex-col min-h-0 print:overflow-visible print:w-full print:min-h-screen print:p-0 print:m-0 ${isMobile ? 'bg-gray-50' : ''}`}
      >
        {/* 移动端顶部栏 */}
        {isMobile && (
          <header
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 print:hidden shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <div className="w-10" />
            <h2 className="text-white font-medium text-base flex-1 text-center truncate">
              {currentPageName}
            </h2>
            <button
              onClick={handleLogout}
              className="text-white/80 hover:text-white p-1.5 -mr-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </header>
        )}

        {/* 页面内容（移动端留出底部 TabBar 空间） */}
        <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </div>

        {/* 移动端底部 TabBar */}
        {isMobile && (
          <nav
            className="fixed bottom-0 left-0 right-0 flex border-t border-gray-200 bg-white print:hidden z-30 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {filteredTabBarItems.filter((i) => i.href).map((item) => {
              const active = isTabActive(item.href!, pathname);
              return (
                <Link
                  key={item.name}
                  href={item.href as string}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 text-xs transition-colors"
                  style={{
                    color: active ? themeColor : '#6b7280',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <item.icon className="h-5 w-5 mb-0.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </main>
    </div>
  );
}
