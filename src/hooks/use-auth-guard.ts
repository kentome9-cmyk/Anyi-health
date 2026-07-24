'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

interface UseAuthGuardOptions {
  requiredUserType: 'admin' | 'store_user' | 'customer';
  redirectPath?: string;
}

export function useAuthGuard({ requiredUserType, redirectPath }: UseAuthGuardOptions) {
  const router = useRouter();
  const { isAuthenticated, userType, _hasHydrated, setAuth, logout } = useAuthStore();
  const [serverVerified, setServerVerified] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    const verifyServerSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 401) {
          logout();
          router.push(redirectPath || '/login');
          return;
        }

        const data = await response.json();
        if (data.authenticated && data.userType === requiredUserType) {
          setAuth({
            userType: data.userType,
            userId: data.userId,
            userName: data.userName,
            storeId: data.storeId,
            permissions: data.permissions,
            isDemo: data.isDemo,
            demoBatchId: data.demoBatchId,
          });
          setServerVerified(true);
        } else {
          logout();
          router.push(redirectPath || '/login');
        }
      } catch {
        logout();
        router.push(redirectPath || '/login');
      }
    };

    verifyServerSession();
  }, [_hasHydrated, requiredUserType, router, redirectPath, setAuth, logout]);

  return { isAuthenticated, userType, _hasHydrated, serverVerified };
}
