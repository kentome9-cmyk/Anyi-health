'use client';

import { LoginForm } from '@/components/login/LoginForm';
import { InstallGuard } from '@/components/auth/InstallGuard';

export default function AdminLoginPage() {
  return (
    <InstallGuard>
      <LoginForm
        mode="admin"
        title="尚孕智慧助手管理中心"
        subtitle="Admin Login Portal"
        footerHref="/login"
        footerText="Go to Store Login"
      />
    </InstallGuard>
  );
}
