'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText, Search, Send, Lightbulb, Eye, ChevronDown, ChevronRight
} from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';

interface ScriptRecord {
  id: string;
  type: string;
  version: number;
  topicTitle?: string;
  content: string;
  templateName?: string;
  viewCount: number;
  likeCount: number;
  isFilmed: boolean;
  createdAt: string;
}

interface TopicRecord {
  id: string;
  topic: string;
  summary?: string;
  angle?: string;
  corePoints?: string;
  totalViews: number;
  totalLikes: number;
  scripts: ScriptRecord[];
  createdAt: string;
}

export default function StoreAITopicLibraryPage() {
  const router = useRouter();
  const { storeId, isAuthenticated, _hasHydrated } = useAuthStore();
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<TopicRecord | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (storeId) {
      loadTopics();
    }
  }, [storeId]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/topics?storeId=${storeId}&includeScripts=true`);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const handleGoToCreate = (topic: TopicRecord) => {
    const params = new URLSearchParams({
      topicId: topic.id,
      topic: topic.topic,
      summary: topic.summary || '',
      angle: topic.angle || '',
    });
    router.push(`/store/ai-content?${params.toString()}`);
  };

  const handleViewScript = (topic: TopicRecord, script: ScriptRecord) => {
    setSelectedTopic({ ...topic, scripts: [script] });
  };

  const extractScriptContent = (content: string) => {
    try {
      const json = JSON.parse(content);
      return json.script || json.rewrittenScript || content;
    } catch {
      return content;
    }
  };

  const filteredTopics = topics.filter(topic => {
    if (!searchKeyword) return true;
    return (
      topic.topic?.includes(searchKeyword) ||
      topic.summary?.includes(searchKeyword) ||
      topic.angle?.includes(searchKeyword)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-green-600" />
            选题库
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理您的短视频选题，查看每个选题的所有创作版本</p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索选题..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="flex-1 text-sm border-0 outline-none bg-transparent"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">暂无选题记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-center"></TableHead>
                      <TableHead className="w-[60px] text-center">日期</TableHead>
                      <TableHead className="w-[80px] text-center">版本</TableHead>
                      <TableHead className="w-[150px] text-center">选题</TableHead>
                      <TableHead className="w-[120px] text-center">内容摘要</TableHead>
                      <TableHead className="w-[100px] text-center">切入角度</TableHead>
                      <TableHead className="w-[80px] text-center">播放/点赞</TableHead>
                      <TableHead className="w-[120px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTopics.map((topic) => {
                      const isExpanded = expandedTopics.has(topic.id);
                      const hasScripts = topic.scripts && topic.scripts.length > 0;
                      
                      return (
                        <>
                          {/* 选题行（主行） */}
                          <TableRow key={topic.id} className="bg-gray-50/50 hover:bg-gray-100/50">
                            <TableCell className="text-center">
                              <button
                                onClick={() => toggleExpand(topic.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                {hasScripts ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )
                                ) : (
                                  <span className="w-4 h-4 inline-block" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 text-center">
                              {formatDate(topic.createdAt)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {hasScripts ? `v${topic.scripts.length}` : '无'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-center" title={topic.topic}>
                                {topic.topic}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-gray-600 max-w-[110px] truncate text-center" title={topic.summary || '-'}>
                                {topic.summary || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-green-600 max-w-[90px] truncate text-center" title={topic.angle || '-'}>
                                {topic.angle || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-center">
                                <span className="text-gray-600">{topic.totalViews}</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-600">{topic.totalLikes}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleGoToCreate(topic)}
                                className="h-7 px-2 text-xs"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                创作
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* 脚本版本行（展开行） */}
                          {isExpanded && hasScripts && topic.scripts.map((script, idx) => (
                            <TableRow key={`${topic.id}-script-${script.id}`} className="hover:bg-gray-50">
                              <TableCell colSpan={2} />
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-xs">
                                  v{script.version}
                                </Badge>
                              </TableCell>
                              <TableCell colSpan={2}>
                                <div className="text-xs text-gray-600 max-w-[260px] truncate" title={script.templateName || '-'}>
                                  {script.templateName || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-xs text-center">
                                  <span className="text-gray-600">{script.viewCount || 0}</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-gray-600">{script.likeCount || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewScript(topic, script)}
                                    className="h-6 px-1.5 text-xs"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  {script.isFilmed ? (
                                    <Badge variant="outline" className="text-xs h-6">已拍摄</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs h-6">未拍摄</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 脚本详情弹窗 */}
      <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTopic?.topic} - {selectedTopic?.scripts[0]?.version ? `v${selectedTopic.scripts[0].version}` : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedTopic && selectedTopic.scripts[0] && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>使用模板：{selectedTopic.scripts[0].templateName || '-'}</span>
                <span>|</span>
                <span>创建时间：{formatDate(selectedTopic.scripts[0].createdAt)}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>播放：{selectedTopic.scripts[0].viewCount || 0}</span>
                <span>点赞：{selectedTopic.scripts[0].likeCount || 0}</span>
                <span>收藏：{selectedTopic.scripts[0].likeCount || 0}</span>
              </div>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {extractScriptContent(selectedTopic.scripts[0].content)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
