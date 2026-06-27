'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginLogsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/operation-logs?tab=login');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-gray-500">
      跳转中...
    </div>
  );
}
