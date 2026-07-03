'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { SidebarNav } from '@/components/ui/sidebar-nav';
import {
  LogOut,
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
  Heart,
  Sparkles,
  User,
  ClipboardList,
} from '@/lib/icons';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useSiteSettings } from '@/hooks/use-site-settings';

const navigation = [
  { name: '首页', href: '/admin', icon: LayoutDashboard },
  { name: '门店管理', href: '/admin/stores', icon: Store },
  {
    name: '客户服务',
    icon: Users,
    children: [
      { name: '客户管理', href: '/admin/customers', icon: Users },
      { name: '对话记录', href: '/admin/plan-records', icon: ScrollText },
      { name: '知识库', href: '/admin/knowledge-base', icon: BookOpen },
    ],
  },
  {
    name: '学习中心',
    icon: Sparkles,
    children: [
      { name: '学习资源管理', href: '/admin/learning-resources', icon: BookOpen },
    ],
  },
  {
    name: '短视频获客助手',
    icon: Bot,
    children: [
      { name: '脚本库管理', href: '/admin/ai-scripts', icon: FileText },
      { name: '提示词管理', href: '/admin/prompts', icon: Lightbulb },
    ],
  },
  {
    name: '月经助手',
    icon: Heart,
    children: [
      { name: '对话记录', href: '/admin/menstrual-chat', icon: MessageSquare },
      { name: '知识库管理', href: '/admin/menstrual-knowledge-base', icon: BookOpen },
      { name: '问答管理', href: '/admin/ai-qa', icon: Lightbulb },
    ],
  },
  { name: 'AI 设置', href: '/admin/ai-settings', icon: Settings },
  {
    name: '系统管理',
    icon: Settings,
    children: [
      { name: '系统设置', href: '/admin/settings', icon: Settings },
      { name: '管理员账号', href: '/admin/admins', icon: User },
      { name: '系统日志', href: '/admin/operation-logs', icon: ClipboardList },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { _hasHydrated } = useAuthGuard({ requiredUserType: 'admin', redirectPath: '/login/admin' });
  const { themeColor, siteName, siteSubtitle } = useSiteSettings();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 忽略错误，继续清理本地状态
    }
    logout();
    router.push('/login/admin');
  };

  if (!_hasHydrated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside
        className="w-60 flex flex-col flex-shrink-0"
        style={{ backgroundColor: themeColor }}
      >
        {/* Logo 区域 */}
        <div className="px-5 py-5">
          <h1 className="text-base font-semibold text-white truncate">{siteName}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {siteSubtitle || '管理员后台'}
          </p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <SidebarNav items={navigation} pathname={pathname} />
        </nav>

        {/* 底部：我的 + 退出 */}
        <div className="p-3 mt-auto space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            style={{
              color: 'rgba(255,255,255,0.8)',
              backgroundColor: 'transparent',
            }}
            onClick={() => router.push('/admin/profile')}
          >
            <User className="h-4 w-4 mr-2" />
            我的账号
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            style={{
              color: 'rgba(255,255,255,0.8)',
              backgroundColor: 'transparent',
            }}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
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
