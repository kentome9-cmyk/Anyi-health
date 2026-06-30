'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Download,
  RefreshCw,
  FileSpreadsheet,
  Sparkles,
  CheckCircle,
} from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

type TabType = 'products' | 'healthPlans';

interface ProductItem {
  id: string;
  category: string;
  name: string;
  spec: string;
  price: string;
  ingredients: string;
  effects: string;
  targetAudience: string;
  usage: string;
  embedding: number[] | null;
  createdAt: string;
}

interface HealthPlanItem {
  id: string;
  type: string;
  targetAudience: string;
  productCombo: string;
  usage: string;
  embedding: number[] | null;
  createdAt: string;
}

interface ProductFormData {
  category: string;
  name: string;
  spec: string;
  price: string;
  ingredients: string;
  effects: string;
  targetAudience: string;
  usage: string;
}

interface HealthPlanFormData {
  type: string;
  targetAudience: string;
  productCombo: string;
  usage: string;
}

const emptyProductForm: ProductFormData = {
  category: '',
  name: '',
  spec: '',
  price: '',
  ingredients: '',
  effects: '',
  targetAudience: '',
  usage: '',
};

const emptyHealthPlanForm: HealthPlanFormData = {
  type: '',
  targetAudience: '',
  productCombo: '',
  usage: '',
};

const productCategories = [
  '私护产品系列',
  '足浴泡脚系列',
  '膏方食养系列',
  '养生茶饮系列',
  '皮肤调理系列',
  '营养补充系列',
  '其他',
];

