'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Upload, User, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth.store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Customer {
  id: string;
  storeId?: string;
  name: string;
  phone: string;
  age?: number;
  postpartumDays?: number;
  deliveryMethod?: string;
  birthOrder?: string;
  hasAbortionHistory?: string;
  allergy?: string;
  height?: number;
  weight?: number;
}

const mockCustomers: Customer[] = [
  {
    id: 'mock-1',
    name: '张美丽',
    phone: '13812345678',
    age: 28,
    postpartumDays: 45,
    deliveryMethod: '顺产',
    birthOrder: '第一胎',
    hasAbortionHistory: '无',
    allergy: '青霉素过敏',
    height: 165,
    weight: 60,
  },
  {
    id: 'mock-2',
    name: '李芳菲',
    phone: '13887654321',
    age: 32,
    postpartumDays: 30,
    deliveryMethod: '剖宫产',
    birthOrder: '第二胎',
    hasAbortionHistory: '有',
    allergy: '无',
    height: 162,
    weight: 58,
  },
  {
    id: 'mock-3',
    name: '王雪梅',
    phone: '13611112222',
    age: 26,
    postpartumDays: 60,
    deliveryMethod: '顺产',
    birthOrder: '第一胎',
    hasAbortionHistory: '无',
    allergy: '无',
    height: 168,
    weight: 62,
  },
];

