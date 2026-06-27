'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from '@/lib/icons';

/**
 * 安装检查守卫
 * - 如果系统未安装（Admin 表无记录），自动跳转 /install
 * - 仅在客户端使用，避免登录页可被绕过
 */
export function InstallGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/install/status', { cache: 'no-store' });
        const data = await res.json();
        if (!data.installed) {
          router.replace('/install');
          return;
        }
      } catch {
        // 请求失败时按"已安装"处理，避免阻塞登录
      } finally {
        setChecked(true);
      }
    };
    check();
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-6 animate-spin text-green-600" />
      </div>
    );
  }

  return <>{children}</>;
}
