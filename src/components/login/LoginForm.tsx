'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

type LoginMode = 'store_user' | 'customer' | 'admin';

interface LoginFormProps {
  mode: LoginMode;
  title: string;
  allowModeSwitch?: boolean;
  footerHref?: string;
  footerText?: string;
}

export function LoginForm({
  mode: initialMode,
  title,
  allowModeSwitch = false,
  footerHref,
  footerText,
}: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'store_user' | 'customer'>(
    initialMode === 'admin' ? 'store_user' : initialMode
  );
  const [error, setError] = useState('');
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const body: Record<string, string> = { password };

      if (initialMode === 'admin') {
        body.username = username;
        body.userType = 'admin';
      } else {
        body.phone = phone;
        body.userType = userType;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }

      setAuth({
        userType: data.userType,
        userId: data.userId,
        userName: data.userName,
        storeId: data.storeId,
      });

      if (data.userType === 'admin') {
        router.push('/admin');
      } else if (data.userType === 'store_user') {
        router.push('/store');
      } else {
        router.push('/customer');
      }
    } catch {
      setError('网络错误');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {allowModeSwitch && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={userType === 'store_user' ? 'default' : 'outline'}
                  onClick={() => setUserType('store_user')}
                  className="flex-1"
                >
                  门店登录
                </Button>
                <Button
                  type="button"
                  variant={userType === 'customer' ? 'default' : 'outline'}
                  onClick={() => setUserType('customer')}
                  className="flex-1"
                >
                  客户登录
                </Button>
              </div>
            )}

            {initialMode === 'admin' ? (
              <div>
                <Input
                  type="text"
                  placeholder="管理员用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div>
                <Input
                  type="tel"
                  placeholder="手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full">
              登录
            </Button>

            {footerHref && footerText && (
              <p className="text-sm text-gray-500 text-center">
                <a href={footerHref} className="text-blue-500 hover:underline">
                  {footerText}
                </a>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
