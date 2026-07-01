'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Check, Save, Eye, EyeOff, Store } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

interface StoreInfo {
  id?: string;
  storeName: string;
  description: string;
  address: string;
  contactPhone: string;
}

export default function StoreProfilePage() {
  const { userName } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    storeName: '',
    description: '',
    address: '',
    contactPhone: '',
  });
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    loadStoreInfo();
  }, []);

  const loadStoreInfo = async () => {
    try {
      const res = await fetch('/api/store/profile');
      const data = await res.json();
      if (data.store) {
        setStoreInfo({
          id: data.store.id,
          storeName: data.store.storeName || '',
          description: data.store.description || '',
          address: data.store.address || '',
          contactPhone: data.store.contactPhone || '',
        });
        setHasStore(true);
      }
    } catch (error) {
      console.error('Failed to load store info:', error);
    }
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreError('');
    setStoreSuccess(false);

    if (!storeInfo.storeName.trim()) {
      setStoreError('门店名称不能为空');
      return;
    }

    setStoreSubmitting(true);
    try {
      const res = await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeInfo),
      });
      const data = await res.json();
      if (!res.ok) {
        setStoreError(data.error || '保存失败');
        return;
      }
      setStoreSuccess(true);
      setHasStore(true);
    } catch {
      setStoreError('网络错误');
    } finally {
      setStoreSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/store/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '修改失败');
        return;
      }
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 text-green-600" />
          我的账号
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          修改当前账号 {userName} 的登录密码
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-green-600" />
            门店信息
            {!hasStore && (
              <span className="text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">
                未创建门店
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {hasStore ? '修改门店基本信息' : '填写门店信息完成注册，创建门店后即可使用全部功能'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStoreSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                门店名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={storeInfo.storeName}
                onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
                placeholder="请输入门店名称"
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                门店描述
              </label>
              <Input
                value={storeInfo.description}
                onChange={(e) => setStoreInfo({ ...storeInfo, description: e.target.value })}
                placeholder="请输入门店描述（选填）"
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                门店地址
              </label>
              <Input
                value={storeInfo.address}
                onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                placeholder="请输入门店地址（选填）"
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                联系电话
              </label>
              <Input
                value={storeInfo.contactPhone}
                onChange={(e) => setStoreInfo({ ...storeInfo, contactPhone: e.target.value })}
                placeholder="请输入联系电话（选填）"
                className="h-10"
              />
            </div>

            {storeError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                {storeError}
              </p>
            )}
            {storeSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                {hasStore ? '门店信息更新成功' : '门店创建成功，现在可以使用全部功能'}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="submit" disabled={storeSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {storeSubmitting ? '提交中...' : (hasStore ? '保存修改' : '创建门店')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            修改密码
          </CardTitle>
          <CardDescription className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            <Lock className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            为了账号安全，建议每 3-6 个月更换一次密码，密码长度建议 6-50 个字符
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                原密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  placeholder="请输入当前密码"
                  className="h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                新密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={50}
                  placeholder="6-50 个字符"
                  className="h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                确认新密码 <span className="text-red-500">*</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                placeholder="再输入一次新密码"
                className="h-10"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                密码修改成功
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                setSuccess(false);
              }}>
                重置
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? '提交中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
