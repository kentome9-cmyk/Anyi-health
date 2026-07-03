'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Copy, CheckCheck, Search, Star, Trash2, ChevronLeft, ChevronRight,
  Filter, X, Upload, FileSpreadsheet, Globe
} from '@/lib/icons';
import { extractScriptMetadata, ScriptMetadata } from '@/lib/script-utils';

interface ScriptRecord {
  id: string;
  storeId: string;
  store?: { id: string; storeName: string };
  type: 'original' | 'rewrite' | 'material';
  topicTitle?: string | null;
  topicId?: string | null;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  isRecommended: boolean;
  isPublic: boolean;
  number?: string | null;
  direction?: string | null;
  subCategory?: string | null;
  createdAt: string;
}

interface Store {
  id: string;
  storeName: string;
}

export default function AdminAIScriptsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<ScriptRecord | null>(null);

  const [filters, setFilters] = useState({
    storeId: '',
    type: '',
    isRecommended: '',
    isPublic: '',
    minViews: '',
    keyword: '',
    direction: '',
    subCategory: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    loadScripts();
  }, [page, filters]);

  const loadStores = async () => {
    try {
      const res = await fetch('/api/admin/stores');
      const data = await res.json();
      setStores(data.stores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadScripts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.storeId) params.set('storeId', filters.storeId);
      if (filters.type) params.set('type', filters.type);
      if (filters.isRecommended) params.set('isRecommended', filters.isRecommended);
      if (filters.isPublic) params.set('isPublic', filters.isPublic);
      if (filters.minViews) params.set('minViews', filters.minViews);
      if (filters.keyword) params.set('keyword', filters.keyword);
      if (filters.direction) params.set('direction', filters.direction);
      if (filters.subCategory) params.set('subCategory', filters.subCategory);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const res = await fetch(`/api/admin/ai-scripts?${params}`);
      const data = await res.json();
      setScripts(data.scripts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRecommend = async (script: ScriptRecord) => {
    const action = script.isRecommended ? 'unrecommend' : 'recommend';
    try {
      await fetch(`/api/admin/ai-scripts/${script.id}?action=${action}`, { method: 'PUT' });
      setScripts(prev => prev.map(s =>
        s.id === script.id ? { ...s, isRecommended: !s.isRecommended } : s
      ));
      if (selectedScript?.id === script.id) {
        setSelectedScript({ ...selectedScript, isRecommended: !script.isRecommended });
      }
    } catch (error) {
      console.error('Failed to update recommendation:', error);
    }
  };

  const handlePublish = async (script: ScriptRecord) => {
    const action = script.isPublic ? 'unpublish' : 'publish';
    try {
      await fetch(`/api/admin/ai-scripts/${script.id}?action=${action}`, { method: 'PUT' });
      setScripts(prev => prev.map(s =>
        s.id === script.id ? { ...s, isPublic: !script.isPublic } : s
      ));
      if (selectedScript?.id === script.id) {
        setSelectedScript({ ...selectedScript, isPublic: !script.isPublic });
      }
    } catch (error) {
      console.error('Failed to update public status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条脚本记录吗？')) return;
    try {
      await fetch(`/api/admin/ai-scripts/${id}`, { method: 'DELETE' });
      setScripts(prev => prev.filter(s => s.id !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小超过限制，最大允许 10 MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/ai-scripts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || `成功导入 ${data.created} 条脚本`);
        await loadScripts();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('导入失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const clearFilters = () => {
    setFilters({
      storeId: '',
      type: '',
      isRecommended: '',
      isPublic: '',
      minViews: '',
      keyword: '',
      direction: '',
      subCategory: '',
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const extractTopicDirection = (content: string) => {
    const summaryMatch = content.match(/【内容摘要】([\s\S]*?)(?=【切入角度】|$)/);
    const angleMatch = content.match(/【切入角度】([\s\S]*?)$/);
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      angle: angleMatch ? angleMatch[1].trim() : '',
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'original':
        return <Badge variant="default" className="text-xs">原创</Badge>;
      case 'rewrite':
        return <Badge variant="secondary" className="text-xs">仿写</Badge>;
      case 'material':
        return <Badge className="bg-green-100 text-green-700 text-xs">素材</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            脚本库管理
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理所有脚本记录，支持文件批量导入，筛选和推荐优质内容</p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索选题、编号、方向、内容..."
                  value={filters.keyword}
                  onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1"
              >
                <Filter className="h-4 w-4" />
                筛选
                {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-white text-green-600 rounded text-xs">{Object.values(filters).filter(v => v).length}</span>}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  清除
                </Button>
              )}
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                导入文件
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t">
                <div>
                  <Label className="text-xs text-gray-500">门店</Label>
                  <Select value={filters.storeId} onValueChange={v => setFilters({ ...filters, storeId: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="全部门店" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部门店</SelectItem>
                      <SelectItem value="SYSTEM">系统素材</SelectItem>
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.storeName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">类型</Label>
                  <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="全部类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="original">原创</SelectItem>
                      <SelectItem value="rewrite">仿写</SelectItem>
                      <SelectItem value="material">素材</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">方向</Label>
                  <Input
                    placeholder="如：产后调理"
                    value={filters.direction}
                    onChange={e => setFilters({ ...filters, direction: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">子类</Label>
                  <Input
                    placeholder="如：盆底肌修复"
                    value={filters.subCategory}
                    onChange={e => setFilters({ ...filters, subCategory: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">推荐状态</Label>
                  <Select value={filters.isRecommended} onValueChange={v => setFilters({ ...filters, isRecommended: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="true">已推荐</SelectItem>
                      <SelectItem value="false">未推荐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">最低播放量</Label>
                  <Input
                    type="number"
                    placeholder="如: 1000"
                    value={filters.minViews}
                    onChange={e => setFilters({ ...filters, minViews: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{total}</span> 条记录
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadScripts}>
              刷新
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading || uploading ? (
              <div className="text-center py-12 text-gray-500">
                {uploading ? '正在导入文件...' : '加载中...'}
              </div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">暂无脚本记录</p>
                <p className="text-xs mt-1 text-gray-400">点击右上角"导入文件"开始添加</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-center">推荐</TableHead>
                      <TableHead className="w-[50px] text-center">公共</TableHead>
                      <TableHead className="w-[50px] text-center">类型</TableHead>
                      <TableHead className="w-[100px] text-center">方向</TableHead>
                      <TableHead className="w-[100px] text-center">子类</TableHead>
                      <TableHead className="w-[100px] text-center">门店</TableHead>
                      <TableHead className="w-[150px] text-center">选题</TableHead>
                      <TableHead className="w-[150px] text-center">内容摘要</TableHead>
                      <TableHead className="w-[70px] text-center">播放量</TableHead>
                      <TableHead className="w-[70px] text-center">日期</TableHead>
                      <TableHead className="w-[100px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scripts.map(script => {
                      const { summary, angle } = extractTopicDirection(script.content);
                      const isSystem = script.storeId === 'SYSTEM';
                      return (
                        <TableRow key={script.id} className={script.isPublic ? 'bg-blue-50/40' : script.isRecommended ? 'bg-yellow-50' : ''}>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleRecommend(script)}
                              className={`p-1 rounded ${script.isRecommended ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                              title={script.isRecommended ? '取消推荐' : '推荐'}
                            >
                              <Star className={`h-4 w-4 ${script.isRecommended ? 'fill-current' : ''}`} />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handlePublish(script)}
                              className={`p-1 rounded ${script.isPublic ? 'text-blue-500' : 'text-gray-300 hover:text-blue-500'}`}
                              title={script.isPublic ? '移出公共库' : '加入公共库'}
                            >
                              <Globe className={`h-4 w-4 ${script.isPublic ? 'fill-current' : ''}`} />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            {getTypeBadge(script.type)}
                          </TableCell>
                          <TableCell className="text-center">
                            {script.direction ? (
                              <Badge variant="outline" className="text-xs">{script.direction}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {script.subCategory ? (
                              <Badge className="text-xs bg-green-100 text-green-700">{script.subCategory}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs truncate max-w-[90px] block ${isSystem ? 'text-green-600 font-medium' : ''}`} title={isSystem ? '系统素材' : script.store?.storeName}>
                              {isSystem ? '系统素材' : script.store?.storeName || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate max-w-[140px] block" title={script.topicTitle || '-'}>
                              {script.topicTitle || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-gray-600 max-w-[140px]">
                              {script.type === 'material' ? (
                                <div className="truncate" title={script.content.slice(0, 100)}>
                                  {script.content.slice(0, 20)}...
                                </div>
                              ) : (
                                <>
                                  {summary && <div className="truncate" title={summary}>{summary.slice(0, 20)}...</div>}
                                  {angle && <div className="text-green-600 truncate" title={angle}>💡 {angle.slice(0, 15)}...</div>}
                                  {!summary && !angle && <span className="text-gray-400">-</span>}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={script.viewCount >= 1000 ? 'text-orange-600 font-medium' : ''}>
                              {script.viewCount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-gray-500">{formatDate(script.createdAt)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedScript(script)}
                                className="h-7 px-1 text-xs"
                              >
                                查看
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(script.id)}
                                className="h-7 px-1 text-xs text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
        disabled={uploading}
      />

      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>脚本详情</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeBadge(selectedScript.type)}
                {selectedScript.isRecommended && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    已推荐
                  </Badge>
                )}
                {selectedScript.isPublic && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    <Globe className="h-3 w-3 mr-1" />
                    已入公共库
                  </Badge>
                )}
                {selectedScript.number && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {selectedScript.number}
                  </span>
                )}
                {selectedScript.direction && (
                  <Badge variant="outline">{selectedScript.direction}</Badge>
                )}
                {selectedScript.subCategory && (
                  <Badge className="bg-green-100 text-green-700">{selectedScript.subCategory}</Badge>
                )}
              </div>
              {selectedScript.topicTitle && (
                <div>
                  <Label className="text-xs text-gray-500">选题/标题</Label>
                  <p className="text-sm font-medium">{selectedScript.topicTitle}</p>
                </div>
              )}
              {selectedScript.storeId !== 'SYSTEM' && selectedScript.store && (
                <div>
                  <Label className="text-xs text-gray-500">门店</Label>
                  <p className="text-sm">{selectedScript.store.storeName}</p>
                </div>
              )}
              {selectedScript.storeId === 'SYSTEM' && (
                <div>
                  <Label className="text-xs text-gray-500">来源</Label>
                  <p className="text-sm text-green-600">系统素材（管理员导入）</p>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-lg font-bold text-orange-600">{selectedScript.viewCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">播放量</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-lg font-bold">{selectedScript.likeCount}</p>
                  <p className="text-xs text-gray-500">点赞量</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-lg font-bold">{selectedScript.commentCount}</p>
                  <p className="text-xs text-gray-500">评论量</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-lg font-bold">{selectedScript.favoriteCount}</p>
                  <p className="text-xs text-gray-500">收藏量</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">脚本内容</Label>
                <div className="mt-1 max-h-[400px] overflow-y-auto">
                  {(() => {
                    const metadata: ScriptMetadata = extractScriptMetadata(selectedScript.content);
                    if (metadata.script || metadata.titleSuggestion || metadata.hashtags.length > 0) {
                      return (
                        <div className="space-y-3">
                          {metadata.titleSuggestion && (
                            <div className="bg-red-50 border border-red-100 rounded p-2">
                              <div className="text-[10px] font-medium text-red-600 mb-1">推荐标题</div>
                              <div className="text-xs text-red-800 font-medium">{metadata.titleSuggestion}</div>
                            </div>
                          )}
                          {metadata.script && (
                            <div className="bg-gray-900 text-gray-100 rounded p-3">
                              <div className="text-[10px] text-gray-400 mb-1">口播文案</div>
                              <div className="text-xs leading-5 whitespace-pre-wrap">{metadata.script}</div>
                            </div>
                          )}
                          {metadata.shootingTips.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded p-2">
                              <div className="text-[10px] font-medium text-blue-600 mb-1">拍摄要点</div>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {metadata.shootingTips.map((tip: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-blue-500 shrink-0">{idx + 1}.</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {metadata.editingTips.length > 0 && (
                            <div className="bg-purple-50 border border-purple-100 rounded p-2">
                              <div className="text-[10px] font-medium text-purple-600 mb-1">剪辑要点</div>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {metadata.editingTips.map((tip: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-purple-500 shrink-0">{idx + 1}.</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {metadata.hashtags.length > 0 && (
                            <div className="bg-green-50 border border-green-100 rounded p-2">
                              <div className="text-[10px] font-medium text-green-600 mb-1">推荐标签</div>
                              <div className="flex flex-wrap gap-1">
                                {metadata.hashtags.map((tag: string, idx: number) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-[2px] bg-green-100 text-green-700 rounded">{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {metadata.userNeeds && (
                            <div className="bg-amber-50 border border-amber-100 rounded p-2">
                              <div className="text-[10px] font-medium text-amber-600 mb-1">用户需求洞察</div>
                              <div className="text-xs text-gray-700 space-y-1">
                                {metadata.userNeeds.surface && <div><span className="text-amber-600">表层需求：</span>{metadata.userNeeds.surface}</div>}
                                {metadata.userNeeds.deep && <div><span className="text-amber-600">深层需求：</span>{metadata.userNeeds.deep}</div>}
                                {metadata.userNeeds.coreBenefit && <div><span className="text-amber-600">核心利益：</span>{metadata.userNeeds.coreBenefit}</div>}
                                {metadata.userNeeds.emotion && <div><span className="text-amber-600">情绪需求：</span>{metadata.userNeeds.emotion}</div>}
                                {metadata.userNeeds.resonance && <div><span className="text-amber-600">共鸣点：</span>{metadata.userNeeds.resonance}</div>}
                                {metadata.userNeeds.insight && <div><span className="text-amber-600">核心洞察：</span>{metadata.userNeeds.insight}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs leading-5 whitespace-pre-wrap">
                        {selectedScript.content}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
                <p className="text-xs text-gray-400">创建时间: {formatDateLong(selectedScript.createdAt)}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedScript.isPublic ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePublish(selectedScript)}
                    className={selectedScript.isPublic ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    {selectedScript.isPublic ? '移出公共库' : '加入公共库'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(selectedScript.content, selectedScript.id)}>
                    {copiedId === selectedScript.id ? <CheckCheck className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiedId === selectedScript.id ? '已复制' : '复制内容'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}