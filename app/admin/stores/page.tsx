'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Store, Phone, Lock, User, RefreshCw, Settings } from '@/lib/icons';
import { StoreForm } from './StoreForm';
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
    permissions: string | null;
  } | null;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
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
    setIsAddOpen(true);
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
        setIsAddOpen(false);
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

  const handleResetPassword = async (store: StoreItem) => {
    if (!confirm(`确定要重置门店"${store.storeName}"的登录密码吗？\n\n重置后密码为：123456\n\n请告知门店人员及时修改密码。`)) return;
    try {
      const res = await fetch(`/api/admin/stores/${store.id}/reset-password`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`密码已重置为：${data.defaultPassword}\n\n请告知门店人员及时修改。`);
      } else {
        const errData = await res.json();
        alert(errData.error || '重置失败');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('重置失败');
    }
  };

  // ========== 权限配置 ==========
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [permStore, setPermStore] = useState<StoreItem | null>(null);
  const [permList, setPermList] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);

  const PERM_OPTIONS = [
    { key: 'profile', label: '个人资料', desc: '修改个人信息、密码' },
    { key: 'customer_manage', label: '客户管理', desc: '客户档案管理' },
    { key: 'ai_analysis', label: 'AI分析', desc: '提交报告、AI分析报告' },
    { key: 'menstrual_chat', label: '月经助手', desc: '产品搭配、问答查询' },
    { key: 'short_video', label: '短视频助手', desc: '选题、脚本、内容创作' },
    { key: 'learning_center', label: '学习中心', desc: '学习资源观看' },
  ];

  const openPermDialog = (store: StoreItem) => {
    setPermStore(store);
    let perms: string[] = [];
    if (store.storeUser?.permissions) {
      try {
        perms = JSON.parse(store.storeUser.permissions);
      } catch {
        perms = [];
      }
    }
    setPermList(perms);
    setIsPermOpen(true);
  };

  const togglePerm = (key: string) => {
    setPermList((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const savePermissions = async () => {
    if (!permStore?.storeUser) return;
    setPermSaving(true);
    try {
      const res = await fetch(`/api/admin/store-users/${permStore.storeUser.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permList }),
      });
      if (res.ok) {
        // 本地更新数据
        setStores((prev) =>
          prev.map((s) =>
            s.id === permStore.id && s.storeUser
              ? { ...s, storeUser: { ...s.storeUser, permissions: JSON.stringify(permList) } }
              : s
          )
        );
        setIsPermOpen(false);
        alert('权限配置已保存');
      } else {
        const err = await res.json();
        alert(err.error || '保存失败');
      }
    } catch {
      alert('保存失败');
    } finally {
      setPermSaving(false);
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
          <DialogContent className="!max-w-[700px] !w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editingStore ? '编辑门店' : '添加新门店'}</DialogTitle>
            </DialogHeader>
            <StoreForm
              mode={editingStore ? 'edit' : 'add'}
              formData={formData}
              formErrors={formErrors}
              onFormChange={setFormData}
              onSubmit={editingStore ? handleEditSubmit : handleAddSubmit}
              onCancel={() => {
                setIsAddOpen(false);
                setEditingStore(null);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

        {/* 权限配置弹窗 */}
        <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
          <DialogContent className="!max-w-[520px] !w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                权限配置
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-500">
                门店：<span className="font-medium text-gray-700">{permStore?.storeName}</span>
              </p>
              <div className="space-y-2">
                {PERM_OPTIONS.map((opt) => {
                  const checked = permList.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerm(opt.key)}
                        className="mt-0.5 accent-purple-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 pt-1">
                已选 {permList.length} / {PERM_OPTIONS.length} 项功能
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsPermOpen(false)}>
                取消
              </Button>
              <Button onClick={savePermissions} disabled={permSaving}>
                {permSaving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                          onClick={() => openPermDialog(store)}
                          className="text-sm text-purple-600 hover:text-purple-700"
                          title="配置功能权限"
                        >
                          权限配置
                        </button>
                        <button
                          onClick={() => handleResetPassword(store)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                          title="重置登录密码"
                        >
                          重置密码
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
