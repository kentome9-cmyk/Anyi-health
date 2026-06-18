'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Store, Phone, Lock, User } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface StoreItem {
  id: string;
  storeName: string;
  description: string | null;
  address: string | null;
  contactPhone: string | null;
  status: boolean;
  expirationTime: string | null;
  createdAt: string;
  customerCount: number;
  planCount: number;
  storeUser: {
    id: string;
    phone: string;
    name: string | null;
  } | null;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    address: '',
    contactPhone: '',
    expirationTime: '',
    // 登录凭据
    userPhone: '',
    userPassword: '',
    userName: '',
  });

  // 手机号验证：支持11位中国大陆手机号，也支持座机（选填字段）
  const validatePhone = (phone: string, required: boolean = false): string => {
    if (!phone || !phone.trim()) {
      return required ? '请填写手机号' : '';
    }
    // 中国大陆手机号：1开头，10位数字
    const mobileRegex = /^1[3-9]\d{9}$/;
    if (!mobileRegex.test(phone.trim())) {
      return '手机号格式不正确（需为11位数字）';
    }
    return '';
  };

  // 密码验证：至少6位
  const validatePassword = (password: string, required: boolean = true): string => {
    if (!password || !password.trim()) {
      return required ? '请填写密码' : '';
    }
    if (password.trim().length < 6) {
      return '密码至少6位字符';
    }
    return '';
  };

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const res = await fetch('/api/admin/stores?pageSize=100');
      const data = await res.json();
      setStores(data.list || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      storeName: '',
      description: '',
      address: '',
      contactPhone: '',
      expirationTime: '',
      userPhone: '',
      userPassword: '',
      userName: '',
    });
    setFormErrors({});
  };

  // 验证表单（创建模式）
  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      errors.storeName = '请填写门店名称';
    }
    const userPhoneError = validatePhone(formData.userPhone, true);
    if (userPhoneError) errors.userPhone = userPhoneError;
    const userPasswordError = validatePassword(formData.userPassword, true);
    if (userPasswordError) errors.userPassword = userPasswordError;

    // 联系电话是选填的，如果填了就要验证
    if (formData.contactPhone) {
      const contactPhoneError = validatePhone(formData.contactPhone, false);
      if (contactPhoneError) errors.contactPhone = contactPhoneError;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 验证表单（编辑模式）
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      errors.storeName = '请填写门店名称';
    }
    // 编辑模式下如果填了手机号就要验证
    if (formData.userPhone) {
      const userPhoneError = validatePhone(formData.userPhone, false);
      if (userPhoneError) errors.userPhone = userPhoneError;
    }
    // 编辑模式下密码是选填的（留空则不修改）
    if (formData.userPassword) {
      const userPasswordError = validatePassword(formData.userPassword, false);
      if (userPasswordError) errors.userPassword = userPasswordError;
    }
    // 联系电话是选填的，如果填了就要验证
    if (formData.contactPhone) {
      const contactPhoneError = validatePhone(formData.contactPhone, false);
      if (contactPhoneError) errors.contactPhone = contactPhoneError;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm()) return;
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        resetForm();
        loadStores();
      } else {
        const errData = await res.json();
        alert(errData.error || '创建失败');
      }
    } catch (error) {
      console.error('Failed to create store:', error);
    }
  };

  const handleEdit = (store: StoreItem) => {
    setEditingStore(store);
    setFormData({
      storeName: store.storeName,
      description: store.description || '',
      address: store.address || '',
      contactPhone: store.contactPhone || '',
      expirationTime: store.expirationTime ? new Date(store.expirationTime).toISOString().split('T')[0] : '',
      userPhone: store.storeUser?.phone || '',
      userPassword: '',
      userName: store.storeUser?.name || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    if (!validateEditForm()) return;
    try {
      const res = await fetch(`/api/admin/stores/${editingStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsEditOpen(false);
        setEditingStore(null);
        resetForm();
        loadStores();
      } else {
        const errData = await res.json();
        alert(errData.error || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update store:', error);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm('确定要删除这个门店吗？关联的登录账号也会被删除。')) return;
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadStores();
      }
    } catch (error) {
      console.error('Failed to delete store:', error);
    }
  };

  const filteredStores = stores.filter((store) =>
    store.storeName.includes(searchTerm) ||
    (store.contactPhone?.includes(searchTerm) ?? false) ||
    (store.storeUser?.phone.includes(searchTerm) ?? false)
  );

  const pagination = useDataTablePagination(filteredStores, 10);
  const pagedStores = pagination.pagedItems;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">门店管理</h2>
          <p className="text-gray-500">管理门店信息及登录账号</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加门店
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-[500px] !w-[95vw]">
            <DialogHeader>
              <DialogTitle>添加新门店</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-5">
              {/* 门店信息 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  门店信息
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="storeName">门店名称 *</Label>
                    <Input
                      id="storeName"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    />
                    {formErrors.storeName && (
                      <p className="text-xs text-red-500">{formErrors.storeName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPhone">联系电话</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="选填，11位手机号"
                    />
                    {formErrors.contactPhone && (
                      <p className="text-xs text-red-500">{formErrors.contactPhone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expirationTime">服务到期时间</Label>
                    <Input
                      id="expirationTime"
                      type="date"
                      value={formData.expirationTime}
                      onChange={(e) => setFormData({ ...formData, expirationTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="address">门店地址</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="description">门店描述</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 登录凭据 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  登录账号（用于门店员工登录系统）
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="userPhone">登录手机号 *</Label>
                    <Input
                      id="userPhone"
                      value={formData.userPhone}
                      onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                      placeholder="11位手机号，用于登录后台"
                    />
                    {formErrors.userPhone && (
                      <p className="text-xs text-red-500">{formErrors.userPhone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="userPassword">初始密码 *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={formData.userPassword}
                      onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                      placeholder="至少6位"
                    />
                    {formErrors.userPassword && (
                      <p className="text-xs text-red-500">{formErrors.userPassword}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="userName">店长姓名</Label>
                    <Input
                      id="userName"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  取消
                </Button>
                <Button type="submit">创建门店</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 编辑弹窗 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="!max-w-[500px] !w-[95vw]">
            <DialogHeader>
              <DialogTitle>编辑门店</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* 门店信息 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  门店信息
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="editStoreName">门店名称 *</Label>
                    <Input
                      id="editStoreName"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    />
                    {formErrors.storeName && (
                      <p className="text-xs text-red-500">{formErrors.storeName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editContactPhone">联系电话</Label>
                    <Input
                      id="editContactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="选填，11位手机号"
                    />
                    {formErrors.contactPhone && (
                      <p className="text-xs text-red-500">{formErrors.contactPhone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editExpirationTime">服务到期时间</Label>
                    <Input
                      id="editExpirationTime"
                      type="date"
                      value={formData.expirationTime}
                      onChange={(e) => setFormData({ ...formData, expirationTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="editAddress">门店地址</Label>
                    <Input
                      id="editAddress"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="editDescription">门店描述</Label>
                    <Input
                      id="editDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 登录凭据 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  登录账号
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="editUserPhone">登录手机号</Label>
                    <Input
                      id="editUserPhone"
                      value={formData.userPhone}
                      onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                    />
                    {formErrors.userPhone && (
                      <p className="text-xs text-red-500">{formErrors.userPhone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editUserPassword">新密码</Label>
                    <Input
                      id="editUserPassword"
                      type="password"
                      value={formData.userPassword}
                      onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                      placeholder="留空则不修改"
                    />
                    {formErrors.userPassword && (
                      <p className="text-xs text-red-500">{formErrors.userPassword}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editUserName">店长姓名</Label>
                    <Input
                      id="editUserName"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    />
                  </div>
                </div>
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

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索门店名称、联系电话或登录手机号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 门店列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">共 {filteredStores.length} 家门店</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700">门店名称</TableHead>
                <TableHead className="font-medium text-gray-700">门店ID</TableHead>
                <TableHead className="font-medium text-gray-700">联系电话</TableHead>
                <TableHead className="font-medium text-gray-700">登录账号</TableHead>
                <TableHead className="font-medium text-gray-700">客户数量</TableHead>
                <TableHead className="font-medium text-gray-700">方案数量</TableHead>
                <TableHead className="font-medium text-gray-700">服务到期</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    暂无数据，点击上方"添加门店"创建第一家门店
                  </TableCell>
                </TableRow>
              ) : (
                pagedStores.map((store) => (
                  <TableRow key={store.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{store.storeName}</TableCell>
                    <TableCell className="text-gray-500 text-xs font-mono">{store.id}</TableCell>
                    <TableCell className="text-gray-600">{store.contactPhone || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{store.storeUser?.phone || '-'}</div>
                        {store.storeUser?.name && (
                          <div className="text-gray-500 text-xs mt-0.5">{store.storeUser.name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{store.customerCount}</TableCell>
                    <TableCell className="text-gray-600">{store.planCount}</TableCell>
                    <TableCell className="text-gray-600">
                      {store.expirationTime ? new Date(store.expirationTime).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleEdit(store)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          设置
                        </button>
                        <button
                          onClick={() => handleDelete(store.id)}
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
