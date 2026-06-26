'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  RefreshCw,
  FileText,
  Presentation,
} from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LearningResource {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string | null;
  content: string | null;
  filePath: string | null;
  pageCount: number | null;
  fileSize: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  category: string;
  description: string;
  file: File | null;
}

const emptyForm: FormData = {
  title: '',
  category: '',
  description: '',
  file: null,
};

const CATEGORIES = [
  { value: '培训课程', label: '培训课程' },
  { value: '产品知识', label: '产品知识' },
  { value: '营销技巧', label: '营销技巧' },
  { value: '服务规范', label: '服务规范' },
  { value: '行业资讯', label: '行业资讯' },
  { value: '其他', label: '其他' },
];

const TYPE_LABELS: Record<string, string> = {
  md: 'MD文档',
  ppt: 'PPT/PDF',
};

function truncate(text: string | null, len: number): string {
  if (!text) return '-';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

export default function AdminLearningResourcesPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningResource | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteItem, setDeleteItem] = useState<LearningResource | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
  };

  const loadResources = async () => {
    try {
      setLoading(true);
      let url = '/api/admin/learning-resources';
      const params: string[] = [];
      if (searchKeyword.trim()) {
        params.push(`keyword=${encodeURIComponent(searchKeyword.trim())}`);
      }
      if (filterCategory && filterCategory !== 'all') {
        params.push(`category=${encodeURIComponent(filterCategory)}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.list || [];
      setResources(list);
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed to load learning resources:', e);
      showToast('error', '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: LearningResource) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || '',
      description: item.description || '',
      file: null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.category.trim()) {
      showToast('error', '标题和分类不能为空');
      return;
    }

    if (!editingItem && !formData.file) {
      showToast('error', '请上传资源文件');
      return;
    }

    try {
      setSubmitting(true);

      const fileExt = formData.file?.name.split('.').pop()?.toLowerCase() || '';
      const uploadType = fileExt === 'md' ? 'md' : 'ppt';

      const formDataObj = new FormData();
      formDataObj.append('title', formData.title.trim());
      formDataObj.append('type', uploadType);
      formDataObj.append('category', formData.category);
      if (formData.description.trim()) {
        formDataObj.append('description', formData.description.trim());
      }
      if (formData.file) {
        formDataObj.append('file', formData.file);
      }

      let res;
      if (editingItem) {
        res = await fetch(`/api/admin/learning-resources/${editingItem.id}`, {
          method: 'PUT',
          body: formDataObj,
        });
      } else {
        res = await fetch('/api/admin/learning-resources', {
          method: 'POST',
          body: formDataObj,
        });
      }

      if (res.ok) {
        setDialogOpen(false);
        showToast('success', editingItem ? '已更新' : '已添加');
        loadResources();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || '保存失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleDelete = async () => {
    if (!deleteItem) return;
    try {
      const res = await fetch(`/api/admin/learning-resources/${deleteItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('success', '删除成功');
        setDeleteItem(null);
        loadResources();
      } else {
        showToast('error', '删除失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '删除失败');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === resources.length && resources.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resources.map((r) => r.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBatchDeleting(true);
      const res = await fetch('/api/admin/learning-resources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('success', data.message || '批量删除成功');
        setBatchDeleteOpen(false);
        loadResources();
      } else {
        showToast('error', '批量删除失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const filteredResources = useMemo(() => {
    if (!searchKeyword.trim() && filterCategory === 'all') return resources;
    const kw = searchKeyword.trim().toLowerCase();
    return resources.filter((r) => {
      const matchesKeyword = !kw ||
        (r.title || '').toLowerCase().includes(kw) ||
        (r.description || '').toLowerCase().includes(kw);
      const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
      return matchesKeyword && matchesCategory;
    });
  }, [resources, searchKeyword, filterCategory]);

  const pagination = useDataTablePagination(filteredResources, 10);
  const pagedResources = pagination.pagedItems;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] rounded-lg px-4 py-2 text-sm shadow-lg border ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">学习资源管理</h2>
          <p className="text-gray-500 mt-1 text-sm">
            管理门店学习中心资源，支持上传 MD 文档、PPT、PDF 等文件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadResources} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            上传资源
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索标题、描述..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          搜索
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSearchInput('');
            setSearchKeyword('');
            setFilterCategory('all');
            loadResources();
          }}
        >
          重置
        </Button>
        <div className="h-6 w-px bg-gray-200 mx-1" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="destructive"
          onClick={() => setBatchDeleteOpen(true)}
          disabled={selectedIds.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          批量删除 {selectedIds.length > 0 && `(${selectedIds.length})`}
        </Button>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      resources.length > 0 &&
                      selectedIds.length === resources.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 w-[8%]">类型</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[35%]">标题</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[12%]">分类</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[22%]">描述</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[15%]">文件信息</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[8%] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedResources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    {searchKeyword || filterCategory !== 'all' ? '未找到匹配的资源' : '暂无数据，点击右上角"上传资源"开始添加'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedResources.map((resource) => (
                  <TableRow key={resource.id} className="hover:bg-gray-50 align-top">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(resource.id)}
                        onCheckedChange={() => toggleSelect(resource.id)}
                        aria-label="选择"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {resource.type === 'md' ? (
                          <FileText className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Presentation className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="text-xs text-gray-600">{TYPE_LABELS[resource.type] || resource.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="font-medium text-gray-900 truncate" title={resource.title}>
                          {resource.title || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(38,93,71,0.1)] text-[#084531]">
                        {resource.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="text-sm text-gray-700"
                        title={resource.description || ''}
                      >
                        {truncate(resource.description, 40)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {resource.filePath ? (
                        <div className="text-xs text-gray-500">
                          <div>{resource.fileSize || '-'}</div>
                          {resource.pageCount && (
                            <div className="mt-0.5">{resource.pageCount} 页</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">无文件</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(resource)}
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteItem(resource)}
                          title="删除"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑学习资源' : '上传学习资源'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  标题 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入资源标题"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">
                  分类 <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简单描述资源内容"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">
                上传文件 {!editingItem && <span className="text-red-500">*</span>}
                {editingItem && <span className="text-xs text-gray-500 ml-1">(留空则不更换)</span>}
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  {formData.file ? (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">{formData.file.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(formData.file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : editingItem?.filePath ? (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">已上传文件</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {editingItem.fileSize}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">点击或拖拽上传文件</p>
                      <p className="text-xs text-gray-400 mt-1">支持 .md、.pptx、.ppt、.pdf 格式</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="file"
                    accept=".md,.pptx,.ppt,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file')?.click()}
                    className="mt-3"
                  >
                    选择文件
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资源「{deleteItem?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条学习资源吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {batchDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}