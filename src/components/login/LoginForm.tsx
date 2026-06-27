'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Phone, Leaf, ChevronRight } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

type LoginMode = 'store_user' | 'customer' | 'admin';

interface LoginFormProps {
  mode: LoginMode;
  title: string;
  subtitle?: string;
  allowModeSwitch?: boolean;
  footerHref?: string;
  footerText?: string;
}

export function LoginForm({
  mode: initialMode,
  title,
  subtitle,
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
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

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
        permissions: data.permissions,
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#EFF4FF' }}>
      <div
        className="absolute rounded-full blur-[50px] opacity-10"
        style={{
          width: '640px',
          height: '512px',
          backgroundColor: '#044332',
          top: '-102px',
          left: '-128px',
        }}
      />
      <div
        className="absolute rounded-full blur-[50px] opacity-20"
        style={{
          width: '640px',
          height: '512px',
          backgroundColor: '#F6D4AF',
          bottom: '-102px',
          right: '-128px',
        }}
      />

      <div
        className="relative w-[90vw] max-w-[440px] bg-white rounded-lg shadow-lg"
        style={{
          border: '1px solid #C0C9C3',
          boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="p-10">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#044332' }}
            >
              <Leaf className="w-[21px] h-[23px] text-white" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1
                className="text-2xl font-semibold text-center"
                style={{ color: '#0B1C30', lineHeight: '32px' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-sm font-normal text-center"
                  style={{ color: '#404944', lineHeight: '20px' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {allowModeSwitch && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUserType('store_user')}
                  className={`flex-1 py-2.5 px-4 rounded text-xs font-semibold tracking-wider transition-colors ${
                    userType === 'store_user'
                      ? 'text-white'
                      : 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={userType === 'store_user' ? { backgroundColor: '#044332' } : {}}
                >
                  门店登录
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('customer')}
                  className={`flex-1 py-2.5 px-4 rounded text-xs font-semibold tracking-wider transition-colors ${
                    userType === 'customer'
                      ? 'text-white'
                      : 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={userType === 'customer' ? { backgroundColor: '#044332' } : {}}
                >
                  客户登录
                </button>
              </div>
            )}

            {initialMode === 'admin' ? (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider"
                  style={{ color: '#0B1C30' }}
                >
                  用户名
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#404944' }}
                  />
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full py-3 pl-10 pr-3 rounded text-base outline-none transition-colors focus:ring-2 focus:ring-opacity-50"
                    style={{
                      backgroundColor: '#F8F9FF',
                      color: '#404944',
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 0 2px rgba(4, 67, 50, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider"
                  style={{ color: '#0B1C30' }}
                >
                  手机号
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#404944' }}
                  />
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full py-3 pl-10 pr-3 rounded text-base outline-none transition-all"
                    style={{
                      backgroundColor: '#F8F9FF',
                      color: '#404944',
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 0 2px rgba(4, 67, 50, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs font-semibold tracking-wider"
                  style={{ color: '#0B1C30' }}
                >
                  密码
                </label>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-[21px]"
                  style={{ color: '#404944' }}
                />
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full py-3 pl-10 pr-3 rounded text-base outline-none transition-all"
                  style={{
                    backgroundColor: '#F8F9FF',
                    color: '#404944',
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0 0 0 2px rgba(4, 67, 50, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded text-white text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition-opacity disabled:opacity-70 mt-2"
              style={{ backgroundColor: '#044332' }}
            >
              {isLoading ? '登录中...' : initialMode === 'admin' ? '进入管理后台' : '登录'}
              {!isLoading && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {footerHref && footerText && (
          <div
            className="px-8 py-4 flex justify-between items-center border-t"
            style={{
              backgroundColor: '#E5EEFF',
              borderColor: '#C0C9C3',
            }}
          >
            {initialMode !== 'admin' && userType === 'store_user' && (
              <a
                href="/register"
                className="text-xs font-semibold tracking-wider flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: '#044332' }}
              >
                <User className="w-3.5 h-3.5" />
                注册门店账号
              </a>
            )}
            <a
              href={footerHref}
              className="text-xs font-semibold tracking-wider flex items-center gap-1 transition-opacity hover:opacity-80 ml-auto"
              style={{ color: '#044332' }}
            >
              {footerText}
              <ChevronRight className="w-[11.72px] h-[10.5px]" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
