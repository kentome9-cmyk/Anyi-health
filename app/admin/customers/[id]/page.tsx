'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, User, MessageSquare, FileText, Edit } from '@/lib/icons';

interface CustomerDetail {
  basic: {
    id: string;
    name: string;
    phone: string;
    age: number | null;
    storeId: string;
    storeName: string;
    postpartumDays: number | null;
    postpartumTime: string | null;
    deliveryMethod: string | null;
    birthOrder: number | null;
    allergy: string | null;
    notes: string | null;
    hasAbortionHistory: boolean | null;
    height: number | null;
    weight: number | null;
    createdAt: string;
  };
  conversations: Array<{
    id: string;
    content: string | null;
    reportContent: string | null;
    structuredData: any;
    createdAt: string;
  }>;
  plans: Array<{
    id: string;
    version: number;
    status: string;
    structuredContent: any;
    coreProjects: any;
    assistantProjects: any;
    actualCounts: any;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    storeId: '',
    postpartumDays: '',
    deliveryMethod: '',
    birthOrder: '',
    allergy: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomerDetail();
  }, [params.id]);

  const loadCustomerDetail = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`);
      const data = await res.json();
      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!customer) return;
    setFormData({
      name: customer.basic.name,
      phone: customer.basic.phone,
      age: customer.basic.age?.toString() || '',
      storeId: customer.basic.storeId,
      postpartumDays: customer.basic.postpartumDays?.toString() || '',
      deliveryMethod: customer.basic.deliveryMethod || '',
      birthOrder: customer.basic.birthOrder?.toString() || '',
      allergy: customer.basic.allergy || '',
      notes: customer.basic.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          postpartumDays: formData.postpartumDays ? parseInt(formData.postpartumDays) : null,
          birthOrder: formData.birthOrder ? parseInt(formData.birthOrder) : null,
        }),
      });
      if (res.ok) {
        setIsEditOpen(false);
        loadCustomerDetail();
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">加载中...</div>;
  }

  if (!customer) {
    return <div className="p-4 text-gray-500">未找到客户信息</div>;
  }

  const formatPlanStatus = (status: string) => {
    if (status === 'active') return { text: '进行中', style: 'bg-blue-100 text-blue-700' };
    if (status === 'completed') return { text: '已完成', style: 'bg-green-100 text-green-700' };
    return { text: status, style: 'bg-gray-100 text-gray-700' };
  };

  const formatContent = (data: any) => {
    if (!data) return '-';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>
        <Button onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          编辑信息
        </Button>
      </div>

      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">客户详情 - {customer.basic.name}</h2>
        <p className="text-gray-500">查看客户基本信息、对话记录和方案搭配</p>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            对话记录 ({customer.conversations.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            方案搭配 ({customer.plans.length})
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">姓名</Label>
                  <p className="font-medium">{customer.basic.name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">年龄</Label>
                  <p className="font-medium">{customer.basic.age || '-'} 岁</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">手机号</Label>
                  <p className="font-medium">{customer.basic.phone}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">所属门店</Label>
                  <p className="font-medium">{customer.basic.storeName}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">产后天数</Label>
                  <p className="font-medium">{customer.basic.postpartumDays || '-'} 天</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">生产方式</Label>
                  <p className="font-medium">{customer.basic.deliveryMethod || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">生产胎数</Label>
                  <p className="font-medium">{customer.basic.birthOrder || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">身高</Label>
                  <p className="font-medium">{customer.basic.height || '-'} cm</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-sm">体重</Label>
                  <p className="font-medium">{customer.basic.weight || '-'} kg</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg col-span-full">
                  <Label className="text-gray-500 text-sm">创建时间</Label>
                  <p className="font-medium">{new Date(customer.basic.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>健康信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-sm">过敏史</Label>
                <p className="font-medium">{customer.basic.allergy || '无'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-sm">备注</Label>
                <p className="font-medium">{customer.basic.notes || '无'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 对话记录 */}
        <TabsContent value="conversations" className="space-y-4">
          {customer.conversations.map((conv) => (
            <Card key={conv.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">对话记录</CardTitle>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.createdAt).toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-gray-500 text-xs block mb-1">客户描述</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {conv.content || '无内容'}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Label className="text-blue-600 text-xs block mb-1">AI 分析</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {conv.reportContent || '无分析结果'}
                  </p>
                </div>
                {conv.structuredData && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <Label className="text-green-600 text-xs block mb-1">结构化数据</Label>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {formatContent(conv.structuredData)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {customer.conversations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无对话记录
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 方案搭配 */}
        <TabsContent value="plans" className="space-y-4">
          {customer.plans.map((plan) => {
            const statusInfo = formatPlanStatus(plan.status);
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>方案版本 v{plan.version}</CardTitle>
                    <span className={`px-3 py-1 rounded-full text-xs ${statusInfo.style}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  <CardDescription>
                    创建时间：{new Date(plan.createdAt).toLocaleString()}
                    {plan.completedAt && ` · 完成时间：${new Date(plan.completedAt).toLocaleString()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Label className="text-gray-500 text-sm block mb-2">方案内容</Label>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-96">
                      {formatContent(plan.structuredContent)}
                    </pre>
                  </div>
                  {plan.coreProjects && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <Label className="text-blue-600 text-sm block mb-2">核心项目</Label>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-48">
                        {formatContent(plan.coreProjects)}
                      </pre>
                    </div>
                  )}
                  {plan.assistantProjects && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <Label className="text-purple-600 text-sm block mb-2">辅助项目</Label>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-48">
                        {formatContent(plan.assistantProjects)}
                      </pre>
                    </div>
                  )}
                  {plan.actualCounts && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <Label className="text-green-600 text-sm block mb-2">实际次数</Label>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-48">
                        {formatContent(plan.actualCounts)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {customer.plans.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无方案记录
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑客户信息</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">姓名</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">手机号</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editAge">年龄</Label>
                <Input
                  id="editAge"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPostpartumDays">产后天数</Label>
                <Input
                  id="editPostpartumDays"
                  type="number"
                  value={formData.postpartumDays}
                  onChange={(e) => setFormData({ ...formData, postpartumDays: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDeliveryMethod">生产方式</Label>
                <Input
                  id="editDeliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBirthOrder">生产胎数</Label>
                <Input
                  id="editBirthOrder"
                  type="number"
                  value={formData.birthOrder}
                  onChange={(e) => setFormData({ ...formData, birthOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAllergy">过敏史</Label>
              <Input
                id="editAllergy"
                value={formData.allergy}
                onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">备注</Label>
              <textarea
                id="editNotes"
                className="w-full p-2 border rounded-md text-sm h-20"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
