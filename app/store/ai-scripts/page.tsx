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
  topicId?: string;
  version: number;
  topicTitle?: string;
  summary?: string;
  angle?: string;
  corePoints?: string;
  sourceContent?: string;
  templateName?: string;
  content: string;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  isFilmed?: boolean;
  createdAt: string;
  storeId?: string;
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
    // 尝试从JSON中提取口播逐字稿（支持原创的script和改写的rewrittenScript）
    let textToCopy = content;
    try {
      const json = JSON.parse(content);
      if (json.rewrittenScript && typeof json.rewrittenScript === 'string') {
        textToCopy = json.rewrittenScript;
      } else if (json.script && typeof json.script === 'string') {
        textToCopy = json.script;
      }
    } catch {
      // 如果不是有效的JSON，保持原样
    }
    await navigator.clipboard.writeText(textToCopy);
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

  const handleToggleFilmed = async (id: string, currentValue: boolean) => {
    try {
      await fetch(`/api/store/ai-scripts/${id}/filmed?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFilmed: !currentValue }),
      });
      setScripts(prev => prev.map(s => s.id === id ? { ...s, isFilmed: !currentValue } : s));
      setPublicScripts(prev => prev.map(s => s.id === id ? { ...s, isFilmed: !currentValue } : s));
    } catch (error) {
      console.error('Failed to update filmed status:', error);
    }
  };

  const extractTopicDirection = (content: string) => {
    const summaryMatch = content.match(/【内容摘要】([\s\S]*?)(?=【切入角度】|$)/);
    const angleMatch = content.match(/【切入角度】([\s\S]*?)$/);
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      angle: angleMatch ? angleMatch[1].trim() : '',
    };
  };

  const extractScriptMetadata = (content: string) => {
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```+\n?/g, '').trim();
      } else if (content.includes('```')) {
        jsonStr = content.replace(/```+\n?/g, '').trim();
      }
      const json = JSON.parse(jsonStr);
      return {
        titleSuggestion: json.titleSuggestion || '',
        script: json.rewrittenScript || json.script || '',
        hashtags: Array.isArray(json.hashtags) ? json.hashtags.slice(0, 3) : [],
        shootingTips: Array.isArray(json.shootingTips) ? json.shootingTips.slice(0, 3) : [],
      };
    } catch {
      return { titleSuggestion: '', script: '', hashtags: [], shootingTips: [] };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const filteredScripts = scripts.filter(script => {
    return searchKeyword === '' ||
      script.topicTitle?.includes(searchKeyword) ||
      script.corePoints?.includes(searchKeyword) ||
      script.content.includes(searchKeyword);
  });

  const filteredPublicScripts = publicScripts.filter(script => {
    return searchKeyword === '' ||
      script.topicTitle?.includes(searchKeyword) ||
      script.corePoints?.includes(searchKeyword) ||
      script.content.includes(searchKeyword);
  });

  const renderMyScriptsTable = (scriptList: ScriptRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px] text-center">日期</TableHead>
          <TableHead className="w-[50px] text-center">版本</TableHead>
          <TableHead className="w-[70px] text-center">类型</TableHead>
          <TableHead className="w-[120px] text-center">选题</TableHead>
          <TableHead className="w-[80px] text-center">播放/点赞</TableHead>
          <TableHead className="w-[80px] text-center">状态</TableHead>
          <TableHead className="w-[120px] text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scriptList.map((script) => {
          const { titleSuggestion, script: scriptContent, hashtags, shootingTips } = extractScriptMetadata(script.content);
          const displayContent = scriptContent || script.content.substring(0, 50);
          return (
            <TableRow key={script.id}>
              <TableCell className="text-xs text-gray-500 text-center">
                {formatDate(script.createdAt)}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs font-medium text-gray-700">v{script.version || 1}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  script.type === 'rewrite' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {script.type === 'rewrite' ? '改写' : '原创'}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-xs font-medium truncate max-w-[110px] text-center" title={script.topicTitle || '无标题'}>
                  {script.topicTitle || '无标题'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs text-center">
                  <span className="text-gray-600">{script.viewCount || 0}</span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span className="text-gray-600">{script.likeCount || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${script.isFilmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {script.isFilmed ? '✓ 已拍摄' : '○ 未拍摄'}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedScript(script)}
                    className="h-7 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    详情
                  </Button>
                  <Button
                    variant={script.isFilmed ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleFilmed(script.id, script.isFilmed || false)}
                    className="h-7 px-2 text-xs"
                  >
                    {script.isFilmed ? '取消' : '拍摄'}
                  </Button>
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
          <TableHead className="w-[60px] text-center">日期</TableHead>
          <TableHead className="w-[50px] text-center">版本</TableHead>
          <TableHead className="w-[70px] text-center">类型</TableHead>
          <TableHead className="w-[120px] text-center">选题</TableHead>
          <TableHead className="w-[80px] text-center">播放/点赞</TableHead>
          <TableHead className="w-[80px] text-center">状态</TableHead>
          <TableHead className="w-[120px] text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scriptList.map((script) => {
          return (
            <TableRow key={script.id}>
              <TableCell className="text-xs text-gray-500 text-center">
                {formatDate(script.createdAt)}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs font-medium text-gray-700">v{script.version || 1}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  script.type === 'rewrite' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {script.type === 'rewrite' ? '改写' : '原创'}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-xs font-medium truncate max-w-[110px] text-center" title={script.topicTitle || '无标题'}>
                  {script.topicTitle || '无标题'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs text-center">
                  <span className="text-gray-600">{script.viewCount || 0}</span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span className="text-gray-600">{script.likeCount || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${script.isFilmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {script.isFilmed ? '✓ 已拍摄' : '○ 未拍摄'}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedScript(script)}
                    className="h-7 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    详情
                  </Button>
                  <Button
                    variant={script.isFilmed ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleFilmed(script.id, script.isFilmed || false)}
                    className="h-7 px-2 text-xs"
                  >
                    {script.isFilmed ? '取消' : '拍摄'}
                  </Button>
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

      {/* 查看详情弹窗 */}
      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>脚本详情</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              {selectedScript.topicTitle && (
                <div>
                  <Label className="text-xs text-gray-500">选题</Label>
                  <p className="text-sm font-medium">{selectedScript.topicTitle}</p>
                </div>
              )}
              {(() => {
                const { titleSuggestion, script: scriptContent, hashtags, shootingTips } = extractScriptMetadata(selectedScript.content);
                return (
                  <>
                    {titleSuggestion && (
                      <div>
                        <Label className="text-xs text-gray-500">推荐标题文案</Label>
                        <p className="text-sm">{titleSuggestion}</p>
                      </div>
                    )}
                    {hashtags.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500">标签</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {shootingTips.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500">拍摄要点</Label>
                        <ul className="mt-1 space-y-1">
                          {shootingTips.map((tip, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-green-600">{idx + 1}.</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">口播逐字稿</Label>
                      <div className="mt-1 bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {scriptContent || selectedScript.content}
                      </div>
                    </div>
                  </>
                );
              })()}
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
    </div>
  );
}
