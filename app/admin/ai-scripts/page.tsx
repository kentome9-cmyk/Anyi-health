'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText, Copy, CheckCheck, Search, Star, Trash2, ChevronLeft, ChevronRight, Filter, X
} from '@/lib/icons';

interface ScriptRecord {
  id: string;
  storeId: string;
  store?: { id: string; name: string };
  type: 'original' | 'rewrite';
  topic?: string;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  rewriteCount: number;
  isRecommended: boolean;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
}

export default function AdminAIScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<ScriptRecord | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    storeId: '',
    type: '',
    isRecommended: '',
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
    } catch (error) {
      console.error('Failed to update recommendation:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条脚本记录吗？')) return;
    try {
      await fetch(`/api/admin/ai-scripts/${id}?action=delete`, { method: 'DELETE' });
      setScripts(prev => prev.filter(s => s.id !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      storeId: '',
      type: '',
      isRecommended: '',
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                <div>
                  <Label className="text-xs text-gray-500">门店</Label>
                  <Select value={filters.storeId} onValueChange={v => setFilters({ ...filters, storeId: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="全部门店" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部门店</SelectItem>
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
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
                      <TableHead className="w-[100px] text-center">门店</TableHead>
                      <TableHead className="w-[50px] text-center">类型</TableHead>
                      <TableHead className="w-[120px] text-center">选题</TableHead>
                      <TableHead className="w-[150px] text-center">内容摘要</TableHead>
                      <TableHead className="w-[70px] text-center">播放量</TableHead>
                      <TableHead className="w-[70px] text-center">点赞量</TableHead>
                      <TableHead className="w-[70px] text-center">评论量</TableHead>
                      <TableHead className="w-[70px] text-center">收藏量</TableHead>
                      <TableHead className="w-[60px] text-center">仿写</TableHead>
                      <TableHead className="w-[130px] text-center">日期</TableHead>
                      <TableHead className="w-[100px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scripts.map(script => {
                      const { summary, angle } = extractTopicDirection(script.content);
                      return (
                        <TableRow key={script.id} className={script.isRecommended ? 'bg-yellow-50' : ''}>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleRecommend(script)}
                              className={`p-1 rounded ${script.isRecommended ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                            >
                              <Star className={`h-4 w-4 ${script.isRecommended ? 'fill-current' : ''}`} />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs truncate max-w-[90px] block" title={script.store?.name}>
                              {script.store?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={script.type === 'original' ? 'default' : 'secondary'} className="text-xs">
                              {script.type === 'original' ? '原创' : '仿写'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate max-w-[110px] block" title={script.topic || '-'}>
                              {script.topic || '-'}
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
                          <TableCell className="text-center">{script.rewriteCount}</TableCell>
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
      </div>

      {/* 脚本详情弹窗 */}
      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>脚本详情</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedScript.type === 'original' ? 'default' : 'secondary'}>
                  {selectedScript.type === 'original' ? '原创' : '仿写'}
                </Badge>
                {selectedScript.isRecommended && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    已推荐
                  </Badge>
                )}
              </div>
              {selectedScript.topic && (
                <div>
                  <Label className="text-xs text-gray-500">选题</Label>
                  <p className="text-sm font-medium">{selectedScript.topic}</p>
                </div>
              )}
              {selectedScript.store && (
                <div>
                  <Label className="text-xs text-gray-500">门店</Label>
                  <p className="text-sm">{selectedScript.store.name}</p>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2 text-center">
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
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-lg font-bold">{selectedScript.rewriteCount}</p>
                  <p className="text-xs text-gray-500">仿写次数</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">脚本内容</Label>
                <div className="mt-1 bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {selectedScript.content}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-gray-400">创建时间: {formatDate(selectedScript.createdAt)}</p>
                <Button variant="outline" size="sm" onClick={() => handleCopy(selectedScript.content, selectedScript.id)}>
                  {copiedId === selectedScript.id ? <CheckCheck className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copiedId === selectedScript.id ? '已复制' : '复制内容'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
