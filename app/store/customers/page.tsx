'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, User, Phone, Calendar, Loader2 } from '@/lib/icons';

interface Customer {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  storeId: string | null;
  storeName: string | null;
  postpartumDays: number | null;
  deliveryMethod: string | null;
  birthOrder: number | null;
  hasAbortionHistory: boolean | null;
  allergy: string | null;
  lastServiceDate: string | null;
  createdAt: string | null;
}

interface ServiceRecord {
  id: string;
  visitDate: string;
  visitCount: number;
  records: { label: string; value: string }[];
  notes: string | null;
  createdAt: string;
}

interface PlanProject {
  name: string;
  suggestedCount: string;
}

interface CustomerPlan {
  id: string;
  coreProjects: PlanProject[];
  assistantProjects: PlanProject[];
  actualCounts: Record<string, string>;
}

interface ReportRecord {
  id: string;
  customerId: string;
  createdAt: string;
  images: string[];
}

export default function StoreCustomersPage() {
  const router = useRouter();
  const { storeId, userType, isAuthenticated, _hasHydrated } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearch = useDebounce(searchKeyword, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 详情弹窗
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // 客户方案
  const [customerPlans, setCustomerPlans] = useState<CustomerPlan[]>([]);

  // 新增服务记录
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    project: '',
    count: 1,
    remark: '',
  });

  // 报告弹窗
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportList, setReportList] = useState<ReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (userType !== 'store_user' && userType !== 'admin') {
      router.push('/login');
      return;
    }
  }, [_hasHydrated, isAuthenticated, userType, router]);

  useEffect(() => {
    if (storeId) {
      loadCustomers();
    }
  }, [debouncedSearch, currentPage, pageSize, storeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const mockCustomers: Customer[] = [
    {
      id: 'mock-1',
      name: '张美丽',
      phone: '13800138001',
      age: 28,
      storeId: storeId || 'mock-store',
      storeName: '产后健康管理系统',
      postpartumDays: 45,
      deliveryMethod: '顺产',
      birthOrder: 1,
      hasAbortionHistory: false,
      allergy: '青霉素过敏',
      lastServiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      name: '李晓婷',
      phone: '13800138002',
      age: 32,
      storeId: storeId || 'mock-store',
      storeName: '产后健康管理系统',
      postpartumDays: 120,
      deliveryMethod: '剖腹产',
      birthOrder: 2,
      hasAbortionHistory: true,
      allergy: null,
      lastServiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      name: '王芳',
      phone: '13800138003',
      age: 26,
      storeId: storeId || 'mock-store',
      storeName: '产后健康管理系统',
      postpartumDays: 30,
      deliveryMethod: '顺产',
      birthOrder: 1,
      hasAbortionHistory: false,
      allergy: null,
      lastServiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-4',
      name: '刘慧敏',
      phone: '13800138004',
      age: 30,
      storeId: storeId || 'mock-store',
      storeName: '产后健康管理系统',
      postpartumDays: 60,
      deliveryMethod: '顺产',
      birthOrder: 2,
      hasAbortionHistory: false,
      allergy: '海鲜过敏',
      lastServiceDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-5',
      name: '陈雪',
      phone: '13800138005',
      age: 35,
      storeId: storeId || 'mock-store',
      storeName: '产后健康管理系统',
      postpartumDays: 90,
      deliveryMethod: '剖腹产',
      birthOrder: 3,
      hasAbortionHistory: true,
      allergy: null,
      lastServiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const loadCustomers = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        storeId,
      });
      if (debouncedSearch) {
        params.append('keyword', debouncedSearch);
      }
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      setCustomers(data.list || []);
      setTotal(data.total || 0);
      return;

      if (data.list && data.list.length > 0) {
        setCustomers(data.list);
        setTotal(data.total || 0);
      } else {
        // 当API返回空数据时，提供模拟数据
        let filtered = mockCustomers;
        if (debouncedSearch) {
          filtered = mockCustomers.filter(
            (c) =>
              c.name.includes(debouncedSearch) || c.phone.includes(debouncedSearch)
          );
        }
        const start = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        setCustomers(paginated);
        setTotal(filtered.length);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceRecords = async (customerId: string) => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/body-records?customerId=${customerId}&storeId=${storeId}`);
      const data = await res.json();
      setServiceRecords(data.list || []);
    } catch (error) {
      console.error('Failed to load service records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadCustomerPlans = async (customerId: string) => {
    try {
      const res = await fetch(`/api/admin/plan-records/customer/${customerId}`);
      const data = await res.json();
      setCustomerPlans(data.plans || []);
      return;
      if (data.plans && data.plans.length > 0) {
        setCustomerPlans(data.plans);
      } else {
        // 模拟数据
        setCustomerPlans([
          {
            id: 'mock-plan-1',
            coreProjects: [
              { name: '骨盆修复', suggestedCount: '10' },
              { name: '腹直肌修复', suggestedCount: '8' },
              { name: '盆底肌修复', suggestedCount: '12' },
            ],
            assistantProjects: [
              { name: '肩颈放松', suggestedCount: '5' },
              { name: '温灸调理', suggestedCount: '6' },
            ],
            actualCounts: {
              'core_骨盆修复': '6',
              'core_腹直肌修复': '4',
              'core_盆底肌修复': '8',
              'assistant_肩颈放松': '2',
              'assistant_温灸调理': '3',
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load customer plans:', error);
      setCustomerPlans([]);
      return;
      // 模拟数据
      setCustomerPlans([
        {
          id: 'mock-plan-1',
          coreProjects: [
            { name: '骨盆修复', suggestedCount: '10' },
            { name: '腹直肌修复', suggestedCount: '8' },
            { name: '盆底肌修复', suggestedCount: '12' },
          ],
          assistantProjects: [
            { name: '肩颈放松', suggestedCount: '5' },
            { name: '温灸调理', suggestedCount: '6' },
          ],
          actualCounts: {
            'core_骨盆修复': '6',
            'core_腹直肌修复': '4',
            'core_盆底肌修复': '8',
            'assistant_肩颈放松': '2',
            'assistant_温灸调理': '3',
          },
        },
      ]);
    }
  };

  const getAvailableProjects = () => {
    const plan = customerPlans[0];
    if (!plan) return [];

    const allProjects: {
      name: string;
      type: 'core' | 'assistant';
      suggestedCount: string;
      actualCount: number;
      usedCount: number;
      remaining: number;
    }[] = [];

    plan.coreProjects?.forEach((p) => {
      const actualCount = parseInt(plan.actualCounts?.[`core_${p.name}`]) || 0;
      const usedCount = serviceRecords.filter((r) => r.records?.[0]?.value === p.name).length;
      allProjects.push({
        name: p.name,
        type: 'core',
        suggestedCount: p.suggestedCount,
        actualCount,
        usedCount,
        remaining: actualCount - usedCount,
      });
    });

    plan.assistantProjects?.forEach((p) => {
      const actualCount = parseInt(plan.actualCounts?.[`assistant_${p.name}`]) || 0;
      const usedCount = serviceRecords.filter((r) => r.records?.[0]?.value === p.name).length;
      allProjects.push({
        name: p.name,
        type: 'assistant',
        suggestedCount: p.suggestedCount,
        actualCount,
        usedCount,
        remaining: actualCount - usedCount,
      });
    });

    return allProjects;
  };

  const handleOpenDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setShowAddRecord(false);
    setShowProjectDropdown(false);
    await Promise.all([loadServiceRecords(customer.id), loadCustomerPlans(customer.id)]);
  };

  const handleDeleteServiceRecord = async (recordId: string) => {
    if (!selectedCustomer) return;
    try {
      await fetch(`/api/admin/body-records/${recordId}`, {
        method: 'DELETE',
      });
      await loadServiceRecords(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to delete service record:', error);
    }
  };

  const handleOpenReportList = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/admin/reports/customer/${customer.id}`);
      const data = await res.json();
      if (data.list && data.list.length > 0) {
        setReportList(data.list);
      } else {
        setReportList([]);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReportList([]);
    } finally {
      setLoadingReports(false);
    }
    setShowReportModal(true);
  };

  const handleViewReport = (report: ReportRecord) => {
    const reportUrl = `/store/report/view?reportId=${report.id}`;
    window.open(reportUrl, '_blank');
  };

  const handleAddServiceRecord = async () => {
    if (!selectedCustomer || !newRecord.project.trim()) return;
    try {
      const res = await fetch('/api/admin/body-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          storeId,
          visitDate: newRecord.date,
          visitCount: newRecord.count,
          records: [{ label: '服务项目', value: newRecord.project }],
          notes: newRecord.remark,
        }),
      });
      if (res.ok) {
        await loadServiceRecords(selectedCustomer.id);
        setNewRecord({ date: new Date().toISOString().split('T')[0], project: '', count: 1, remark: '' });
        setShowAddRecord(false);
        setShowProjectDropdown(false);
      }
    } catch (error) {
      console.error('Failed to add service record:', error);
    }
  };

  const handleStartAnalysis = (customer: Customer) => {
    const reportData = {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        age: customer.age,
        postpartumDays: customer.postpartumDays,
        deliveryMethod: customer.deliveryMethod,
        birthOrder: customer.birthOrder,
        hasAbortionHistory: customer.hasAbortionHistory,
        allergy: customer.allergy,
      },
      symptoms: '',
      images: [],
      imagePreviews: [],
    };
    localStorage.setItem('reportData', JSON.stringify(reportData));
    router.push(`/store/report-submit?storeId=${storeId}&customerId=${customer.id}`);
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* 页面标题栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理客户信息与服务记录</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索客户姓名或电话..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={() => router.push(`/store/report-submit?storeId=${storeId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            新建客户
          </Button>
        </div>
      </div>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {searchKeyword ? '未找到匹配的客户' : '暂无客户数据'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead className="text-center">联系方式</TableHead>
                      <TableHead className="text-center">年龄</TableHead>
                      <TableHead className="text-center">顺/剖</TableHead>
                      <TableHead className="text-center">创建时间</TableHead>
                      <TableHead className="text-center">最后服务时间</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                            {customer.name.charAt(0)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-center">{customer.phone}</TableCell>
                        <TableCell className="text-center">{customer.age ? `${customer.age}岁` : '-'}</TableCell>
                        <TableCell className="text-center">{customer.deliveryMethod || '-'}</TableCell>
                        <TableCell className="text-center">{formatDate(customer.createdAt)}</TableCell>
                        <TableCell className="text-center text-gray-700">{customer.lastServiceDate ? formatDate(customer.lastServiceDate) : '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReportList(customer)}
                            >
                              查看报告
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(customer)}
                            >
                              查看记录
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleStartAnalysis(customer)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              AI分析
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-500">
                    共 {total} 位客户
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">每页</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        首页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <span className="text-sm text-gray-500">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        末页
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      {/* Customer Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>客户详情</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">年龄：</span>
                      <span>{selectedCustomer.age || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">电话：</span>
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">产后天数：</span>
                      <span>{selectedCustomer.postpartumDays || '-'}天</span>
                    </div>
                    <div>
                      <span className="text-gray-500">生产方式：</span>
                      <span>{selectedCustomer.deliveryMethod || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">胎次：</span>
                      <span>{selectedCustomer.birthOrder ? `第${selectedCustomer.birthOrder}胎` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">流产史：</span>
                      <span>{selectedCustomer.hasAbortionHistory ? '有' : '无'}</span>
                    </div>
                    {selectedCustomer.allergy && (
                      <div className="col-span-2">
                        <span className="text-gray-500">过敏史：</span>
                        <span>{selectedCustomer.allergy}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 第一期调理方案 */}
              {customerPlans.length > 0 && customerPlans[0] && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">第一期调理方案</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>项目名称</TableHead>
                          <TableHead className="text-center">类型</TableHead>
                          <TableHead className="text-center">建议次数</TableHead>
                          <TableHead className="text-center">实际次数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerPlans[0].coreProjects?.map((project, idx) => (
                          <TableRow key={`core-${idx}`}>
                            <TableCell>{project.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-700 border-green-300">核心</Badge>
                            </TableCell>
                            <TableCell className="text-center text-gray-500">{project.suggestedCount || '-'}</TableCell>
                            <TableCell className="text-center font-medium text-green-700">
                              {customerPlans[0].actualCounts?.[`core_${project.name}`] || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {customerPlans[0].assistantProjects?.map((project, idx) => (
                          <TableRow key={`assistant-${idx}`}>
                            <TableCell>{project.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300">辅助</Badge>
                            </TableCell>
                            <TableCell className="text-center text-gray-500">{project.suggestedCount || '-'}</TableCell>
                            <TableCell className="text-center font-medium text-green-700">
                              {customerPlans[0].actualCounts?.[`assistant_${project.name}`] || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Service Records */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">服务记录</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddRecord(!showAddRecord);
                      setShowProjectDropdown(false);
                    }}
                  >
                    {showAddRecord ? '取消添加' : '添加记录'}
                  </Button>
                </div>

                {showAddRecord && (
                  <Card className="mb-4 bg-gray-50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">日期</label>
                          <Input
                            type="date"
                            value={newRecord.date}
                            onChange={(e) => setNewRecord((prev) => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">次数</label>
                          <Input
                            type="number"
                            min={1}
                            value={newRecord.count}
                            onChange={(e) => setNewRecord((prev) => ({ ...prev, count: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="col-span-2" ref={projectDropdownRef}>
                          <label className="text-sm text-gray-500">服务项目</label>
                          {getAvailableProjects().length > 0 ? (
                            <div className="relative">
                              <div
                                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer flex justify-between items-center hover:border-green-400"
                              >
                                <span className={newRecord.project ? 'text-gray-900' : 'text-gray-400'}>
                                  {newRecord.project || '请选择服务项目'}
                                </span>
                                <span className="text-gray-400">▼</span>
                              </div>
                              {showProjectDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {getAvailableProjects().map((project, idx) => {
                                    const isDisabled = project.remaining <= 0 && project.actualCount > 0;
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => {
                                          if (!isDisabled) {
                                            setNewRecord((prev) => ({ ...prev, project: project.name }));
                                            setShowProjectDropdown(false);
                                          }
                                        }}
                                        className={`px-3 py-2 flex justify-between items-center cursor-pointer transition-colors ${
                                          isDisabled
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'hover:bg-green-50'
                                        } ${newRecord.project === project.name ? 'bg-green-100' : ''}`}
                                      >
                                        <div className="flex-1">
                                          <span className={isDisabled ? '' : 'text-gray-900'}>{project.name}</span>
                                          <span className="ml-2 text-xs text-gray-500">
                                            ({project.type === 'core' ? '核心' : '辅助'})
                                          </span>
                                        </div>
                                        <div className="text-right text-sm">
                                          {project.actualCount > 0 ? (
                                            <span className={isDisabled ? 'text-red-500' : 'text-green-700 font-medium'}>
                                              剩余{project.remaining}次
                                            </span>
                                          ) : (
                                            <span className="text-gray-500">(无次数限制)</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Input
                              placeholder="如：骨盆修复"
                              value={newRecord.project}
                              onChange={(e) => setNewRecord((prev) => ({ ...prev, project: e.target.value }))}
                            />
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm text-gray-500">备注</label>
                          <Input
                            placeholder="可选"
                            value={newRecord.remark}
                            onChange={(e) => setNewRecord((prev) => ({ ...prev, remark: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={handleAddServiceRecord}>保存记录</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {loadingRecords ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : serviceRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无服务记录</div>
                ) : (
                  <div className="space-y-3">
                    {serviceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{record.records[0]?.value || '-'}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(record.visitDate)} · {record.visitCount}次
                            {record.notes && ` · ${record.notes}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteServiceRecord(record.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t flex justify-end gap-3">
                <Button
                  onClick={() => handleStartAnalysis(selectedCustomer)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  继续分析
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="!max-w-[500px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>报告记录 - {selectedCustomer?.name || ''}</DialogTitle>
          </DialogHeader>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : reportList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无报告记录</div>
          ) : (
            <div className="space-y-3">
              {reportList.map((report, index) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-sm text-gray-900 font-medium mt-1">
                        {selectedCustomer?.name}_{new Date(report.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}_报告
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        report.images && report.images.length > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        已保存
                      </span>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          查看
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
