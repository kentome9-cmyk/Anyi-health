'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

interface UseAuthGuardOptions {
  requiredUserType: 'admin' | 'store_user' | 'customer';
  redirectPath?: string;
}

export function useAuthGuard({ requiredUserType, redirectPath }: UseAuthGuardOptions) {
  const router = useRouter();
  const { isAuthenticated, userType, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push(redirectPath || '/login');
      return;
    }
    if (userType !== requiredUserType) {
      router.push(redirectPath || '/login');
    }
  }, [_hasHydrated, isAuthenticated, userType, router, redirectPath]);

  return { isAuthenticated, userType, _hasHydrated };
}