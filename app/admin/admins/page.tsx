'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Lock, RefreshCw, Users } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

interface AdminItem {
  id: string;
  username: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAdminsPage() {
  const { userId } = useAuthStore();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [resetting, setResetting] = useState<AdminItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormData({ username: '', name: '', password: '' });
    setError('');
    setIsAddOpen(true);
  };

  const openEdit = (admin: AdminItem) => {
    setEditing(admin);
    setFormData({
      username: admin.username,
      name: admin.name || '',
      password: '',
    });
    setError('');
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editing) {
        // 编辑只改姓名
        const res = await fetch(`/api/admin/admins/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '更新失败');
          return;
        }
      } else {
        // 新增
        const res = await fetch('/api/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '创建失败');
          return;
        }
      }
      setIsAddOpen(false);
      loadAdmins();
    } catch (err) {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (admin: AdminItem) => {
    if (admin.id === userId) {
      alert('不能删除自己');
      return;
    }
    if (admins.length <= 1) {
      alert('系统至少需要保留 1 个管理员');
      return;
    }
    if (!confirm(`确定删除管理员「${admin.name || admin.username}」？此操作不可恢复`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '删除失败');
        return;
      }
      loadAdmins();
    } catch (err) {
      alert('网络错误');
    }
  };

  const openReset = (admin: AdminItem) => {
    setResetting(admin);
    setNewPassword('');
    setError('');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/admins/${resetting.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '重置失败');
        return;
      }
      setResetting(null);
      setNewPassword('');
    } catch (err) {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理员账号</h2>
          <p className="text-gray-500">管理系统后台的管理员账号</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新增管理员
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            账号列表
          </CardTitle>
          <CardDescription>系统共 {admins.length} 个管理员账号</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">用户名</TableHead>
                  <TableHead className="text-center">姓名</TableHead>
                  <TableHead className="text-center">创建时间</TableHead>
                  <TableHead className="text-center">最近修改</TableHead>
                  <TableHead className="text-center w-[240px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="text-center font-mono text-sm">
                      {admin.username}
                      {admin.id === userId && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                          当前账号
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{admin.name || '-'}</TableCell>
                    <TableCell className="text-center text-gray-500 text-sm">
                      {new Date(admin.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-center text-gray-500 text-sm">
                      {new Date(admin.updatedAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(admin)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReset(admin)}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(admin)}
                          disabled={admin.id === userId}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="!max-w-[500px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑管理员' : '新增管理员'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={!!editing}
                required
                minLength={3}
                maxLength={100}
                placeholder="3-100 个字符"
              />
              {editing && (
                <p className="text-xs text-gray-500">用户名不可修改</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                maxLength={50}
                placeholder="选填，便于识别"
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="password">初始密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  maxLength={50}
                  placeholder="6-50 个字符"
                />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="!max-w-[500px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              重置密码
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-600">
              正在为「{resetting?.name || resetting?.username}」重置密码
            </p>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                placeholder="6-50 个字符"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetting(null)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '重置密码'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
