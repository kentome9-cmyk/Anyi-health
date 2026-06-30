'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Copy, CheckCheck, Search, Star, Trash2, ChevronLeft, ChevronRight,
  Filter, X, Upload, Library, Pencil, Globe
} from '@/lib/icons';

interface ScriptRecord {
  id: string;
  storeId: string;
  store?: { id: string; storeName: string };
  type: 'original' | 'rewrite';
  topicTitle?: string | null;
  topicId?: string | null;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  isRecommended: boolean;
  isPublic: boolean;
  createdAt: string;
}

interface ScriptMaterial {
  id: string;
  title: string;
  content: string;
  source: string | null;
  category: string | null;
  uploadedById: string | null;
  uploader?: { id: string; name: string | null; username: string } | null;
  rewrites?: { id: string; topicTitle: string | null; viewCount: number; likeCount: number; createdAt: string; store: { id: string; storeName: string } }[];
  createdAt: string;
}

interface Store {
  id: string;
  storeName: string;
}

export default function AdminAIScriptsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'scripts' | 'materials'>('scripts');

  // 脚本库
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<ScriptRecord | null>(null);

  // 素材库
  const [materials, setMaterials] = useState<ScriptMaterial[]>([]);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ScriptMaterial | null>(null);
  const [materialForm, setMaterialForm] = useState({ title: '', content: '', source: '', category: '' });
  const [viewingMaterial, setViewingMaterial] = useState<ScriptMaterial | null>(null);
  const [materialKeyword, setMaterialKeyword] = useState('');

  // 筛选条件
  const [filters, setFilters] = useState({
    storeId: '',
    type: '',
    isRecommended: '',
    isPublic: '',
    minViews: '',
    keyword: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 分页
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (tab === 'scripts') {
      loadScripts();
    } else {
      loadMaterials();
    }
  }, [page, filters, tab, materialKeyword]);

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

  const loadMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const params = new URLSearchParams();
      if (materialKeyword) params.set('keyword', materialKeyword);
      params.set('page', '1');
      params.set('pageSize', '50');
      const res = await fetch(`/api/admin/script-materials?${params}`);
      const data = await res.json();
      setMaterials(data.items || []);
      setMaterialsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setMaterialsLoading(false);
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
        s.id === script.id ? { ...s, isPublic: !s.isPublic } : s
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

  // 素材相关操作
  const openCreateMaterial = () => {
    setEditingMaterial(null);
    setMaterialForm({ title: '', content: '', source: '', category: '' });
    setMaterialDialogOpen(true);
  };

  const openEditMaterial = (m: ScriptMaterial) => {
    setEditingMaterial(m);
    setMaterialForm({
      title: m.title,
      content: m.content,
      source: m.source || '',
      category: m.category || '',
    });
    setMaterialDialogOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!materialForm.title.trim() || !materialForm.content.trim()) {
      alert('请填写标题和内容');
      return;
    }
    try {
      const url = editingMaterial
        ? `/api/admin/script-materials/${editingMaterial.id}`
        : '/api/admin/script-materials';
      const method = editingMaterial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialForm),
      });
      if (res.ok) {
        setMaterialDialogOpen(false);
        await loadMaterials();
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save material:', error);
      alert('保存失败');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('确定要删除这个素材吗？相关的脚本关联会被解除。')) return;
    try {
      await fetch(`/api/admin/script-materials/${id}`, { method: 'DELETE' });
      await loadMaterials();
    } catch (error) {
      console.error('Failed to delete material:', error);
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

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6">
        {/* 页面标题 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            脚本库管理
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理所有门店的脚本记录，筛选和推荐优质内容</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'scripts' | 'materials'); setPage(1); }}>
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="scripts">
              <FileText className="h-4 w-4" />
              脚本库
            </TabsTrigger>
            <TabsTrigger value="materials">
              <Library className="h-4 w-4" />
              素材库
            </TabsTrigger>
          </TabsList>

          {/* 脚本库 Tab */}
          <TabsContent value="scripts">
            {/* 搜索和筛选栏 */}
            <Card className="mb-4">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索选题或内容..."
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
                </div>

                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t">
                    <div>
                      <Label className="text-xs text-gray-500">门店</Label>
                      <Select value={filters.storeId} onValueChange={v => setFilters({ ...filters, storeId: v })}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="全部门店" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部门店</SelectItem>
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
                        </SelectContent>
                      </Select>
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
                      <Label className="text-xs text-gray-500">公共库</Label>
                      <Select value={filters.isPublic} onValueChange={v => setFilters({ ...filters, isPublic: v })}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="全部" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="true">已入公共库</SelectItem>
                          <SelectItem value="false">未入公共库</SelectItem>
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

            {/* 统计信息 */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                共 <span className="font-medium text-gray-900">{total}</span> 条记录
              </p>
              <Button variant="outline" size="sm" onClick={loadScripts}>
                刷新
              </Button>
            </div>

            {/* 表格 */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">加载中...</div>
                ) : scripts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">暂无脚本记录</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] text-center">推荐</TableHead>
                          <TableHead className="w-[50px] text-center">公共</TableHead>
                          <TableHead className="w-[100px] text-center">门店</TableHead>
                          <TableHead className="w-[50px] text-center">类型</TableHead>
                          <TableHead className="w-[120px] text-center">选题</TableHead>
                          <TableHead className="w-[150px] text-center">内容摘要</TableHead>
                          <TableHead className="w-[70px] text-center">播放量</TableHead>
                          <TableHead className="w-[70px] text-center">点赞量</TableHead>
                          <TableHead className="w-[70px] text-center">评论量</TableHead>
                          <TableHead className="w-[70px] text-center">收藏量</TableHead>
                          <TableHead className="w-[130px] text-center">日期</TableHead>
                          <TableHead className="w-[100px] text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scripts.map(script => {
                          const { summary, angle } = extractTopicDirection(script.content);
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
                                <span className="text-xs truncate max-w-[90px] block" title={script.store?.storeName}>
                                  {script.store?.storeName || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={script.type === 'original' ? 'default' : 'secondary'} className="text-xs">
                                  {script.type === 'original' ? '原创' : '仿写'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm truncate max-w-[110px] block" title={script.topicTitle || '-'}>
                                  {script.topicTitle || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-gray-600 max-w-[140px]">
                                  {summary && <div className="truncate" title={summary}>{summary.slice(0, 20)}...</div>}
                                  {angle && <div className="text-green-600 truncate" title={angle}>💡 {angle.slice(0, 15)}...</div>}
                                  {!summary && !angle && <span className="text-gray-400">-</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={script.viewCount >= 1000 ? 'text-orange-600 font-medium' : ''}>
                                  {script.viewCount.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{script.likeCount}</TableCell>
                              <TableCell className="text-center">{script.commentCount}</TableCell>
                              <TableCell className="text-center">{script.favoriteCount}</TableCell>
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

            {/* 分页 */}
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
          </TabsContent>

          {/* 素材库 Tab */}
          <TabsContent value="materials">
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索素材标题、内容、来源..."
                  value={materialKeyword}
                  onChange={e => setMaterialKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  共 <span className="font-medium text-gray-900">{materialsTotal}</span> 个素材
                </span>
                <Button onClick={openCreateMaterial} className="gap-1">
                  <Upload className="h-4 w-4" />
                  上传素材
                </Button>
              </div>
            </div>

            {materialsLoading ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">加载中...</CardContent>
              </Card>
            ) : materials.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Library className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">暂无素材</p>
                  <p className="text-xs mt-1 text-gray-400">点击右上角"上传素材"开始添加</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {materials.map(m => (
                  <Card key={m.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-1 flex-1" title={m.title}>
                          {m.title}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => setViewingMaterial(m)} className="h-6 px-2 text-xs">
                            查看
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditMaterial(m)} className="h-6 px-2 text-xs">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(m.id)} className="h-6 px-2 text-xs text-red-500 hover:text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3 mb-3" title={m.content}>
                        {m.content.slice(0, 200)}{m.content.length > 200 ? '...' : ''}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                          {m.source && <span className="truncate max-w-[120px]" title={m.source}>来源: {m.source}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {(m.rewrites?.length ?? 0) > 0 && (
                            <span className="text-green-600">已被改写 {m.rewrites!.length} 次</span>
                          )}
                          <span>{formatDate(m.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 脚本详情弹窗 */}
      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>脚本详情</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={selectedScript.type === 'original' ? 'default' : 'secondary'}>
                  {selectedScript.type === 'original' ? '原创' : '仿写'}
                </Badge>
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
              </div>
              {selectedScript.topicTitle && (
                <div>
                  <Label className="text-xs text-gray-500">选题</Label>
                  <p className="text-sm font-medium">{selectedScript.topicTitle}</p>
                </div>
              )}
              {selectedScript.store && (
                <div>
                  <Label className="text-xs text-gray-500">门店</Label>
                  <p className="text-sm">{selectedScript.store.storeName}</p>
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
                <div className="mt-1 bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {selectedScript.content}
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

      {/* 素材新建/编辑弹窗 */}
      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? '编辑素材' : '上传素材'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">素材标题 <span className="text-red-500">*</span></Label>
              <Input
                value={materialForm.title}
                onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })}
                placeholder="如：养生茶系列爆款拆解"
                className="mt-1"
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">来源（可选）</Label>
                <Input
                  value={materialForm.source}
                  onChange={e => setMaterialForm({ ...materialForm, source: e.target.value })}
                  placeholder="如：抖音@某某博主"
                  className="mt-1"
                  maxLength={255}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">分类（可选）</Label>
                <Input
                  value={materialForm.category}
                  onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  placeholder="如：养生茶、月子餐"
                  className="mt-1"
                  maxLength={100}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">素材内容 <span className="text-red-500">*</span></Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                粘贴原文脚本，门店可基于此内容进行改写
              </p>
              <Textarea
                value={materialForm.content}
                onChange={e => setMaterialForm({ ...materialForm, content: e.target.value })}
                placeholder="粘贴需要上传的原文脚本..."
                rows={12}
                className="mt-1 font-mono text-sm"
                maxLength={50000}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {materialForm.content.length} / 50000
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveMaterial}>{editingMaterial ? '保存' : '上传'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 素材详情弹窗 */}
      <Dialog open={!!viewingMaterial} onOpenChange={() => setViewingMaterial(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>素材详情</DialogTitle>
          </DialogHeader>
          {viewingMaterial && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-gray-900">{viewingMaterial.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  {viewingMaterial.source && <span>来源: {viewingMaterial.source}</span>}
                  {viewingMaterial.category && <Badge variant="outline" className="text-xs">{viewingMaterial.category}</Badge>}
                  {viewingMaterial.uploader && <span>· 上传: {viewingMaterial.uploader.name || viewingMaterial.uploader.username}</span>}
                  <span>· {formatDateLong(viewingMaterial.createdAt)}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">素材内容</Label>
                <div className="mt-1 bg-gray-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {viewingMaterial.content}
                </div>
              </div>
              {viewingMaterial.rewrites && viewingMaterial.rewrites.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">基于此素材的改写 ({viewingMaterial.rewrites.length})</Label>
                  <div className="mt-2 space-y-2">
                    {viewingMaterial.rewrites.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 truncate block">{r.topicTitle || '(无标题)'}</span>
                          <span className="text-gray-500">{r.store.storeName} · {formatDate(r.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 shrink-0 ml-2">
                          <span>播放 {r.viewCount.toLocaleString()}</span>
                          <span>点赞 {r.likeCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
