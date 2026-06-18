'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Eye, Trash2 } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface Customer {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  storeId: string;
  storeName: string;
  postpartumDays: number | null;
  planStatus: string | null;
  createdAt: string;
}

interface StoreOption {
  id: string;
  storeName: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, storesRes] = await Promise.all([
        fetch('/api/admin/customers?pageSize=100'),
        fetch('/api/admin/stores?pageSize=100'),
      ]);
      const customersData = await customersRes.json();
      const storesData = await storesRes.json();
      setCustomers(customersData.list || []);
      setStores(storesData.list || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          postpartumDays: formData.postpartumDays ? parseInt(formData.postpartumDays) : null,
          birthOrder: formData.birthOrder ? parseInt(formData.birthOrder) : null,
        }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          name: '', phone: '', age: '', storeId: '', postpartumDays: '',
          deliveryMethod: '', birthOrder: '', allergy: '', notes: '', password: '',
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个客户吗？')) return;
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(searchTerm) || customer.phone.includes(searchTerm)
  );

  const pagination = useDataTablePagination(filteredCustomers, 10);
  const pagedCustomers = pagination.pagedItems;

  const getPlanStatusStyle = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'active') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getPlanStatusText = (status: string | null) => {
    if (!status) return '暂无方案';
    if (status === 'completed') return '已完成';
    if (status === 'active') return '进行中';
    return status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">客户管理</h2>
          <p className="text-gray-500">管理所有客户信息</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加客户
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
            <DialogHeader>
              <DialogTitle>添加新客户</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号 *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">年龄</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeId">所属门店 *</Label>
                  <select
                    id="storeId"
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    required
                  >
                    <option value="">请选择门店</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.storeName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postpartumDays">产后天数</Label>
                  <Input
                    id="postpartumDays"
                    type="number"
                    value={formData.postpartumDays}
                    onChange={(e) => setFormData({ ...formData, postpartumDays: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">生产方式</Label>
                  <Input
                    id="deliveryMethod"
                    value={formData.deliveryMethod}
                    onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
                    placeholder="顺产/剖腹产"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthOrder">生产胎数</Label>
                  <Input
                    id="birthOrder"
                    type="number"
                    value={formData.birthOrder}
                    onChange={(e) => setFormData({ ...formData, birthOrder: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergy">过敏史</Label>
                  <Input
                    id="allergy"
                    value={formData.allergy}
                    onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <textarea
                  id="notes"
                  className="w-full p-2 border rounded-md text-sm h-20"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">登录密码（可选）</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="客户可通过手机号+密码登录"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索客户姓名或手机号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 客户列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">共 {filteredCustomers.length} 位客户</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700">客户姓名</TableHead>
                <TableHead className="font-medium text-gray-700">电话</TableHead>
                <TableHead className="font-medium text-gray-700">所属门店</TableHead>
                <TableHead className="font-medium text-gray-700">产后天数</TableHead>
                <TableHead className="font-medium text-gray-700">方案状态</TableHead>
                <TableHead className="font-medium text-gray-700">创建时间</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                pagedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{customer.name}</TableCell>
                    <TableCell className="text-gray-600">{customer.phone}</TableCell>
                    <TableCell className="text-gray-600">{customer.storeName}</TableCell>
                    <TableCell className="text-gray-600">{customer.postpartumDays || '-'} 天</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPlanStatusStyle(customer.planStatus)}`}>
                        {getPlanStatusText(customer.planStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/customers/${customer.id}`} className="text-sm text-gray-600 hover:text-gray-900">
                          查看客户
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
