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
import { Loader2, Sparkles, Copy, CheckCheck, Play, FileText, Lock, Link, Pencil, Check, Wand2, Library, Search, ChevronRight, Lightbulb, Save } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';
import NextLink from 'next/link';
import { extractScriptMetadata, ScriptMetadata } from '@/lib/script-utils';
import { useCreatorIdentity } from '@/hooks/use-creator-identity';

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
  type: 'original' | 'rewrite' | 'material';
  topicId?: string;
  topicTitle?: string;
  summary?: string;
  angle?: string;
  corePoints?: string;
  templateName?: string;
  content: string;
  sourceContent?: string;
  direction?: string;
  subCategory?: string;
  createdAt: string;
}

export default function StoreAIContentPage() {
  const { storeId } = useAuthStore();
  const { identity, loading: loadingIdentity } = useCreatorIdentity();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('original');

  // 路径一：原创创作
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicSummary, setTopicSummary] = useState('');
  const [topicAngle, setTopicAngle] = useState('');
  const [corePoints, setCorePoints] = useState('');
  const [direction, setDirection] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [originalScript, setOriginalScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copied, setCopied] = useState(false);

  // 方向和子类选项
  const contentDirections = [
    { value: '', label: '不限' },
    { value: '教知识', label: '教知识', sub: '涨粉' },
    { value: '聊观点', label: '聊观点', sub: '人设' },
    { value: '讲故事', label: '讲故事', sub: '信任' },
    { value: '晒过程', label: '晒过程', sub: '变现' },
  ];

  const subCategories: Record<string, { value: string; label: string }[]> = {
    '教知识': [
      { value: '', label: '不限' },
      { value: '解题型', label: '解题型' },
      { value: '揭秘型', label: '揭秘型' },
      { value: '推荐型', label: '推荐型' },
    ],
    '聊观点': [
      { value: '', label: '不限' },
      { value: '归纳型', label: '归纳型' },
      { value: '反常识型', label: '反常识型' },
      { value: '对立型', label: '对立型' },
    ],
    '讲故事': [
      { value: '', label: '不限' },
      { value: '成就故事', label: '成就故事' },
      { value: '客户故事', label: '客户故事' },
      { value: '踩坑故事', label: '踩坑故事' },
    ],
    '晒过程': [
      { value: '', label: '不限' },
      { value: '挑战型', label: '挑战型' },
      { value: '体验型', label: '体验型' },
      { value: '测评改造型', label: '测评改造型' },
    ],
  };

  const getSubCategories = () => {
    return subCategories[direction] || [{ value: '', label: '不限' }];
  };

  // 选题库弹窗
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [scriptLibraryTopics, setScriptLibraryTopics] = useState<(Topic & { scripts?: ScriptRecord[] })[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicSearchKeyword, setTopicSearchKeyword] = useState('');

  // 路径二：改写创作
  const [sourceContent, setSourceContent] = useState('');
  const [rewriteTemplate, setRewriteTemplate] = useState<Template | null>(null);
  const [rewrittenScript, setRewrittenScript] = useState('');
  const [generatingRewrite, setGeneratingRewrite] = useState(false);
  const [rewriteCopied, setRewriteCopied] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null);

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
    const topicId = searchParams.get('topicId');
    const topic = searchParams.get('topic');
    const summary = searchParams.get('summary');
    const angle = searchParams.get('angle');
    if (topic) {
      return { topicId, topic, summary: summary || '', angle: angle || '' };
    }
    return null;
  }, [searchParams]);

  // 当前选题ID（用于关联脚本）
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates('script');
  }, []);

  // 如果有 URL 参数，设置选题信息
  useEffect(() => {
    if (topicFromUrl) {
      setTopicTitle(topicFromUrl.topic);
      setTopicSummary(topicFromUrl.summary);
      setTopicAngle(topicFromUrl.angle);
      setCurrentTopicId(topicFromUrl.topicId || null);
      setSelectedTopic({
        id: topicFromUrl.topicId || 'from-url',
        title: topicFromUrl.topic,
        summary: topicFromUrl.summary,
        angle: topicFromUrl.angle,
        selected: true,
      });
    }

    const sourceContentFromUrl = searchParams.get('source');
    if (sourceContentFromUrl) {
      try {
        const decoded = decodeURIComponent(sourceContentFromUrl);
        setSourceContent(decoded);
        setActiveTab('rewrite');
      } catch (e) {
        console.error('Failed to decode source content:', e);
      }
    }
  }, [topicFromUrl, searchParams]);

  // 打开选题库弹窗
  const handleOpenTopicPicker = async () => {
    if (!storeId) return;
    setShowTopicPicker(true);
    setLoadingTopics(true);
    try {
      // 调用新的 topics API 获取选题列表
      const res = await fetch(`/api/store/topics?storeId=${storeId}&includeScripts=true`);
      const data = await res.json();
      setScriptLibraryTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  // 从选题库选择选题
  const handleSelectFromLibrary = (topic: Topic & { scripts?: ScriptRecord[] } & { topic?: string; corePoints?: string }) => {
    // 填充选题信息到表单
    setSelectedTopic({
      id: topic.id,
      title: topic.title || topic.topic || '未命名选题',
      summary: topic.summary || '',
      angle: topic.angle || '',
      selected: true,
    });
    setTopicTitle(topic.title || topic.topic || '');
    setTopicSummary(topic.summary || '');
    setTopicAngle(topic.angle || '');
    setCorePoints(topic.corePoints || '');
    // 设置选题ID（用于关联新创建的脚本）
    setCurrentTopicId(topic.id || null);
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

  const renderScriptContent = (content: string) => {
    const metadata: ScriptMetadata = extractScriptMetadata(content);
    
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
      <div className="bg-gray-900 text-gray-100 rounded p-3 text-xs leading-5 whitespace-pre-wrap">
        {content}
      </div>
    );
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

  // 保存脚本到数据库
  const handleSaveScript = async (content: string, type: 'original' | 'rewrite') => {
    if (!storeId) return;
    
    setSavingScript(true);
    try {
      const res = await fetch('/api/store/ai-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          type,
          topicId: currentTopicId, // 关联选题ID
          topicTitle: type === 'original' ? (topicTitle || selectedTopic?.title) : null,
          summary: type === 'original' ? (topicSummary || selectedTopic?.summary) : null,
          angle: type === 'original' ? (topicAngle || selectedTopic?.angle) : null,
          corePoints: type === 'original' ? corePoints : null,
          sourceContent: type === 'rewrite' ? sourceContent : null,
          templateName: type === 'original' ? selectedTemplate?.name : rewriteTemplate?.name,
          content,
          direction: type === 'original' ? direction || '' : '',
          subCategory: type === 'original' ? subCategory || '' : '',
        }),
      });
      const data = await res.json();
      if (data.script) {
        setSavedScriptId(data.script.id);
        // 如果是新创建的选题，更新 currentTopicId
        if (data.script.topicId && !currentTopicId) {
          setCurrentTopicId(data.script.topicId);
        }
        setTimeout(() => setSavedScriptId(null), 2000);
      }
    } catch (error) {
      console.error('Failed to save script:', error);
      alert('保存失败');
    } finally {
      setSavingScript(false);
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
                {/* 第一列：身份 + 找选题 + 内容方向 */}
                <div className="col-span-4 flex flex-col space-y-2 min-h-0 h-full">
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
                              onClick={() => { setSelectedTopic(null); setTopicTitle(''); setTopicSummary(''); setTopicAngle(''); setCurrentTopicId(null); }}
                            >
                              清除
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 第二步：内容方向 */}
                      <div className="flex-1 min-h-0 overflow-y-auto">
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
                              <label className="text-[10px] text-gray-500 block mb-0.5">内容方向</label>
                              <div className="grid grid-cols-2 gap-1">
                                {contentDirections.slice(1).map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      setDirection(opt.value);
                                      setSubCategory('');
                                    }}
                                    className={`flex flex-col items-center justify-center px-1 py-1.5 rounded border text-[10px] transition-all ${
                                      direction === opt.value
                                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20 text-green-800'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                                  >
                                    <span className="font-medium leading-tight">{opt.label}</span>
                                    <span className="text-gray-400 mt-0.5">{opt.sub}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">子类</label>
                              <div className="grid grid-cols-2 gap-1">
                                {getSubCategories().map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setSubCategory(opt.value)}
                                    disabled={!direction}
                                    className={`px-2 py-1.5 rounded border text-[10px] transition-all ${
                                      subCategory === opt.value
                                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20 text-green-800'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    } ${!direction ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
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
                    </CardContent>
                  </Card>
                </div>

                {/* 第二列：选择模板并生成 */}
                <div className="col-span-3 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardContent className="p-2.5 flex flex-col flex-1 min-h-0">
                      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">3</span>
                        <span className="text-[11px] font-medium text-gray-900">选择模板</span>
                      </div>
                      {templates.length === 0 ? (
                        <div className="text-[11px] text-gray-400 py-2 border rounded text-center shrink-0">
                          暂无模板
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                          {templates.map(template => (
                            <div
                              key={template.id}
                              className={`p-1.5 border rounded cursor-pointer transition-all flex items-center justify-between ${
                                selectedTemplate?.id === template.id
                                  ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                  : 'hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-[11px] text-gray-900 truncate">{template.name}</span>
                                {template.description && (
                                  <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-500 border rounded px-1 py-[1px] ml-2 shrink-0">{template.type === 'script' ? '文案创作' : '文案改写'}</span>
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
                              生成脚本
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 第三列：脚本输出区 */}
                <div className="col-span-5 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardHeader className="border-b bg-gray-50/50 py-1.5 px-3 shrink-0">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xs flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-green-600" />
                            生成区
                          </CardTitle>
                          {originalScript && selectedTopic && (
                            <span className="text-[10px] text-gray-500">{selectedTopic.title.slice(0, 12)}...</span>
                          )}
                        </div>
                        {originalScript && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveScript(originalScript, 'original')}
                            disabled={savingScript}
                            className="h-6 text-[11px]"
                          >
                            {savingScript ? <Loader2 className="h-3 w-3 animate-spin" /> : savedScriptId ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                            {savedScriptId ? '已保存' : '保存'}
                          </Button>
                        )}
                      </div>
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
                {/* 第一列：身份 + 粘贴原文 */}
                <div className="col-span-4 flex flex-col space-y-2 min-h-0 h-full">
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

                  <Card className="border shadow-sm flex-1 min-h-0 flex flex-col">
                    <CardContent className="p-2.5 flex flex-col flex-1 min-h-0">
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
                    </CardContent>
                  </Card>
                </div>

                {/* 第二列：选择模板并生成 */}
                <div className="col-span-3 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardContent className="p-2.5 flex flex-col flex-1 min-h-0">
                      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold">2</span>
                        <span className="text-[11px] font-medium text-gray-900">选择模板</span>
                      </div>
                      {templates.length === 0 ? (
                        <div className="text-[11px] text-gray-400 py-2 border rounded text-center shrink-0">
                          暂无模板
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                          {templates.map(template => (
                            <div
                              key={template.id}
                              className={`p-1.5 border rounded cursor-pointer transition-all flex items-center justify-between ${
                                rewriteTemplate?.id === template.id
                                  ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                  : 'hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => setRewriteTemplate(template)}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-[11px] text-gray-900 truncate">{template.name}</span>
                                {template.description && (
                                  <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-500 border rounded px-1 py-[1px] ml-2 shrink-0">{template.type === 'script' ? '文案创作' : '文案改写'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 shrink-0">
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
                              AI改写
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 第三列：改写输出区 */}
                <div className="col-span-5 min-h-0 h-full">
                  <Card className="border shadow-sm h-full flex flex-col">
                    <CardHeader className="border-b bg-gray-50/50 py-1.5 px-3 shrink-0">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xs flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-green-600" />
                            改写区
                          </CardTitle>
                          {rewrittenScript && rewriteTemplate && (
                            <span className="text-[10px] text-gray-500">{rewriteTemplate.name}</span>
                          )}
                        </div>
                        {rewrittenScript && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveScript(rewrittenScript, 'rewrite')}
                            disabled={savingScript}
                            className="h-6 text-[11px]"
                          >
                            {savingScript ? <Loader2 className="h-3 w-3 animate-spin" /> : savedScriptId ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                            {savedScriptId ? '已保存' : '保存'}
                          </Button>
                        )}
                      </div>
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
                  .filter((t: any) => !topicSearchKeyword || (t.topic && t.topic.includes(topicSearchKeyword)))
                  .map((topic: any) => {
                    const isSelected = selectedTopic?.id === topic.id;
                    const hasScripts = topic.scripts && topic.scripts.length > 0;
                    const latestScript = hasScripts ? topic.scripts[0] : null;
                    return (
                      <div
                        key={topic.id}
                        className={`border rounded-lg cursor-pointer transition-all overflow-hidden group ${isSelected ? 'border-green-500 bg-green-50/60 ring-1 ring-green-500/30' : 'hover:border-green-300 hover:bg-gray-50/60'}`}
                        onClick={() => handleSelectFromLibrary(topic)}
                      >
                        <div className={`w-[4px] bg-green-500 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`} />
                        <div className="p-3">
                          <div className="flex gap-2 mb-2">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-0.5">选题</div>
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                {isSelected && <Check className="h-3.5 w-3.5 text-green-600" />}
                                {topic.topic || '未命名选题'}
                              </div>
                            </div>
                            {hasScripts && (
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">脚本</div>
                                <Badge variant="outline" className="text-[10px]">{topic.scripts.length}条</Badge>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="text-gray-500">切入角度：</span>
                            {topic.angle || topic.summary || '-'}
                          </div>
                          {latestScript && (
                            <div className="bg-gray-50 rounded p-2 border border-gray-100">
                              <div className="text-xs text-green-600 font-medium mb-1">📝 脚本预览</div>
                              <div className="text-xs text-gray-700 line-clamp-2" title={latestScript.content}>
                                {latestScript.content.slice(0, 100)}{latestScript.content.length > 100 ? '...' : ''}
                              </div>
                            </div>
                          )}
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