export default function ReportSubmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCustomerId = searchParams.get('customerId');
  const { storeId, isAuthenticated, _hasHydrated } = useAuthStore();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    postpartum: '',
    delivery: '',
    gestation: '',
    miscarriage: '',
    allergy: '',
    height: '',
    weight: '',
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (storeId) {
      loadCustomers();
    }
  }, [_hasHydrated, isAuthenticated, storeId, router]);

  const loadCustomers = async () => {
    if (!storeId) return;
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/admin/customers?storeId=${storeId}&pageSize=100`);
      const data = await res.json();
      const list = data.list || [];
      setCustomers(list);

      if (urlCustomerId) {
        const targetCustomer = list.find((c: Customer) => c.id === urlCustomerId);
        if (targetCustomer) {
          setSelectedCustomer(targetCustomer);
          setFormData({
            name: targetCustomer.name || '',
            phone: targetCustomer.phone || '',
            age: targetCustomer.age?.toString() || '',
            postpartum: targetCustomer.postpartumDays?.toString() || '',
            delivery: targetCustomer.deliveryMethod || '',
            gestation: targetCustomer.birthOrder || '',
            miscarriage: targetCustomer.hasAbortionHistory || '',
            allergy: targetCustomer.allergy || '',
            height: targetCustomer.height?.toString() || '',
            weight: targetCustomer.weight?.toString() || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      c.phone.includes(searchQuery)
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      name: customer.name || '',
      phone: customer.phone || '',
      age: customer.age?.toString() || '',
      postpartum: customer.postpartumDays?.toString() || '',
      delivery: customer.deliveryMethod || '',
      gestation: customer.birthOrder || '',
      miscarriage: customer.hasAbortionHistory || '',
      allergy: customer.allergy || '',
      height: customer.height?.toString() || '',
      weight: customer.weight?.toString() || '',
    });
    setShowCustomerModal(false);
  };

  const handleNextStep = async () => {
    const name = selectedCustomer?.name || formData.name;
    const phone = selectedCustomer?.phone || formData.phone;
    const age = selectedCustomer?.age?.toString() || formData.age;
    const postpartum = formData.postpartum;
    const delivery = selectedCustomer?.deliveryMethod || formData.delivery;
    const gestation = selectedCustomer?.birthOrder || formData.gestation;

    const errors: string[] = [];

    if (!name?.trim()) errors.push('姓名');
    if (!age?.trim()) errors.push('年龄');
    if (!formData.height?.trim()) errors.push('身高');
    if (!formData.weight?.trim()) errors.push('体重');

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return;
    }

    if (!storeId) {
      setValidationErrors(['闂ㄥ簵']);
      setShowValidationError(true);
      return;
    }

    let customerId = selectedCustomer?.id;
    if (!customerId) {
      try {
        const res = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            name,
            phone,
            age,
            postpartumDays: postpartum,
            deliveryMethod: delivery,
            birthOrder: gestation,
            hasAbortionHistory: Boolean(formData.miscarriage),
            allergy: formData.allergy,
            height: formData.height,
            weight: formData.weight,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Create customer failed');
        }
        customerId = data.id;
      } catch (error) {
        console.error('Failed to create customer:', error);
        setValidationErrors(['瀹㈡埛淇濆瓨']);
        setShowValidationError(true);
        return;
      }
    }

    if (!customerId) {
      setValidationErrors(['瀹㈡埛']);
      setShowValidationError(true);
      return;
    }

    const customerInfo = {
      id: customerId,
      storeId,
      name,
      phone,
      age: parseInt(age),
      postpartumDays: parseInt(postpartum) || (selectedCustomer?.postpartumDays ?? 0),
      deliveryMethod: delivery,
      birthOrder: gestation,
      hasAbortionHistory: formData.miscarriage || '无',
      allergy: formData.allergy || '无',
      height: parseFloat(formData.height) || 0,
      weight: parseFloat(formData.weight) || 0,
      symptoms,
    };

    const queryParams = new URLSearchParams({
      customerId: customerInfo.id,
      customerData: encodeURIComponent(JSON.stringify(customerInfo)),
    });

    router.push(`/store/ai-analysis?${queryParams.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex justify-between items-center px-6 py-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在线分析</h1>
          <p className="text-sm text-gray-500 mt-1">填写客户基础信息，开始 AI 智能分析</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleNextStep}
        >
          开始分析
        </Button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* 左侧：客户信息 */}
          <Card className="lg:col-span-2 flex flex-col h-full">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-base">客户信息</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {/* 选择现有客户 */}
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerModal(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  选择现有客户
                </Button>
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedCustomer.name}</div>
                      <div className="text-xs text-gray-500">
                        {selectedCustomer.phone}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    更换
                  </Button>
                </div>
              )}

              {/* 表单字段 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">姓名</label>
                  <Input
                    placeholder="请输入姓名"
                    value={selectedCustomer?.name || formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">联系电话</label>
                  <Input
                    placeholder="请输入电话"
                    value={selectedCustomer?.phone || formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">年龄</label>
                  <Input
                    type="number"
                    placeholder="请输入年龄"
                    value={selectedCustomer?.age || formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">产后天数</label>
                  <Input
                    type="number"
                    placeholder="请输入产后天数"
                    value={formData.postpartum}
                    onChange={(e) => setFormData({ ...formData, postpartum: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">生产方式</label>
                  <Input
                    placeholder="顺产 / 剖宫产"
                    value={selectedCustomer?.deliveryMethod || formData.delivery}
                    onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">胎次</label>
                  <Input
                    placeholder="第一胎 / 第二胎"
                    value={selectedCustomer?.birthOrder || formData.gestation}
                    onChange={(e) => setFormData({ ...formData, gestation: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">身高 (cm)</label>
                  <Input
                    type="number"
                    placeholder="请输入身高"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">体重 (kg)</label>
                  <Input
                    type="number"
                    placeholder="请输入体重"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              {/* 过敏史和小产记录 */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">是否有小产记录</label>
                  <Input
                    placeholder="如有请注明"
                    value={formData.miscarriage}
                    onChange={(e) => setFormData({ ...formData, miscarriage: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">过敏史</label>
                  <Input
                    placeholder="请描述过敏史"
                    value={formData.allergy}
                    onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
                    disabled={!!selectedCustomer}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右侧：上传和症状 */}
          <div className="flex flex-col gap-4 h-full min-h-0">
            <Card className="flex-shrink-0 overflow-hidden">
              <CardContent className="pt-4 pb-4">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  id="report-upload"
                  onChange={() => setUploadedFile('医疗报告扫描件.pdf')}
                />
                <label htmlFor="report-upload" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                    {uploadedFile ? (
                      <div className="text-green-600">
                        <Upload className="h-5 w-5 mx-auto mb-1" />
                        <h3 className="text-sm font-medium">已上传</h3>
                        <p className="text-xs text-gray-500">{uploadedFile}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                        <h3 className="text-sm font-medium text-gray-700">上传医疗报告</h3>
                        <p className="text-xs text-gray-500 mt-1">点击上传图片或 PDF</p>
                      </div>
                    )}
                  </div>
                </label>
              </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-base">症状描述</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
                <Textarea
                  placeholder="描述客户目前的身体状况、痛点或主要诉求..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="flex-1 min-h-0 resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 选择客户弹窗 */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              选择现有客户
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索姓名或手机号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">姓名</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">联系方式</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">产后天数</th>
                </tr>
              </thead>
              <tbody>
                {loadingCustomers ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500 text-sm">
                      鍔犺浇涓?..
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500 text-sm">
                      暂无客户数据
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                            {customer.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-sm">{customer.phone}</td>
                      <td className="py-2 px-3 text-gray-600 text-sm">{customer.postpartumDays || '-'} 天</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 验证错误弹窗 */}
      <Dialog open={showValidationError} onOpenChange={setShowValidationError}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-base">
              <X className="h-4 w-4" />
              请填写必填项
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <ul className="space-y-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-center gap-2 text-red-700 text-sm">
                  <X className="h-4 w-4" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowValidationError(false)}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
