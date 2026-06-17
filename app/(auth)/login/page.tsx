'use client';

import { LoginForm } from '@/components/login/LoginForm';

export default function LoginPage() {
  return (
    <LoginForm
      mode="store_user"
      title="产后健康管理系统"
      allowModeSwitch
      footerHref="/login/admin"
      footerText="管理员登录"
    />
  );
}
