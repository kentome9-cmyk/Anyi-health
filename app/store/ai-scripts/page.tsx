'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText, Copy, CheckCheck, Search, Send, Pencil, RefreshCw, BookOpen
} from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

interface ScriptRecord {
  id: string;
  type: 'original' | 'rewrite';
  topic?: string;
  corePoints?: string;
  sourceContent?: string;
  templateName?: string;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  rewriteCount: number;
  createdAt: string;
  storeId?: string;
}

interface StatsUpdate {
  field: 'viewCount' | 'likeCount' | 'commentCount' | 'favoriteCount';
  value: number;
}

export default function StoreAIScriptsPage() {
  const router = useRouter();
  const { storeId, isAuthenticated, _hasHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [publicScripts, setPublicScripts] = useState<ScriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScript, setSelectedScript] = useState<ScriptRecord | null>(null);
  const [statsDialog, setStatsDialog] = useState<{ open: boolean; script: ScriptRecord | null }>({ open: false, script: null });
  const [statsForm, setStatsForm] = useState<StatsUpdate>({ field: 'viewCount', value: 0 });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (storeId) {
      loadScripts();
      loadPublicScripts();
    }
  }, [storeId]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/ai-scripts?storeId=${storeId}`);
      const data = await res.json();
      setScripts(data.scripts || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicScripts = async () => {
    try {
      const res = await fetch('/api/store/ai-scripts/public');
      const data = await res.json();
      setPublicScripts(data.scripts || []);
    } catch (error) {
      console.error('Failed to load public scripts:', error);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条脚本记录吗？')) return;
    try {
      await fetch(`/api/store/ai-scripts/${id}?storeId=${storeId}`, { method: 'DELETE' });
      setScripts(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const handleUpdateStats = async () => {
    if (!statsDialog.script) return;
    try {
      const res = await fetch(`/api/store/ai-scripts/${statsDialog.script.id}/stats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: statsForm.field, value: statsForm.value }),
      });
      if (res.ok) {
        const updateScript = (prev: ScriptRecord[]) => prev.map(s =>
          s.id === statsDialog.script!.id
            ? { ...s, [statsForm.field]: statsForm.value }
            : s
        );
        setScripts(updateScript);
        setPublicScripts(updateScript);
        setStatsDialog({ open: false, script: null });
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  };

  const openStatsDialog = (script: ScriptRecord, field: StatsUpdate['field']) => {
    setStatsDialog({ open: true, script });
    setStatsForm({ field, value: script[field] });
  };

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
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const fieldLabels: Record<StatsUpdate['field'], string> = {
    viewCount: '播放量',
    likeCount: '点赞量',
    commentCount: '评论量',
    favoriteCount: '收藏量',
  };

  const filteredScripts = scripts.filter(script => {
    return searchKeyword === '' ||
      script.topic?.includes(searchKeyword) ||
      script.corePoints?.includes(searchKeyword) ||
      script.content.includes(searchKeyword);
  });

  const filteredPublicScripts = publicScripts.filter(script => {
    return searchKeyword === '' ||
      script.topic?.includes(searchKeyword) ||
      script.corePoints?.includes(searchKeyword) ||
      script.content.includes(searchKeyword);
  });

  const renderMyScriptsTable = (scriptList: ScriptRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">日期</TableHead>
          <TableHead className="w-[120px] text-center">选题</TableHead>
          <TableHead className="w-[200px] text-center">选题方向</TableHead>
          <TableHead className="w-[70px] text-center">去创作</TableHead>
          <TableHead className="w-[70px] text-center">创作内容</TableHead>
          <TableHead className="w-[70px] text-center">播放量</TableHead>
          <TableHead className="w-[70px] text-center">点赞量</TableHead>
          <TableHead className="w-[70px] text-center">评论量</TableHead>
          <TableHead className="w-[70px] text-center">收藏量</TableHead>
          <TableHead className="w-[70px] text-center">去仿写</TableHead>
          <TableHead className="w-[60px] text-center">仿写次数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scriptList.map((script) => {
          const { summary, angle } = extractTopicDirection(script.corePoints || '');
          return (
            <TableRow key={script.id}>
              <TableCell className="text-xs text-gray-500 text-center">
                {formatDate(script.createdAt)}
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium truncate max-w-[110px] text-center" title={script.topic || '无标题'}>
                  {script.topic || '无标题'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs text-gray-600 max-w-[190px]">
                  {summary && <div className="truncate" title={summary}>{summary}</div>}
                  {angle && <div className="text-green-600 truncate" title={angle}>💡 {angle}</div>}
                  {!summary && !angle && <span className="text-gray-400">-</span>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/store/ai-content')}
                  className="h-7 px-1 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  创作
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedScript(script)}
                  className="h-7 px-1 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  查看
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.viewCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, viewCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.viewCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'viewCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.likeCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, likeCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.likeCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'likeCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.commentCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, commentCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.commentCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'commentCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.favoriteCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, favoriteCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.favoriteCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'favoriteCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/store/ai-rewrite')}
                  className="h-7 px-1 text-xs"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  仿写
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <RefreshCw className="h-3 w-3 text-gray-400" />
                  {script.rewriteCount}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderPublicScriptsTable = (scriptList: ScriptRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">日期</TableHead>
          <TableHead className="w-[120px] text-center">选题</TableHead>
          <TableHead className="w-[200px] text-center">选题方向</TableHead>
          <TableHead className="w-[70px] text-center">创作内容</TableHead>
          <TableHead className="w-[70px] text-center">播放量</TableHead>
          <TableHead className="w-[70px] text-center">点赞量</TableHead>
          <TableHead className="w-[70px] text-center">评论量</TableHead>
          <TableHead className="w-[70px] text-center">收藏量</TableHead>
          <TableHead className="w-[70px] text-center">去仿写</TableHead>
          <TableHead className="w-[60px] text-center">仿写次数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scriptList.map((script) => {
          const { summary, angle } = extractTopicDirection(script.corePoints || '');
          return (
            <TableRow key={script.id}>
              <TableCell className="text-xs text-gray-500 text-center">
                {formatDate(script.createdAt)}
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium truncate max-w-[110px] text-center" title={script.topic || '无标题'}>
                  {script.topic || '无标题'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs text-gray-600 max-w-[190px]">
                  {summary && <div className="truncate" title={summary}>{summary}</div>}
                  {angle && <div className="text-green-600 truncate" title={angle}>💡 {angle}</div>}
                  {!summary && !angle && <span className="text-gray-400">-</span>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedScript(script)}
                  className="h-7 px-1 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  查看
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.viewCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, viewCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.viewCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'viewCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.likeCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, likeCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.likeCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'likeCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.commentCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, commentCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.commentCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'commentCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="0"
                  placeholder="点击手动输入"
                  value={script.favoriteCount || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    const updateFn = (prev: ScriptRecord[]) => prev.map(s =>
                      s.id === script.id ? { ...s, favoriteCount: newValue } : s
                    );
                    setScripts(updateFn);
                    setPublicScripts(updateFn);
                  }}
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== script.favoriteCount) {
                      fetch(`/api/store/ai-scripts/${script.id}/stats`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'favoriteCount', value: newValue }),
                      });
                    }
                  }}
                  className="w-24 h-6 text-xs px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/store/ai-rewrite')}
                  className="h-7 px-1 text-xs"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  仿写
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <RefreshCw className="h-3 w-3 text-gray-400" />
                  {script.rewriteCount}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6">
        {/* 页面标题 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            我的脚本库
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理和追踪您的短视频脚本数据</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'mine'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            我的脚本库
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'public'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            公共脚本库
          </button>
        </div>

        {/* 搜索栏 */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索选题或内容..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="flex-1 text-sm border-0 outline-none bg-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* 表格 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : activeTab === 'mine' ? (
              filteredScripts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{scripts.length === 0 ? '暂无脚本记录' : '未找到匹配的脚本'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {renderMyScriptsTable(filteredScripts)}
                </div>
              )
            ) : (
              filteredPublicScripts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{publicScripts.length === 0 ? '暂无公共脚本记录' : '未找到匹配的脚本'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {renderPublicScriptsTable(filteredPublicScripts)}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创作内容弹窗 */}
      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创作内容</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              {selectedScript.topic && (
                <div>
                  <Label className="text-xs text-gray-500">选题</Label>
                  <p className="text-sm font-medium">{selectedScript.topic}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">脚本内容</Label>
                <div className="mt-1 bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {selectedScript.content}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleCopy(selectedScript.content, selectedScript.id)}>
                  {copiedId === selectedScript.id ? <CheckCheck className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copiedId === selectedScript.id ? '已复制' : '复制内容'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 数据编辑弹窗 */}
      <Dialog open={statsDialog.open} onOpenChange={(open) => setStatsDialog({ open, script: null })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑{statsDialog.script && fieldLabels[statsForm.field as StatsUpdate['field']]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>输入数值</Label>
              <Input
                type="number"
                min="0"
                value={statsForm.value}
                onChange={(e) => setStatsForm({ ...statsForm, value: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatsDialog({ open: false, script: null })}>
                取消
              </Button>
              <Button onClick={handleUpdateStats}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
