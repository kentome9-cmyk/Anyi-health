'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, MessageSquare, FileText, RefreshCw, CheckCircle, Calendar } from '@/lib/icons';

interface PlanProject {
  name: string;
  suggestedCount: string;
}

interface BodyRecord {
  id: string;
  planId: string | null;
  visitCount: number;
  visitDate: string;
  records: any;
  notes: string | null;
  createdAt: string;
}

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
    coreProjects: PlanProject[] | any;
    assistantProjects: PlanProject[] | any;
    actualCounts: Record<string, string> | any;
    isLatest: boolean;
    createdAt: string;
    completedAt: string | null;
  }>;
  bodyRecords: BodyRecord[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationDialog, setConversationDialog] = useState<{
    title: string;
    content: string | null;
  } | null>(null);

  useEffect(() => {
    loadCustomerDetail();
  }, [params.id]);

  const loadCustomerDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers/${params.id}`);
      const data = await res.json();
      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const parseProjects = (projects: PlanProject[] | any): PlanProject[] => {
    if (Array.isArray(projects)) return projects;
    if (!projects) return [];
    try {
      if (typeof projects === 'string') return JSON.parse(projects);
      return projects as PlanProject[];
    } catch {
      return [];
    }
  };

  const parseActualCounts = (counts: Record<string, string> | any): Record<string, string> => {
    if (!counts) return {};
    if (typeof counts === 'object') return counts;
    try {
      if (typeof counts === 'string') return JSON.parse(counts);
      return {};
    } catch {
      return {};
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">加载中...</div>;
  }

  if (!customer) {
    return <div className="p-4 text-gray-500">未找到客户信息</div>;
  }

  const getPlanTitle = (plan: CustomerDetail['plans'][number], coreProjects: PlanProject[]) => {
    const dateStr = new Date(plan.createdAt).toISOString().slice(0, 10).replace(/-/g, '-');
    const projectNames = coreProjects.slice(0, 2).map(p => p.name).join('、');
    return `${dateStr} ${projectNames || '调理'} 方案`;
  };

  const getBodyRecordsForPlan = (plan: CustomerDetail['plans'][number], planIndex: number) => {
    const matchingById = customer.bodyRecords.filter(r => r.planId === plan.id);
    if (matchingById.length > 0) return matchingById;

    const allPlans = customer.plans;
    const planDate = new Date(plan.createdAt);
    let nextPlanDate: Date | null = null;
    for (let i = planIndex - 1; i >= 0; i--) {
      if (allPlans[i] && allPlans[i].id !== plan.id) {
        nextPlanDate = new Date(allPlans[i].createdAt);
        break;
      }
    }

    return customer.bodyRecords.filter(r => {
      if (r.planId) return false;
      const recordDate = new Date(r.visitDate);
      if (recordDate < planDate) return false;
      if (nextPlanDate && recordDate >= nextPlanDate) return false;
      return true;
    });
  };

  const totalBodyRecords = customer.bodyRecords.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">客户详情</h2>
          <p className="text-gray-500">{customer.basic.name} - {customer.basic.phone}</p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            对话记录
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            方案搭配
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
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

        <TabsContent value="conversations" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">共 {customer.conversations.length} 条对话记录</div>
            <Button variant="outline" size="sm" onClick={loadCustomerDetail}>
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium text-gray-700">时间</TableHead>
                  <TableHead className="font-medium text-gray-700">发起内容</TableHead>
                  <TableHead className="font-medium text-gray-700">返回内容</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.conversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      暂无对话记录
                    </TableCell>
                  </TableRow>
                ) : (
                  customer.conversations.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {formatDate(new Date(record.createdAt))}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <button
                          onClick={() => setConversationDialog({
                            title: '发起内容',
                            content: record.reportContent,
                          })}
                          className="text-left text-gray-600 hover:text-gray-900"
                        >
                          {(record.reportContent || '无').slice(0, 60)}
                          {(record.reportContent || '').length > 60 ? '...' : ''}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <button
                          onClick={() => setConversationDialog({
                            title: '返回内容',
                            content: record.content,
                          })}
                          className="text-left text-gray-600 hover:text-gray-900"
                        >
                          {(record.content || '无').slice(0, 60)}
                          {(record.content || '').length > 60 ? '...' : ''}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6 mt-6">
          {customer.plans.length > 0 && (
            <div>
              {customer.plans.map((plan, planIndex) => {
                const coreProjects = parseProjects(plan.coreProjects);
                const assistantProjects = parseProjects(plan.assistantProjects);
                const actualCounts = parseActualCounts(plan.actualCounts);
                const planBodyRecords = getBodyRecordsForPlan(plan, planIndex);
                const planTitle = getPlanTitle(plan, coreProjects);

                return (
                  <div key={plan.id} className="space-y-4 mb-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-gray-700" />
                          {planTitle}
                          {plan.isLatest && (
                            <Badge className="bg-green-500 ml-2">最新方案</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {(() => {
                          const hasProjects = coreProjects.length > 0 || assistantProjects.length > 0;

                          if (!hasProjects) {
                            return <div className="text-center text-gray-500 py-4">暂无方案数据</div>;
                          }

                          return (
                            <div className="border rounded-lg overflow-hidden bg-white">
                              <Table>
                                <TableHeader className="bg-gray-50">
                                  <TableRow>
                                    <TableHead className="font-medium text-gray-700">类别</TableHead>
                                    <TableHead className="font-medium text-gray-700">项目名称</TableHead>
                                    <TableHead className="font-medium text-gray-700">建议次数</TableHead>
                                    <TableHead className="font-medium text-gray-700">剩余次数</TableHead>
                                    <TableHead className="font-medium text-gray-700">状态</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {coreProjects.map((project, idx) => {
                                    const actualCount = parseInt(actualCounts[project.name] || '0');
                                    const suggested = parseInt(project.suggestedCount) || 0;
                                    const remaining = Math.max(0, suggested - actualCount);
                                    const isDone = remaining === 0 && suggested > 0;
                                    return (
                                      <TableRow key={`core-${idx}`} className="hover:bg-gray-50">
                                        <TableCell>
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                            <CheckCircle className="h-3 w-3" />
                                            核心
                                          </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                                        <TableCell className="text-gray-600">{project.suggestedCount}次</TableCell>
                                        <TableCell>
                                          <span className={remaining > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                            {remaining}次
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {isDone ? (
                                            <Badge variant="secondary">已完成</Badge>
                                          ) : (
                                            <Badge className="bg-blue-500">进行中</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  {assistantProjects.map((project, idx) => {
                                    const actualCount = parseInt(actualCounts[project.name] || '0');
                                    const suggested = parseInt(project.suggestedCount) || 0;
                                    const remaining = Math.max(0, suggested - actualCount);
                                    const isDone = remaining === 0 && suggested > 0;
                                    return (
                                      <TableRow key={`assistant-${idx}`} className="hover:bg-gray-50">
                                        <TableCell>
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                            <FileText className="h-3 w-3" />
                                            辅助
                                          </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                                        <TableCell className="text-gray-600">{project.suggestedCount}次</TableCell>
                                        <TableCell>
                                          <span className={remaining > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                            {remaining}次
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {isDone ? (
                                            <Badge variant="secondary">已完成</Badge>
                                          ) : (
                                            <Badge className="bg-blue-500">进行中</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          );
                        })()}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              服务记录 ({planBodyRecords.length}条)
                            </span>
                          </div>
                          {planBodyRecords.length === 0 ? (
                            <div className="border rounded-lg bg-white p-4 text-center text-gray-500 text-sm">
                              暂无服务记录
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                              {planBodyRecords.map((record) => {
                                let recordText = '';
                                const records = record.records;
                                if (records) {
                                  if (Array.isArray(records)) {
                                    recordText = records.map((r: any) =>
                                      typeof r === 'object' ? (r.label || r.name || '') + ': ' + (r.value || '') : String(r)
                                    ).join(' | ');
                                  } else if (typeof records === 'object') {
                                    recordText = Object.entries(records)
                                      .map(([k, v]: [string, any]) => `${k}: ${v}`)
                                      .join(' | ');
                                  } else {
                                    recordText = String(records);
                                  }
                                }
                                return (
                                  <div key={record.id} className="flex items-start gap-3 text-sm">
                                    <div className="flex-1 flex items-baseline gap-3">
                                      <span className="font-medium text-gray-900 min-w-24">
                                        {new Date(record.visitDate).toLocaleDateString()}
                                      </span>
                                      <span className="text-gray-600">
                                        {recordText || '服务记录'}
                                      </span>
                                    </div>
                                    <Badge variant="outline">{record.visitCount}次</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            方案生成时间: {new Date(plan.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className={plan.status === 'active' ? 'bg-green-500' : ''}>
                              {plan.status === 'active' ? '进行中' : plan.status === 'completed' ? '已完成' : plan.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              v{plan.version || 1}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {customer.plans.length === 0 && (
            <div className="border rounded-lg bg-white p-8 text-center text-gray-500">
              暂无调理方案
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!conversationDialog}
        onOpenChange={(open) => !open && setConversationDialog(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{conversationDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {conversationDialog?.content || '无内容'}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
