import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserType = 'admin' | 'store_user' | 'customer' | null;

interface AuthState {
  userType: UserType;
  userId: string | null;
  userName: string | null;
  storeId: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setAuth: (data: {
    userType: UserType;
    userId: string;
    userName: string | null;
    storeId: string | null;
  }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userType: null,
      userId: null,
      userName: null,
      storeId: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (data) =>
        set({
          userType: data.userType,
          userId: data.userId,
          userName: data.userName,
          storeId: data.storeId,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          userType: null,
          userId: null,
          userName: null,
          storeId: null,
          isAuthenticated: false,
        }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
