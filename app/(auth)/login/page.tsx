'use client';

import { LoginForm } from '@/components/login/LoginForm';
import { InstallGuard } from '@/components/auth/InstallGuard';

export default function LoginPage() {
  return (
    <InstallGuard>
      <LoginForm
        mode="store_user"
        title="尚孕智慧助手"
        subtitle="Store & Customer Portal"
        allowModeSwitch
        footerHref="/login/admin"
        footerText="管理员登录"
      />
    </InstallGuard>
  );
}
