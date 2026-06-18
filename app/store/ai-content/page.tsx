'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Copy, CheckCheck, Play, FileText, User, Lock, Link, Pencil, Check, RefreshCw, Wand2, Library } from '@/lib/icons';
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
  prompt: string;
  outputFormat: string;
  category: string;
}

interface ScriptRecord {
  id: string;
  type: 'original' | 'rewrite';
  topic?: string;
  corePoints?: string;
  templateName?: string;
  content: string;
  sourceContent?: string;
  createdAt: string;
}

export default function StoreAIContentPage() {
  const { storeId } = useAuthStore();
  const [activeTab, setActiveTab] = useState('original');

  // 创作者身份
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  // 路径一：原创选题
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [corePoints, setCorePoints] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [originalScript, setOriginalScript] = useState('');
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/store/ai-content/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  useEffect(() => {
    loadIdentity();
    loadTemplates();
  }, []);

  // 路径一：生成选题
  const handleGenerateTopics = async () => {
    if (!identity) {
      alert('请先设置创作者身份');
      return;
    }
    setGeneratingTopics(true);
    try {
      const res = await fetch('/api/store/ai-content/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId: identity.id, storeId }),
      });
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics.map((t: any, idx: number) => ({ ...t, id: `topic_${idx}`, selected: false })));
      }
    } catch (error) {
      console.error('Failed to generate topics:', error);
    } finally {
      setGeneratingTopics(false);
    }
  };

  // 选择选题
  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setTopics(prev => prev.map(t => ({ ...t, selected: t.id === topic.id })));
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
          topic: selectedTopic.title,
          summary: selectedTopic.summary,
          angle: selectedTopic.angle,
          corePoints: corePoints,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          templatePrompt: selectedTemplate.prompt,
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
        // 保存到脚本库
        if (storeId) {
          await fetch('/api/store/ai-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              type: 'original',
              topic: selectedTopic.title,
              corePoints: corePoints,
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
          templatePrompt: rewriteTemplate.prompt,
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
    <div className="flex-1 overflow-y-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
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

          {/* 创作者身份锁定区域 - 全局显示 */}
          <div className="border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-b-lg mb-4">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">已锁定创作者身份</span>
                </div>
                {identity ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-white border-green-200 text-green-800">
                      赛道：{identity.contentTrack}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white border-green-200 text-green-800">
                      人设：{identity.personaStyle}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white border-green-200 text-green-800">
                      受众：{identity.targetAudience}
                    </Badge>
                    {identity.videoTone && (
                      <Badge variant="outline" className="text-xs bg-white border-green-200 text-green-800">
                        调性：{identity.videoTone}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-amber-700">⚠️ 尚未设置，请先配置创作者身份</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NextLink href="/store/ai-scripts">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    <Library className="h-3.5 w-3.5 mr-1.5" />
                    脚本库
                  </Button>
                </NextLink>
                <NextLink href="/store/ai-identity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    {identity ? '修改身份' : '设置身份'}
                  </Button>
                </NextLink>
              </div>
            </div>
          </div>

          {/* 路径一：AI定向选题 + 原创脚本生成 */}
          <TabsContent value="original" className="mt-0 flex-1">
            <div className="grid grid-cols-12 gap-4">
              {/* 左侧：选题 + 模板 + 核心观点 */}
              <div className="col-span-5 space-y-4">
                {/* 选题区域 */}
                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      第一步：AI定向选题
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      根据已固定的创作者身份，批量生成匹配的选题方向
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Button
                      onClick={handleGenerateTopics}
                      disabled={generatingTopics || !identity}
                      className="w-full h-10"
                    >
                      {generatingTopics ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          AI生成定向选题
                        </>
                      )}
                    </Button>

                    {topics.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pt-2 border-t">
                        {topics.map((topic, idx) => (
                          <div
                            key={topic.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedTopic?.id === topic.id
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                : 'hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleSelectTopic(topic)}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-400 mt-0.5">
                                #{idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900">
                                  {topic.title}
                                </div>
                                {topic.summary && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {topic.summary}
                                  </p>
                                )}
                              </div>
                              {selectedTopic?.id === topic.id && (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 补充核心观点 */}
                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-green-600" />
                      第二步：补充核心观点
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      补充本条视频专属核心观点、创作侧重（可选）
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="例如：重点强调产后修复的科学方法，避免夸大效果；以第一人称分享经验，语气亲切..."
                      value={corePoints}
                      onChange={e => setCorePoints(e.target.value)}
                      rows={4}
                      className="resize-none text-sm leading-relaxed"
                    />
                  </CardContent>
                </Card>

                {/* 选择模板 */}
                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      第三步：选择模板
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      选择适合的短视频创作模板
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    {templates.length === 0 ? (
                      <div className="text-sm text-gray-400 py-4 border rounded-lg text-center">
                        暂无模板，请联系管理员配置
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedTemplate?.id === template.id
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                : 'hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-gray-900">
                                {template.name}
                              </span>
                              <Badge variant="outline" className="text-xs h-5 px-1.5">
                                {template.category}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 生成按钮 */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateOriginalScript}
                    disabled={generatingScript || !selectedTopic || !selectedTemplate}
                    className="flex-1 h-10"
                  >
                    {generatingScript ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        生成短视频脚本
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 右侧：脚本输出区 */}
              <div className="col-span-7 space-y-4">
                <Card className="border shadow-sm h-full flex flex-col">
                  <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        生成区
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-0.5">
                        AI生成的短视频脚本将显示在这里
                      </CardDescription>
                    </div>
                    {originalScript && (
                      <div className="flex items-center gap-2">
                        {selectedTopic && (
                          <Badge variant="outline" className="text-xs">
                            {selectedTopic.title.slice(0, 15)}...
                          </Badge>
                        )}
                        {selectedTemplate && (
                          <Badge variant="outline" className="text-xs">
                            {selectedTemplate.name}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(originalScript, 'original')}
                          className="h-8"
                        >
                          {copied ? (
                            <>
                              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              复制内容
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    {originalScript ? (
                      <div className="h-full p-6">
                        <div className="bg-gray-900 text-gray-100 rounded-lg p-5 text-sm leading-7 whitespace-pre-wrap h-full overflow-y-auto">
                          {originalScript}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-16 text-gray-400">
                        <Sparkles className="h-10 w-10 mb-3 opacity-40" />
                        <p className="text-sm font-medium text-gray-500">完成左侧三步后点击生成</p>
                        <p className="text-xs mt-1 text-gray-400">
                          AI将基于固定身份 + 选题 + 核心观点 + 模板，生成专属短视频脚本
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 路径二：外部文案导入 + AI改写生成 */}
          <TabsContent value="rewrite" className="mt-0 flex-1">
            <div className="grid grid-cols-12 gap-4">
              {/* 左侧：原文 + 模板 */}
              <div className="col-span-5 space-y-4">
                {/* 原文输入 */}
                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link className="h-4 w-4 text-green-600" />
                      第一步：导入原文
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      粘贴外部文案原文，可直接粘贴链接
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="请粘贴需要改写的外部文案原文...或粘贴链接，系统将自动扒取网络文案"
                      value={sourceContent}
                      onChange={e => setSourceContent(e.target.value)}
                      rows={12}
                      className="resize-none text-sm leading-relaxed"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      💡 提示：可在原文基础上简单删减、微调，保留核心信息
                    </p>
                  </CardContent>
                </Card>

                {/* 选择模板 */}
                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      第二步：选择模板
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      选择对应的短视频创作模板
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    {templates.length === 0 ? (
                      <div className="text-sm text-gray-400 py-4 border rounded-lg text-center">
                        暂无模板，请联系管理员配置
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              rewriteTemplate?.id === template.id
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20'
                                : 'hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => setRewriteTemplate(template)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-gray-900">
                                {template.name}
                              </span>
                              <Badge variant="outline" className="text-xs h-5 px-1.5">
                                {template.category}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 生成按钮 */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateRewrite}
                    disabled={generatingRewrite || !sourceContent.trim() || !rewriteTemplate}
                    className="flex-1 h-10"
                  >
                    {generatingRewrite ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        改写中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        AI身份适配改写
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 右侧：脚本输出区 */}
              <div className="col-span-7 space-y-4">
                <Card className="border shadow-sm h-full flex flex-col">
                  <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        改写区
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-0.5">
                        AI基于固定身份，将外网文案改写为专属风格
                      </CardDescription>
                    </div>
                    {rewrittenScript && (
                      <div className="flex items-center gap-2">
                        {rewriteTemplate && (
                          <Badge variant="outline" className="text-xs">
                            {rewriteTemplate.name}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(rewrittenScript, 'rewrite')}
                          className="h-8"
                        >
                          {rewriteCopied ? (
                            <>
                              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              复制内容
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    {rewrittenScript ? (
                      <div className="h-full p-6">
                        <div className="bg-gray-900 text-gray-100 rounded-lg p-5 text-sm leading-7 whitespace-pre-wrap h-full overflow-y-auto">
                          {rewrittenScript}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-16 text-gray-400">
                        <Wand2 className="h-10 w-10 mb-3 opacity-40" />
                        <p className="text-sm font-medium text-gray-500">填写原文并选择模板后点击生成</p>
                        <p className="text-xs mt-1 text-gray-400">
                          AI将基于固定身份，将外网陌生文案改写为贴合自身赛道、人设、风格的专属脚本
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
