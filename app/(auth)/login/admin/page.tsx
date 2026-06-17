'use client';

import { LoginForm } from '@/components/login/LoginForm';

export default function AdminLoginPage() {
  return (
    <LoginForm
      mode="admin"
      title="超级管理员登录"
      footerHref="/login"
      footerText="返回门店/客户登录"
    />
  );
}
