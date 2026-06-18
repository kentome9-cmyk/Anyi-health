'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Copy, CheckCheck, Trash2, Sparkles, Pencil, Search } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

interface ScriptRecord {
  id: string;
  type: 'original' | 'rewrite';
  topic?: string;
  corePoints?: string;
  sourceContent?: string;
  templateName?: string;
  content: string;
  createdAt: string;
}

export default function StoreAIScriptsPage() {
  const { storeId } = useAuthStore();
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'rewrite'>('all');

  useEffect(() => {
    loadScripts();
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

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条脚本记录吗？')) return;
    try {
      await fetch(`/api/store/ai-scripts/${id}?storeId=${storeId}`, {
        method: 'DELETE',
      });
      setScripts(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = searchKeyword === '' ||
      script.topic?.includes(searchKeyword) ||
      script.content.includes(searchKeyword) ||
      script.templateName?.includes(searchKeyword);

    const matchesType = filterType === 'all' || script.type === filterType;

    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-green-600" />
          脚本库
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          查看和管理您生成的短视频脚本记录
        </p>
      </div>

      {/* 筛选工具栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索脚本内容..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="flex-1 text-sm border-0 outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                全部
              </Button>
              <Button
                variant={filterType === 'original' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('original')}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                原创
              </Button>
              <Button
                variant={filterType === 'rewrite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('rewrite')}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                改写
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 脚本列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : filteredScripts.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-600">
                {scripts.length === 0 ? '暂无脚本记录' : '未找到匹配的脚本'}
              </p>
              <p className="text-xs mt-1 text-gray-400">
                {scripts.length === 0
                  ? '在内容创作页面生成脚本后会自动保存到这里'
                  : '尝试调整搜索条件'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredScripts.map(script => (
            <Card key={script.id} className="border shadow-sm">
              <CardHeader className="border-b bg-gray-50/50 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={script.type === 'original' ? 'default' : 'secondary'} className="text-xs">
                      {script.type === 'original' ? (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          原创
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3 w-3 mr-1" />
                          改写
                        </>
                      )}
                    </Badge>
                    {script.templateName && (
                      <Badge variant="outline" className="text-xs">
                        {script.templateName}
                      </Badge>
                    )}
                    {script.topic && (
                      <span className="text-sm text-gray-600">{script.topic}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(script.createdAt)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {script.content}
                    </div>
                    {script.sourceContent && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2 border">
                        <span className="font-medium">原文：</span>
                        {script.sourceContent.slice(0, 100)}
                        {script.sourceContent.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(script.content, script.id)}
                    >
                      {copiedId === script.id ? (
                        <>
                          <CheckCheck className="h-3.5 w-3.5 mr-1" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          复制
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(script.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
