'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Lock, User, Store, Leaf, ChevronRight, CheckCircle } from '@/lib/icons';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken || ''))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone) return setError('请输入手机号');
    if (!/^1[3-9]\d{9}$/.test(phone)) return setError('手机号格式不正确');
    if (!password) return setError('请输入密码');
    if (password.length < 6) return setError('密码长度不能少于6位');
    if (password !== confirmPassword) return setError('两次密码输入不一致');

    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      const res = await fetch('/api/auth/store-register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, password, name, storeName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }
      setIsSuccess(true);
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const goLogin = () => {
    router.push('/login');
  };

  if (isSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: '#EFF4FF' }}
      >
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
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">注册成功</h2>
              <p className="text-gray-500 text-sm mt-2">
                您的账号已注册成功，默认开通个人资料功能。
                <br />
                如需使用更多功能，请联系管理员开通权限。
              </p>
            </div>
            <button
              onClick={goLogin}
              className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#044332' }}
            >
              去登录
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ backgroundColor: '#EFF4FF' }}
    >
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
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo 标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <Leaf className="w-8 h-8" style={{ color: '#044332' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#044332' }}>
              尚孕智慧助手
            </h1>
          </div>
          <p className="text-gray-500 text-sm">门店账号注册</p>
        </div>

        {/* 注册卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                手机号 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                  maxLength={11}
                />
              </div>
            </div>

            {/* 姓名/门店负责人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                负责人姓名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入负责人姓名"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
              </div>
            </div>

            {/* 门店名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                门店名称
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="请输入门店名称"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                设置密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="不少于6位"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
              </div>
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                />
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#044332' }}
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-5 text-center text-sm text-gray-500">
            已有账号？
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: '#044332' }}
            >
              去登录
            </Link>
          </div>

          {/* 微信授权提示（预留） */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              微信授权登录功能即将上线，敬请期待
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
