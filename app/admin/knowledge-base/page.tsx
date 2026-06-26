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
  Download,
  RefreshCw,
  FileSpreadsheet,
  Sparkles,
  CheckCircle,
} from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface KnowledgeItem {
  id: string;
  project: string;
  manifestation: string;
  pairingEffect: string | null;
  symptom: string | null;
  pairingItem: string | null;
  pairingReason: string | null;
  carePlan: string | null;
  effectEstimation: string | null;
  embedding: number[] | null;
  createdAt: string;
}

interface FormData {
  project: string;
  manifestation: string;
  pairingEffect: string;
  symptom: string;
  pairingItem: string;
  pairingReason: string;
  carePlan: string;
  effectEstimation: string;
}

const emptyForm: FormData = {
  project: '',
  manifestation: '',
  pairingEffect: '',
  symptom: '',
  pairingItem: '',
  pairingReason: '',
  carePlan: '',
  effectEstimation: '',
};

function truncate(text: string | null, len: number): string {
  if (!text) return '-';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

export default function AdminKnowledgeBasePage() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteItem, setDeleteItem] = useState<KnowledgeItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  const [generatingEmbedding, setGeneratingEmbedding] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState<{ total: number; done: number } | null>(null);

  useEffect(() => {
    loadKnowledge();
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

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      const url = searchKeyword.trim()
        ? `/api/admin/knowledge-base?keyword=${encodeURIComponent(searchKeyword.trim())}`
        : '/api/admin/knowledge-base';
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.list || [];
      setKnowledge(list);
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed to load knowledge base:', e);
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

  const openEditDialog = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      project: item.project || '',
      manifestation: item.manifestation || '',
      pairingEffect: item.pairingEffect || '',
      symptom: item.symptom || '',
      pairingItem: item.pairingItem || '',
      pairingReason: item.pairingReason || '',
      carePlan: item.carePlan || '',
      effectEstimation: item.effectEstimation || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.project.trim() || !formData.manifestation.trim()) {
      showToast('error', '项目和表现不能为空');
      return;
    }
    try {
      setSubmitting(true);
      let res;
      if (editingItem) {
        res = await fetch(`/api/admin/knowledge-base/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/admin/knowledge-base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      if (res.ok) {
        setDialogOpen(false);
        showToast('success', editingItem ? '已更新' : '已添加');
        loadKnowledge();
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
      const res = await fetch(`/api/admin/knowledge-base/${deleteItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('success', '删除成功');
        setDeleteItem(null);
        loadKnowledge();
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
    if (selectedIds.length === knowledge.length && knowledge.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(knowledge.map((k) => k.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBatchDeleting(true);
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('success', data.message || '批量删除成功');
        setBatchDeleteOpen(false);
        loadKnowledge();
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
      const res = await fetch('/api/admin/knowledge-base?action=template');
      if (!res.ok) throw new Error('模板下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '知识库导入模板.xlsx';
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
      const res = await fetch('/api/admin/knowledge-base?action=export-xlsx');
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `知识库-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.download = filename;
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/admin/knowledge-base/import', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('success', data.message || '导入成功');
        setImportOpen(false);
        setImportFile(null);
        loadKnowledge();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || '导入失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    try {
      setGeneratingEmbedding(true);
      setEmbeddingProgress(null);

      const res = await fetch('/api/admin/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-embeddings' }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || '向量生成完成');
        loadKnowledge();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || '生成向量失败');
      }
    } catch (e) {
      console.error(e);
      showToast('error', '生成向量失败');
    } finally {
      setGeneratingEmbedding(false);
      setEmbeddingProgress(null);
    }
  };

  const filteredKnowledge = useMemo(() => {
    if (!searchKeyword.trim()) return knowledge;
    const kw = searchKeyword.trim().toLowerCase();
    return knowledge.filter(
      (k) =>
        (k.project || '').toLowerCase().includes(kw) ||
        (k.manifestation || '').toLowerCase().includes(kw) ||
        (k.pairingItem || '').toLowerCase().includes(kw) ||
        (k.symptom || '').toLowerCase().includes(kw) ||
        (k.carePlan || '').toLowerCase().includes(kw) ||
        (k.pairingReason || '').toLowerCase().includes(kw) ||
        (k.effectEstimation || '').toLowerCase().includes(kw)
    );
  }, [knowledge, searchKeyword]);

  const pagination = useDataTablePagination(filteredKnowledge, 10);
  const pagedKnowledge = pagination.pagedItems;

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
          <h2 className="text-2xl font-bold text-gray-900">知识库管理</h2>
          <p className="text-gray-500 mt-1 text-sm">
            管理产后健康调理知识，支持搜索、导入、导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadKnowledge} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            添加知识
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索项目、症状、搭配项目、调理规划..."
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
            setTimeout(loadKnowledge, 0);
          }}
        >
          重置
        </Button>
        <div className="h-6 w-px bg-gray-200 mx-1" />
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="h-4 w-4 mr-1.5" />
          批量导入
        </Button>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          下载模板
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls,.xlsm"
          style={{ display: 'none' }}
        />
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      knowledge.length > 0 &&
                      selectedIds.length === knowledge.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 w-[15%]">项目</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[25%]">表现</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[20%]">搭配效果</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[12%]">搭配项目</TableHead>
                <TableHead className="font-semibold text-gray-700 w-[10%] text-center">向量</TableHead>
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
              ) : pagedKnowledge.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    {searchKeyword ? '未找到匹配的知识条目' : '暂无数据，点击右上角"添加知识"开始创建'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedKnowledge.map((kb) => (
                  <TableRow key={kb.id} className="hover:bg-gray-50 align-top">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(kb.id)}
                        onCheckedChange={() => toggleSelect(kb.id)}
                        aria-label="选择"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900 truncate" title={kb.project}>
                        {kb.project || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="text-sm text-gray-700 truncate"
                        title={kb.manifestation || ''}
                      >
                        {truncate(kb.manifestation, 30)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="text-sm text-gray-700 truncate"
                        title={kb.pairingEffect || ''}
                      >
                        {truncate(kb.pairingEffect, 30)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 truncate"
                        title={kb.pairingItem || ''}
                      >
                        {kb.pairingItem || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {kb.embedding ? (
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
                          onClick={() => openEditDialog(kb)}
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteItem(kb)}
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

      {/* 添加 / 编辑 弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑知识' : '添加知识'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="project">
                  项目 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="例如：产后熏蒸"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pairingItem">搭配项目</Label>
                <Input
                  id="pairingItem"
                  value={formData.pairingItem}
                  onChange={(e) => setFormData({ ...formData, pairingItem: e.target.value })}
                  placeholder="例如：满月发汗"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manifestation">
                表现 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="manifestation"
                value={formData.manifestation}
                onChange={(e) => setFormData({ ...formData, manifestation: e.target.value })}
                placeholder="描述症状表现"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="symptom">症状</Label>
              <Textarea
                id="symptom"
                value={formData.symptom}
                onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
                placeholder="描述相关症状"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pairingEffect">搭配效果</Label>
              <Textarea
                id="pairingEffect"
                value={formData.pairingEffect}
                onChange={(e) => setFormData({ ...formData, pairingEffect: e.target.value })}
                placeholder="描述搭配效果"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pairingReason">搭配原因</Label>
              <Textarea
                id="pairingReason"
                value={formData.pairingReason}
                onChange={(e) => setFormData({ ...formData, pairingReason: e.target.value })}
                placeholder="说明搭配原因"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carePlan">调理规划</Label>
              <Textarea
                id="carePlan"
                value={formData.carePlan}
                onChange={(e) => setFormData({ ...formData, carePlan: e.target.value })}
                placeholder="调理规划建议"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="effectEstimation">效果预估</Label>
              <Textarea
                id="effectEstimation"
                value={formData.effectEstimation}
                onChange={(e) => setFormData({ ...formData, effectEstimation: e.target.value })}
                placeholder="预估调理效果"
                rows={2}
              />
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

      {/* 单条删除确认 */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识「{deleteItem?.project}」吗？此操作无法撤销。
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

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条知识数据吗？此操作无法撤销。
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

      {/* 批量导入确认 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="!max-w-[700px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>批量导入知识库</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              已选择文件：
              <span className="font-medium text-gray-900">{importFile?.name}</span>
            </div>
            <div className="bg-gray-50 rounded-md border border-gray-200 p-3 text-xs leading-relaxed text-gray-600">
              文件格式要求：
              <br />• 支持 Excel（.xlsx、.xls）或 CSV（.csv）
              <br />• 第一行为表头
              <br />• 表头顺序（中文）：项目, 表现, 搭配效果, 症状, 搭配项目, 搭配原因, 调理规划, 效果预估
              <br />• 建议使用提供的模板，在 Excel 中编辑后直接上传
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              取消
            </Button>
            <Button onClick={handleImportConfirm} disabled={importing}>
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
