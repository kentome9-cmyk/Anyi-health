'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Sparkles, Copy, CheckCheck, Play, FileText, Lock, Link, Pencil, Check, Wand2, Library, Search, ChevronRight, Lightbulb } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';
import NextLink from 'next/link';

interface CreatorIdentity {
  id: string;
  storeId: string;
  contentTrack: string;
  personaStyle: string;
  targetAudience: string;
  videoTone: string;
  videoDuration: string;
  createdAt: string;
  updatedAt: string;
}

interface Topic {
  id: string;
  title: string;
  summary: string;
  angle: string;
  selected: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string; // Prompt 表的 content 字段
  type: string;
}

interface ScriptRecord {
  id: string;
  type: 'original' | 'rewrite';
  topic?: string;
  summary?: string;
  angle?: string;
  corePoints?: string;
  templateName?: string;
  content: string;
  sourceContent?: string;
  createdAt: string;
}

export default function StoreAIContentPage() {
  const { storeId } = useAuthStore();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('original');

  // 创作者身份
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  // 路径一：原创创作
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicSummary, setTopicSummary] = useState('');
  const [topicAngle, setTopicAngle] = useState('');
  const [corePoints, setCorePoints] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [originalScript, setOriginalScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copied, setCopied] = useState(false);

  // 选题库弹窗
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [scriptLibraryTopics, setScriptLibraryTopics] = useState<ScriptRecord[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicSearchKeyword, setTopicSearchKeyword] = useState('');

  // 路径二：改写创作
  const [sourceContent, setSourceContent] = useState('');
  const [rewriteTemplate, setRewriteTemplate] = useState<Template | null>(null);
  const [rewrittenScript, setRewrittenScript] = useState('');
  const [generatingRewrite, setGeneratingRewrite] = useState(false);
  const [rewriteCopied, setRewriteCopied] = useState(false);

  // 加载创作者身份
  const loadIdentity = async () => {
    try {
      setLoadingIdentity(true);
      const res = await fetch(`/api/store/creator-identity?storeId=${storeId}`);
      const data = await res.json();
      if (data.identity) {
        setIdentity(data.identity);
      }
    } catch (error) {
      console.error('Failed to load identity:', error);
    } finally {
      setLoadingIdentity(false);
    }
  };

  // 加载模板列表
  const loadTemplates = async (type: string) => {
    try {
      const res = await fetch(`/api/store/ai-content/templates?type=${type}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  // 从 URL 参数获取选题信息（从选题策划页跳转过来）
  const topicFromUrl = useMemo(() => {
    const topic = searchParams.get('topic');
    const summary = searchParams.get('summary');
    const angle = searchParams.get('angle');
    if (topic) {
      return { topic, summary: summary || '', angle: angle || '' };
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    loadIdentity();
    // 默认加载文案创作模板
    loadTemplates('script');
  }, []);

  // 如果有 URL 参数，设置选题信息
  useEffect(() => {
    if (topicFromUrl) {
      setTopicTitle(topicFromUrl.topic);
      setTopicSummary(topicFromUrl.summary);
      setTopicAngle(topicFromUrl.angle);
      // 设置一个虚拟的 selectedTopic 标记有选题
      setSelectedTopic({
        id: 'from-url',
        title: topicFromUrl.topic,
        summary: topicFromUrl.summary,
        angle: topicFromUrl.angle,
        selected: true,
      });
    }
  }, [topicFromUrl]);

  // 打开选题库弹窗
  const handleOpenTopicPicker = async () => {
    if (!storeId) return;
    setShowTopicPicker(true);
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/store/ai-scripts?storeId=${storeId}`);
      const data = await res.json();
      setScriptLibraryTopics(data.scripts || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  // 从选题库选择选题
  const handleSelectFromLibrary = (script: ScriptRecord) => {
    const summaryMatch = script.corePoints?.match(/【内容摘要】([\s\S]*?)(?=【切入角度】|$)/);
    const angleMatch = script.corePoints?.match(/【切入角度】([\s\S]*?)$/);
    const supplementaryMatch = script.corePoints?.match(/【补充说明】([\s\S]*?)$/);
    const summary = summaryMatch?.[1]?.trim() || '';
    const angle = angleMatch?.[1]?.trim() || '';
    const supplementary = supplementaryMatch?.[1]?.trim() || '';

    setSelectedTopic({
      id: script.id,
      title: script.topic || '未命名选题',
      summary: summary,
      angle: angle,
      selected: true,
    });
    setTopicTitle(script.topic || '');
    setTopicSummary(summary);
    setTopicAngle(angle);
    setCorePoints(supplementary);
    setShowTopicPicker(false);
  };

  // 选择选题（从AI生成的列表）
  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setTopicTitle(topic.title);
    setTopicSummary(topic.summary);
    setTopicAngle(topic.angle);
    setTopics(prev => prev.map(t => ({ ...t, selected: t.id === topic.id })));
  };

  // 渲染脚本内容（支持JSON和纯文本格式）
  const renderScriptContent = (content: string) => {
    // 尝试解析JSON
    try {
      // 去除可能的markdown代码块标记
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (content.includes('```')) {
        jsonStr = content.replace(/```\n?/g, '').trim();
      }
      
      const json = JSON.parse(jsonStr);
      
      // 如果解析成功，以格式化方式显示
      return (
        <div className="space-y-3">
          {json.titleSuggestion && (
            <div className="bg-red-50 border border-red-100 rounded p-2">
              <div className="text-[10px] font-medium text-red-600 mb-1">推荐标题</div>
              <div className="text-xs text-red-800 font-medium">{json.titleSuggestion}</div>
            </div>
          )}
          
          {json.script && (
            <div className="bg-gray-900 text-gray-100 rounded p-3">
              <div className="text-[10px] text-gray-400 mb-1">口播文案</div>
              <div className="text-xs leading-5 whitespace-pre-wrap">{json.script}</div>
            </div>
          )}
          
          {json.shootingTips && Array.isArray(json.shootingTips) && json.shootingTips.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2">
              <div className="text-[10px] font-medium text-blue-600 mb-1">拍摄要点</div>
              <ul className="text-xs text-gray-700 space-y-1">
                {json.shootingTips.map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-blue-500 shrink-0">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {json.editingTips && Array.isArray(json.editingTips) && json.editingTips.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded p-2">
              <div className="text-[10px] font-medium text-purple-600 mb-1">剪辑要点</div>
              <ul className="text-xs text-gray-700 space-y-1">
                {json.editingTips.map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-purple-500 shrink-0">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {json.hashtags && Array.isArray(json.hashtags) && json.hashtags.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded p-2">
              <div className="text-[10px] font-medium text-green-600 mb-1">推荐标签</div>
              <div className="flex flex-wrap gap-1">
                {json.hashtags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-[10px] px-1.5 py-[2px] bg-green-100 text-green-700 rounded">{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          {json.userNeeds && (
            <div className="bg-amber-50 border border-amber-100 rounded p-2">
              <div className="text-[10px] font-medium text-amber-600 mb-1">用户需求洞察</div>
              <div className="text-xs text-gray-700 space-y-1">
                {json.userNeeds.surface && <div><span className="text-amber-600">表层需求：</span>{json.userNeeds.surface}</div>}
                {json.userNeeds.deep && <div><span className="text-amber-600">深层需求：</span>{json.userNeeds.deep}</div>}
                {json.userNeeds.coreBenefit && <div><span className="text-amber-600">核心利益：</span>{json.userNeeds.coreBenefit}</div>}
                {json.userNeeds.emotion && <div><span className="text-amber-600">情绪需求：</span>{json.userNeeds.emotion}</div>}
                {json.userNeeds.resonance && <div><span className="text-amber-600">共鸣点：</span>{json.userNeeds.resonance}</div>}
                {json.userNeeds.insight && <div><span className="text-amber-600">核心洞察：</span>{json.userNeeds.insight}</div>}
              </div>
            </div>
          )}
        </div>
      );
    } catch {
      // 如果不是JSON，以纯文本方式显示
      return (
        <div className="bg-gray-900 text-gray-100 rounded p-3 text-xs leading-5 whitespace-pre-wrap">
          {content}
        </div>
      );
    }
  };

  // 路径一：生成脚本
  const handleGenerateOriginalScript = async () => {
    if (!selectedTopic || !selectedTemplate) {
      alert('请选择选题和模板');
      return;
    }
    setGeneratingScript(true);
    try {
      const res = await fetch('/api/store/ai-content/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'original',
          topic: topicTitle || selectedTopic.title,
          summary: topicSummary || selectedTopic.summary,
          angle: topicAngle || selectedTopic.angle,
          corePoints: corePoints,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          templatePrompt: selectedTemplate.content,
          identity: {
            contentTrack: identity?.contentTrack,
            personaStyle: identity?.personaStyle,
            targetAudience: identity?.targetAudience,
            videoTone: identity?.videoTone,
            videoDuration: identity?.videoDuration,
          },
        }),
      });
      const data = await res.json();
      if (data.content) {
        setOriginalScript(data.content);
        if (storeId) {
          await fetch('/api/store/ai-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              type: 'original',
              topic: topicTitle || selectedTopic.title,
              corePoints: `【选题标题】${topicTitle || selectedTopic.title}\n\n【内容摘要】${topicSummary || selectedTopic.summary}\n\n【切入角度】${topicAngle || selectedTopic.angle}\n\n【补充说明】${corePoints || '无'}`,
              templateName: selectedTemplate.name,
              content: data.content,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate script:', error);
    } finally {
      setGeneratingScript(false);
    }
  };

  // 路径二：改写脚本
  const handleGenerateRewrite = async () => {
    if (!identity) {
      alert('请先设置创作者身份');
      return;
    }
    if (!sourceContent.trim() || !rewriteTemplate) {
      alert('请提供原文并选择模板');
      return;
    }
    setGeneratingRewrite(true);
    try {
      const res = await fetch('/api/store/ai-content/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rewrite',
          sourceContent: sourceContent,
          templateId: rewriteTemplate.id,
          templateName: rewriteTemplate.name,
          templatePrompt: rewriteTemplate.content,
          identity: {
            contentTrack: identity?.contentTrack,
            personaStyle: identity?.personaStyle,
            targetAudience: identity?.targetAudience,
            videoTone: identity?.videoTone,
            videoDuration: identity?.videoDuration,
          },
        }),
      });
      const data = await res.json();
      if (data.content) {
        setRewrittenScript(data.content);
        // 保存到脚本库
        if (storeId) {
          await fetch('/api/store/ai-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              type: 'rewrite',
              sourceContent: sourceContent,
              templateName: rewriteTemplate.name,
              content: data.content,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to rewrite:', error);
    } finally {
      setGeneratingRewrite(false);
    }
  };

  const handleCopy = (content: string, type: 'original' | 'rewrite') => {
    navigator.clipboard.writeText(content);
    if (type === 'original') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setRewriteCopied(true);
      setTimeout(() => setRewriteCopied(false), 2000);
    }
  };

  if (loadingIdentity) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 页面标题 */}
      <div className="p-4 md:p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">内容创作</h1>
        </div>
        <p className="text-sm text-gray-500">基于创作者身份，生成专属短视频脚本</p>
      </div>

      <div className="px-4 md:px-6 pb-6">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // 切换 Tab 时加载对应类型的模板
          if (value === 'original') {
            loadTemplates('script');
          } else if (value === 'rewrite') {
            loadTemplates('rewrite');
          }
        }} className="h-full flex flex-col">
            <div className="border-b bg-white rounded-t-lg">
              <TabsList variant="line" className="h-11 -mb-px">
                <TabsTrigger value="original" className="gap-2 h-9">
                  <Sparkles className="h-4 w-4" />
                  AI原创选题
                </TabsTrigger>
                <TabsTrigger value="rewrite" className="gap-2 h-9">
                  <Pencil className="h-4 w-4" />
                  外部文案改写
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 路径一：AI原创创作 */}
            <TabsContent value="original" className="mt-0 flex-1 pt-3">
              <div className="grid grid-cols-12 gap-3 h-[calc(100vh-170px)] min-h-[480px]">
                {/* 左侧：身份 + 三步操作 */}
                <div className="col-span-6 flex flex-col space-y-2 min-h-0 h-full">
                  {/* 创作者身份 - 极紧凑 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded p-1.5 border border-green-100 shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Lock className="h-3 w-3 text-green-600 shrink-0" />
                      {identity ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] font-medium text-green-900">锁定:</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.contentTrack}</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.personaStyle}</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.targetAudience}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700">⚠️ 未设置身份</span>
                      )}
                    </div>
                  </div>

                  {/* 主卡片 - 三步合并 */}
                  <Card className="border shadow-sm flex-1 min-h-0 flex flex-col">
                    <CardContent className="p-2.5 flex flex-col flex-1 min-h-0 space-y-2.5">
                      {/* 第一步：找选题 */}
                      <div className="shrink-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">1</span>
                          <span className="text-[11px] font-medium text-gray-900">找选题</span>
                        </div>
                        <Button
                          onClick={handleOpenTopicPicker}
                          className="w-full h-7 text-[11px]"
                          variant="outline"
                        >
                          <Library className="mr-1.5 h-3 w-3" />
                          从脚本库选择
                        </Button>
                        {selectedTopic && (
                          <div className="mt-1.5 p-1.5 border border-green-200 bg-green-50 rounded flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[11px] text-gray-900 truncate">{selectedTopic.title}</div>
                              {selectedTopic.summary && (
                                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{selectedTopic.summary}</p>
                              )}
                            </div>
                            <button
                              className="text-[10px] text-gray-400 hover:text-gray-600 shrink-0"
                              onClick={() => { setSelectedTopic(null); setTopicTitle(''); setTopicSummary(''); setTopicAngle(''); }}
                            >
                              清除
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 第二步：内容方向 - 四输入框 */}
                      <div className="shrink-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">2</span>
                          <span className="text-[11px] font-medium text-gray-900">内容方向</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-0.5">选题标题</label>
                            <Textarea
                              placeholder="选题标题..."
                              value={topicTitle}
                              onChange={e => setTopicTitle(e.target.value)}
                              rows={1}
                              className="resize-none text-[11px] min-h-[26px] py-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">内容摘要</label>
                              <Textarea
                                placeholder="内容摘要..."
                                value={topicSummary}
                                onChange={e => setTopicSummary(e.target.value)}
                                rows={2}
                                className="resize-none text-[11px] min-h-[40px] py-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">切入角度</label>
                              <Textarea
                                placeholder="切入角度..."
                                value={topicAngle}
                                onChange={e => setTopicAngle(e.target.value)}
                                rows={2}
                                className="resize-none text-[11px] min-h-[40px] py-1"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-0.5">补充说明</label>
                            <Textarea
                              placeholder="核心观点、创作侧重..."
                              value={corePoints}
                              onChange={e => setCorePoints(e.target.value)}
                              rows={2}
                              className="resize-none text-[11px] min-h-[40px] py-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 第三步：选择模板 + 生成按钮 */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">3</span>
                          <span className="text-[11px] font-medium text-gray-900">选择模板并生成</span>
                        </div>
                        {templates.length === 0 ? (
                          <div className="text-[11px] text-gray-400 py-2 border rounded text-center shrink-0">
                            暂无模板
                          </div>
                        ) : (
                          <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
                            {templates.map(template => (
                              <div
                                key={template.id}
                                className={`p-1.5 border rounded cursor-pointer transition-all ${
                                  selectedTemplate?.id === template.id
                                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                    : 'hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedTemplate(template)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-[11px] text-gray-900">{template.name}</span>
                                  <span className="text-[9px] text-gray-500 border rounded px-1 py-[1px]">{template.type === 'script' ? '文案创作' : '文案改写'}</span>
                                </div>
                                {template.description && (
                                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 shrink-0">
                          <Button
                            onClick={handleGenerateOriginalScript}
                            disabled={generatingScript || !selectedTopic || !selectedTemplate}
                            className="w-full h-7 text-[11px]"
                          >
                            {generatingScript ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Play className="mr-1 h-3 w-3" />
                                生成短视频脚本
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 右侧：脚本输出区 */}
                <div className="col-span-6 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardHeader className="border-b bg-gray-50/50 py-1.5 px-3 flex-row items-center justify-between shrink-0">
                      <CardTitle className="text-xs flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-green-600" />
                        生成区
                      </CardTitle>
                      {originalScript && (
                        <div className="flex items-center gap-1.5">
                          {selectedTopic && (
                            <span className="text-[10px] text-gray-500">{selectedTopic.title.slice(0, 12)}...</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(originalScript, 'original')}
                            className="h-6 text-[11px]"
                          >
                            {copied ? '已复制' : '复制'}
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 p-0 min-h-0">
                      {originalScript ? (
                        <div className="h-full p-2 overflow-y-auto">
                          {renderScriptContent(originalScript)}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 px-4">
                          <Sparkles className="h-6 w-6 mb-1.5 opacity-40" />
                          <p className="text-xs font-medium text-gray-500">完成左侧三步后点击生成</p>
                          <p className="text-[10px] mt-1 text-gray-400 text-center">AI将基于固定身份+选题+内容方向+模板，生成专属短视频脚本</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* 路径二：外部文案导入 + AI改写生成 */}
            <TabsContent value="rewrite" className="mt-0 flex-1 pt-3">
              <div className="grid grid-cols-12 gap-3 h-[calc(100vh-170px)] min-h-[480px]">
                {/* 左侧：身份 + 原文 + 模板 */}
                <div className="col-span-6 flex flex-col space-y-2 min-h-0 h-full">
                  {/* 创作者身份 - 极紧凑 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded p-1.5 border border-green-100 shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Lock className="h-3 w-3 text-green-600 shrink-0" />
                      {identity ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] font-medium text-green-900">锁定:</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.contentTrack}</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.personaStyle}</span>
                          <span className="text-[10px] px-1.5 py-[1px] bg-white border border-green-200 text-green-800 rounded">{identity.targetAudience}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700">⚠️ 未设置身份</span>
                      )}
                    </div>
                  </div>

                  {/* 主卡片 - 两步合并 */}
                  <Card className="border shadow-sm flex-1 min-h-0 flex flex-col">
                    <CardContent className="p-2.5 flex flex-col flex-1 min-h-0 space-y-2.5">
                      {/* 第一步：导入原文 */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">1</span>
                          <span className="text-[11px] font-medium text-gray-900">粘贴原文</span>
                        </div>
                        <Textarea
                          placeholder="粘贴需要改写的外部文案原文..."
                          value={sourceContent}
                          onChange={e => setSourceContent(e.target.value)}
                          className="resize-none text-[11px] leading-relaxed flex-1 min-h-0"
                        />
                      </div>

                      {/* 第二步：选择模板 + 生成按钮 */}
                      <div className="shrink-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">2</span>
                          <span className="text-[11px] font-medium text-gray-900">选择模板并生成</span>
                        </div>
                        {templates.length === 0 ? (
                          <div className="text-[11px] text-gray-400 py-2 border rounded text-center mb-2">
                            暂无模板
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-[90px] overflow-y-auto mb-2">
                            {templates.map(template => (
                              <div
                                key={template.id}
                                className={`p-1.5 border rounded cursor-pointer transition-all ${
                                  rewriteTemplate?.id === template.id
                                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                    : 'hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => setRewriteTemplate(template)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-[11px] text-gray-900">{template.name}</span>
                                  <span className="text-[9px] text-gray-500 border rounded px-1 py-[1px]">{template.type === 'script' ? '文案创作' : '文案改写'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          onClick={handleGenerateRewrite}
                          disabled={generatingRewrite || !sourceContent.trim() || !rewriteTemplate}
                          className="w-full h-7 text-[11px]"
                        >
                          {generatingRewrite ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              改写中...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-1 h-3 w-3" />
                              AI身份适配改写
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 右侧：改写输出区 */}
                <div className="col-span-6 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardHeader className="border-b bg-gray-50/50 py-1.5 px-3 flex-row items-center justify-between shrink-0">
                      <CardTitle className="text-xs flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-green-600" />
                        改写区
                      </CardTitle>
                      {rewrittenScript && (
                        <div className="flex items-center gap-1.5">
                          {rewriteTemplate && (
                            <span className="text-[10px] text-gray-500">{rewriteTemplate.name}</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(rewrittenScript, 'rewrite')}
                            className="h-6 text-[11px]"
                          >
                            {rewriteCopied ? '已复制' : '复制'}
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 p-0 min-h-0">
                      {rewrittenScript ? (
                        <div className="h-full p-2 overflow-y-auto">
                          {renderScriptContent(rewrittenScript)}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 px-4">
                          <Wand2 className="h-6 w-6 mb-1.5 opacity-40" />
                          <p className="text-xs font-medium text-gray-500">粘贴原文并选择模板后点击生成</p>
                          <p className="text-[10px] mt-1 text-gray-400 text-center">AI将基于固定身份，将外网文案改写为贴合自身赛道、人设、风格的专属脚本</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </div>

      {/* 选题库弹窗 */}
      <Dialog open={showTopicPicker} onOpenChange={setShowTopicPicker}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              选择选题
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索选题..."
                value={topicSearchKeyword}
                onChange={e => setTopicSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingTopics ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">加载中...</p>
                </div>
              ) : scriptLibraryTopics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Library className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无选题</p>
                  <p className="text-xs mt-1">请先在选题策划页面保存选题</p>
                  <NextLink href="/store/ai-topics">
                    <Button variant="outline" size="sm" className="mt-3">
                      <ChevronRight className="h-3 w-3 mr-1.5" />
                      去选题策划
                    </Button>
                  </NextLink>
                </div>
              ) : (
                scriptLibraryTopics
                  .filter(s => !topicSearchKeyword || (s.topic && s.topic.includes(topicSearchKeyword)))
                  .map(script => {
                    // 从 corePoints 中提取选题信息（选题标题、内容摘要、切入角度）
                    const summaryMatch = script.corePoints?.match(/【内容摘要】([\s\S]*?)(?=【切入角度】|$)/);
                    const angleMatch = script.corePoints?.match(/【切入角度】([\s\S]*?)(?=【补充说明】|$)/);
                    const summary = summaryMatch?.[1]?.trim() || '';
                    const angle = angleMatch?.[1]?.trim() || '';
                    
                    const isSelected = selectedTopic?.id === script.id;
                    return (
                      <div
                        key={script.id}
                        className={`flex border rounded-lg cursor-pointer transition-all overflow-hidden group ${isSelected ? 'border-green-500 bg-green-50/60 ring-1 ring-green-500/30' : 'hover:border-green-300 hover:bg-gray-50/60'}`}
                        onClick={() => handleSelectFromLibrary(script)}
                      >
                        <div className={`w-[4px] bg-green-500 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`} />
                        <div className="w-1/2 p-3 border-r">
                          <div className="text-xs text-gray-500 mb-1">选题</div>
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            {isSelected && <Check className="h-3.5 w-3.5 text-green-600" />}
                            {script.topic || '未命名选题'}
                          </div>
                        </div>
                        <div className="w-1/2 p-3">
                          <div className="text-xs text-gray-500 mb-1">选题方向</div>
                          <div className="text-xs text-gray-700 leading-relaxed">
                            {angle || summary || '-'}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