function truncate(text: string | null, len: number): string {
  if (!text) return '-';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

export default function AdminMenstrualKnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('products');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [healthPlans, setHealthPlans] = useState<HealthPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<HealthPlanItem | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm);
  const [planForm, setPlanForm] = useState<HealthPlanFormData>(emptyHealthPlanForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [generatingEmbedding, setGeneratingEmbedding] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [autoGenerateEmbedding, setAutoGenerateEmbedding] = useState(true);
  const [embeddingFields, setEmbeddingFields] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const productEmbeddingFieldOptions = [
    { value: 'category', label: '产品分类' },
    { value: 'name', label: '产品名称' },
    { value: 'ingredients', label: '主要成分' },
    { value: 'effects', label: '产品功效' },
    { value: 'targetAudience', label: '适用人群' },
    { value: 'usage', label: '使用方式' },
  ];

  const planEmbeddingFieldOptions = [
    { value: 'type', label: '调理类型' },
    { value: 'targetAudience', label: '适用人群' },
    { value: 'productCombo', label: '推荐产品组合' },
    { value: 'usage', label: '使用方式' },
  ];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'products') {
      setEmbeddingFields(['name', 'category', 'effects', 'targetAudience']);
    } else {
      setEmbeddingFields(['type', 'targetAudience', 'productCombo']);
    }
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
  };

  const getApiBase = () => {
    return activeTab === 'products' ? '/api/admin/products' : '/api/admin/health-plans';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const url = searchKeyword.trim()
        ? `${getApiBase()}?keyword=${encodeURIComponent(searchKeyword.trim())}`
        : getApiBase();
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.list || [];

      if (activeTab === 'products') {
        setProducts(list);
      } else {
        setHealthPlans(list);
      }
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed to load data:', e);
      showToast('error', '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
    setTimeout(loadData, 0);
  };

  const openAddDialog = () => {
    if (activeTab === 'products') {
      setEditingProduct(null);
      setProductForm(emptyProductForm);
    } else {
      setEditingPlan(null);
      setPlanForm(emptyHealthPlanForm);
    }
    setDialogOpen(true);
  };

  const openEditDialog = (item: ProductItem | HealthPlanItem) => {
    if (activeTab === 'products') {
      const p = item as ProductItem;
      setEditingProduct(p);
      setProductForm({
        category: p.category || '',
        name: p.name || '',
        spec: p.spec || '',
        price: p.price || '',
        ingredients: p.ingredients || '',
        effects: p.effects || '',
        targetAudience: p.targetAudience || '',
        usage: p.usage || '',
      });
    } else {
      const h = item as HealthPlanItem;
      setEditingPlan(h);
      setPlanForm({
        type: h.type || '',
        targetAudience: h.targetAudience || '',
        productCombo: h.productCombo || '',
        usage: h.usage || '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (activeTab === 'products') {
      if (!productForm.category.trim() || !productForm.name.trim()) {
        showToast('error', '分类和产品名称不能为空');
        return;
      }
    } else {
      if (!planForm.type.trim()) {
        showToast('error', '调理类型不能为空');
        return;
      }
    }

    try {
      setSubmitting(true);
      let res;
      const body = activeTab === 'products' ? productForm : planForm;

      if (activeTab === 'products' ? editingProduct : editingPlan) {
        const id = activeTab === 'products' ? editingProduct!.id : editingPlan!.id;
        res = await fetch(`${getApiBase()}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(getApiBase(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        setDialogOpen(false);
        showToast('success', editingProduct || editingPlan ? '已更新' : '已添加');
        loadData();
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
      const res = await fetch(`${getApiBase()}/${deleteItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('success', '删除成功');
        setDeleteItem(null);
        loadData();
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
    const list = activeTab === 'products' ? products : healthPlans;
    if (selectedIds.length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((k) => k.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBatchDeleting(true);
      const res = await fetch(getApiBase(), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('success', data.message || '批量删除成功');
        setBatchDeleteOpen(false);
        loadData();
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

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${getApiBase()}?action=template`);
      if (!res.ok) throw new Error('模板下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeTab === 'products' ? '产品库导入模板.xlsx' : '调理方案导入模板.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', '模板下载成功');
    } catch (e) {
      console.error(e);
      showToast('error', '模板下载失败');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${getApiBase()}?action=export-xlsx`);
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = activeTab === 'products' ? `产品库-${dateStr}.xlsx` : `调理方案-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', '导出成功');
    } catch (e) {
      console.error(e);
      showToast('error', '导出失败');
    }
  };

  const toggleEmbeddingField = (field: string) => {
    setEmbeddingFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleImport = async () => {
    if (!importFile) {
      showToast('error', '请选择文件');
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('autoGenerateEmbedding', String(autoGenerateEmbedding));
      formData.append('embeddingFields', JSON.stringify(embeddingFields));

      const res = await fetch(`${getApiBase()}/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult({ success: true, message: data.message || '导入成功' });
        showToast('success', data.message || '导入成功');
        loadData();
      } else {
        setImportResult({ success: false, message: data.error || '导入失败' });
        showToast('error', data.error || '导入失败');
      }
    } catch (e) {
      console.error(e);
      setImportResult({ success: false, message: '导入失败，请检查文件格式' });
      showToast('error', '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportModalOpen(true);
  };

  const handleGenerateEmbeddings = async () => {
    try {
      setGeneratingEmbedding(true);

      const res = await fetch(getApiBase(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-embeddings' }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || '向量生成完成');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || '生成向量失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '生成向量失败');
    } finally {
      setGeneratingEmbedding(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchKeyword.trim()) return products;
    const kw = searchKeyword.trim().toLowerCase();
    return products.filter(
      (k) =>
        (k.category || '').toLowerCase().includes(kw) ||
        (k.name || '').toLowerCase().includes(kw) ||
        (k.ingredients || '').toLowerCase().includes(kw) ||
        (k.effects || '').toLowerCase().includes(kw) ||
        (k.targetAudience || '').toLowerCase().includes(kw) ||
        (k.usage || '').toLowerCase().includes(kw)
    );
  }, [products, searchKeyword]);

  const filteredPlans = useMemo(() => {
    if (!searchKeyword.trim()) return healthPlans;
    const kw = searchKeyword.trim().toLowerCase();
    return healthPlans.filter(
      (k) =>
        (k.type || '').toLowerCase().includes(kw) ||
        (k.targetAudience || '').toLowerCase().includes(kw) ||
        (k.productCombo || '').toLowerCase().includes(kw) ||
        (k.usage || '').toLowerCase().includes(kw)
    );
  }, [healthPlans, searchKeyword]);

  const filteredList = activeTab === 'products' ? filteredProducts : filteredPlans;
  const fullList = activeTab === 'products' ? products : healthPlans;

  const pagination = useDataTablePagination(filteredList as unknown[], 10);
  const pagedItems = pagination.pagedItems;

  const colSpan = activeTab === 'products' ? 8 : 6;

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
          <h2 className="text-2xl font-bold text-gray-900">月经知识库管理</h2>
          <p className="text-gray-500 mt-1 text-sm">
            管理产品库和调理方案，支持搜索、导入、导出、向量生成
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadData} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            {activeTab === 'products' ? '添加产品' : '添加方案'}
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            产品库
          </button>
          <button
            onClick={() => setActiveTab('healthPlans')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'healthPlans'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            调理方案库
          </button>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={activeTab === 'products' ? '搜索产品名称、分类、功效...' : '搜索调理类型、人群、产品组合...'}
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
            setTimeout(loadData, 0);
          }}
        >
          重置
        </Button>
        <div className="h-6 w-px bg-gray-200 mx-1" />
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          下载模板
        </Button>
        <Button variant="outline" onClick={openImportModal}>
          <Upload className="h-4 w-4 mr-1.5" />
          批量导入
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" />
          批量导出
        </Button>
        <Button
          variant="outline"
          onClick={handleGenerateEmbeddings}
          disabled={generatingEmbedding}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          {generatingEmbedding ? '生成中...' : '生成向量'}
        </Button>
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
                      fullList.length > 0 &&
                      selectedIds.length === fullList.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                {activeTab === 'products' ? (
                  <>
                    <TableHead className="font-semibold text-gray-700">分类</TableHead>
                    <TableHead className="font-semibold text-gray-700">产品名称</TableHead>
                    <TableHead className="font-semibold text-gray-700">规格</TableHead>
                    <TableHead className="font-semibold text-gray-700">产品功效</TableHead>
                    <TableHead className="font-semibold text-gray-700">适用人群</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">向量</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="font-semibold text-gray-700">调理类型</TableHead>
                    <TableHead className="font-semibold text-gray-700">适用人群</TableHead>
                    <TableHead className="font-semibold text-gray-700">推荐产品组合</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">向量</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-24 text-center text-gray-500">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-24 text-center text-gray-500">
                    {searchKeyword ? '未找到匹配的数据' : `暂无数据，点击右上角"${activeTab === 'products' ? '添加产品' : '添加方案'}"开始创建`}
                  </TableCell>
                </TableRow>
              ) : (
                pagedItems.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-gray-50 align-top">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label="选择"
                      />
                    </TableCell>
                    {activeTab === 'products' ? (
                      <>
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded bg-pink-100 text-pink-700 text-xs font-medium">
                            {item.category || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-gray-800" title={item.name || ''}>
                            {item.name || '-'}
                          </div>
                          {item.price && (
                            <div className="text-xs text-pink-600 mt-0.5">{item.price}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600" title={item.spec || ''}>
                            {truncate(item.spec, 10)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700" title={item.effects || ''}>
                            {truncate(item.effects, 25)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700" title={item.targetAudience || ''}>
                            {truncate(item.targetAudience, 30)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.embedding ? (
                            <span title="已生成向量"><CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" /></span>
                          ) : (
                            <span className="text-gray-300" title="未生成向量">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(item)}
                              title="编辑"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteItem({ id: item.id, name: item.name })}
                              title="删除"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">
                            {item.type || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700" title={item.targetAudience || ''}>
                            {truncate(item.targetAudience, 40)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700" title={item.productCombo || ''}>
                            {truncate(item.productCombo, 50)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.embedding ? (
                            <span title="已生成向量"><CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" /></span>
                          ) : (
                            <span className="text-gray-300" title="未生成向量">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(item)}
                              title="编辑"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteItem({ id: item.id, name: item.type })}
                              title="删除"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
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

      {/* 添加 / 编辑 弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'products'
                ? editingProduct ? '编辑产品' : '添加产品'
                : editingPlan ? '编辑方案' : '添加方案'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {activeTab === 'products' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="p-category">
                    产品分类 <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="p-category"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">请选择分类</option>
                    {productCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">
                      产品名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="p-name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="输入产品名称"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-spec">规格</Label>
                    <Input
                      id="p-spec"
                      value={productForm.spec}
                      onChange={(e) => setProductForm({ ...productForm, spec: e.target.value })}
                      placeholder="如：10片/盒"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-price">价格</Label>
                    <Input
                      id="p-price"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="如：168元"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-ingredients">主要成分</Label>
                  <Textarea
                    id="p-ingredients"
                    value={productForm.ingredients}
                    onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })}
                    placeholder="产品主要成分"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-effects">产品功效</Label>
                  <Textarea
                    id="p-effects"
                    value={productForm.effects}
                    onChange={(e) => setProductForm({ ...productForm, effects: e.target.value })}
                    placeholder="描述产品功效"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-target">适用人群</Label>
                  <Textarea
                    id="p-target"
                    value={productForm.targetAudience}
                    onChange={(e) => setProductForm({ ...productForm, targetAudience: e.target.value })}
                    placeholder="适用人群描述"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-usage">使用方式</Label>
                  <Textarea
                    id="p-usage"
                    value={productForm.usage}
                    onChange={(e) => setProductForm({ ...productForm, usage: e.target.value })}
                    placeholder="使用方法说明"
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="h-type">
                    调理类型 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="h-type"
                    value={planForm.type}
                    onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })}
                    placeholder="如：补气血（早晚组合）"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="h-target">适用人群</Label>
                  <Textarea
                    id="h-target"
                    value={planForm.targetAudience}
                    onChange={(e) => setPlanForm({ ...planForm, targetAudience: e.target.value })}
                    placeholder="适用人群描述"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="h-combo">推荐产品组合</Label>
                  <Textarea
                    id="h-combo"
                    value={planForm.productCombo}
                    onChange={(e) => setPlanForm({ ...planForm, productCombo: e.target.value })}
                    placeholder="产品组合及用量"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="h-usage">使用方式</Label>
                  <Textarea
                    id="h-usage"
                    value={planForm.usage}
                    onChange={(e) => setPlanForm({ ...planForm, usage: e.target.value })}
                    placeholder="使用方法说明"
                    rows={3}
                  />
                </div>
              </>
            )}
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

      {/* 单条删除确认 */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteItem?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量导入弹窗 */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="!max-w-[600px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              批量导入{activeTab === 'products' ? '产品' : '调理方案'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>上传文件</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  importFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                />
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                {importFile ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700">{importFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">点击上传文件</p>
                    <p className="text-xs text-gray-400 mt-1">支持 .xlsx, .xls, .csv 格式</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>导入后自动生成向量</Label>
                <button
                  type="button"
                  onClick={() => setAutoGenerateEmbedding(!autoGenerateEmbedding)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoGenerateEmbedding ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoGenerateEmbedding ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {autoGenerateEmbedding && (
              <div className="space-y-2">
                <Label>向量生成规则（选择用于生成向量的字段）</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(activeTab === 'products' ? productEmbeddingFieldOptions : planEmbeddingFieldOptions).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={embeddingFields.includes(opt.value)}
                        onCheckedChange={() => toggleEmbeddingField(opt.value)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  已选择 {embeddingFields.length} 个字段，系统将把这些字段的内容组合后生成向量
                </p>
              </div>
            )}

            {importResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  importResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {importResult.message}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setImportModalOpen(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条{activeTab === 'products' ? '产品' : '方案'}吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {batchDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
