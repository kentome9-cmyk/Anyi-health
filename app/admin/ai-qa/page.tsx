'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, MessageSquare, Eye, EyeOff, Search } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface QAItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  keywords: string[] | null;
  roleId: string | null;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
  role?: {
    id: string;
    name: string;
  } | null;
}

interface AIRole {
  id: string;
  name: string;
}

export default function AdminAIQAPage() {
  const [items, setItems] = useState<QAItem[]>([]);
  const [roles, setRoles] = useState<AIRole[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<QAItem | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    keywords: '',
    roleId: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<QAItem | null>(null);

  useEffect(() => {
    loadData();
  }, [filterRole, filterCategory]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole && filterRole !== ' ') params.set('roleId', filterRole);
      if (filterCategory && filterCategory !== ' ') params.set('category', filterCategory);

      const [itemsRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/ai-qa?${params.toString()}`),
        fetch('/api/admin/ai-roles'),
      ]);
      const itemsData = await itemsRes.json();
      const rolesData = await rolesRes.json();
      setItems(itemsData.list || []);
      setCategories(itemsData.categories || []);
      setRoles(rolesData.list || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = searchKeyword
    ? items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : items;

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      question: '',
      answer: '',
      category: '',
      keywords: '',
      roleId: '',
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (item: QAItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      category: item.category || '',
      keywords: (item.keywords || []).join(', '),
      roleId: item.roleId || '',
      isActive: item.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      alert('请填写问题和回答');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/ai-qa/${editingItem.id}`
        : '/api/admin/ai-qa';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question,
          answer: formData.answer,
          category: formData.category || null,
          keywords: formData.keywords
            ? formData.keywords.split(',').map((k) => k.trim()).filter(Boolean)
            : null,
          roleId: formData.roleId || null,
          isActive: formData.isActive,
        }),
      });

      if (res.ok) {
        await loadData();
        setShowDialog(false);
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-qa/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('删除失败');
    }
  };

  const handleToggleActive = async (item: QAItem) => {
    try {
      const res = await fetch(`/api/admin/ai-qa/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const pagination = useDataTablePagination(filteredItems, 10);
  const pagedItems = pagination.pagedItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">问答库管理</h2>
          <p className="text-gray-500">管理常见问题与回答，支持 AI 智能问答</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新增问答
        </Button>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索问题和回答..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="筛选角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">全部角色</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="筛选分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">全部分类</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-center">问题</TableHead>
                <TableHead className="text-center">回答</TableHead>
                <TableHead className="text-center">分类</TableHead>
                <TableHead className="text-center">角色</TableHead>
                <TableHead className="text-center">命中次数</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    暂无问答，点击上方按钮创建
                  </TableCell>
                </TableRow>
              ) : (
                pagedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="text-center max-w-xs">
                      <span className="text-gray-900 truncate block">{item.question}</span>
                    </TableCell>
                    <TableCell className="text-center max-w-xs">
                      <span className="text-gray-600 truncate block">{item.answer.slice(0, 50)}...</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {item.role?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {item.hitCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          item.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <Eye className="h-3 w-3" /> 启用
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> 禁用
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewItem(item)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && filteredItems.length > 10 && (
            <div className="p-4 border-t">
              <DataTablePagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑问答' : '新增问答'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">问题 *</label>
              <Textarea
                value={formData.question}
                onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="请输入常见问题"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">回答 *</label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                placeholder="请输入标准回答"
                rows={5}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">分类</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="如：产品咨询"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">关联角色</label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, roleId: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择角色（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">关键词</label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                用逗号分隔，用于更精准的问题匹配
              </p>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                placeholder="如：产后，护理，修复"
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">启用</label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看问答对话框 */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>问答详情</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">问题：</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-gray-900">
                  {viewItem.question}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">回答：</h4>
                <div className="bg-blue-50 p-3 rounded-lg text-gray-700 whitespace-pre-wrap">
                  {viewItem.answer}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {viewItem.category && (
                  <span>
                    <span className="font-medium">分类：</span>{viewItem.category}
                  </span>
                )}
                {viewItem.role?.name && (
                  <span>
                    <span className="font-medium">角色：</span>{viewItem.role.name}
                  </span>
                )}
                {viewItem.keywords && viewItem.keywords.length > 0 && (
                  <span>
                    <span className="font-medium">关键词：</span>{viewItem.keywords.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="!max-w-[500px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">确定要删除这个问答吗？此操作不可恢复。</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
