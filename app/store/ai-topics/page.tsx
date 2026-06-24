'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lightbulb, Sparkles, Lock, User, Wand2, Library, Check, Send } from '@/lib/icons';
import NextLink from 'next/link';

interface Topic {
  id?: string;
  title: string;
  summary?: string;
  angle?: string;
  corePoints?: string;
  savedAt?: number;
}

interface CreatorIdentity {
  id: string;
  contentTrack: string;
  personaStyle: string;
  targetAudience: string;
  videoTone?: string | null;
}

export default function StoreTopicsPage() {
  const router = useRouter();
  const { storeId, userType, isAuthenticated, _hasHydrated } = useAuthStore();

  // 选题配置
  const [accountStage, setAccountStage] = useState('冷启动期');
  const [contentDirection, setContentDirection] = useState('全部');
  const [decisionStage, setDecisionStage] = useState('');
  const [topicCount, setTopicCount] = useState('10');

  // 创作者身份
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);

  // 选题结果
  const [topics, setTopics] = useState<Topic[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (userType !== 'store_user' && userType !== 'admin') {
      router.push('/login');
      return;
    }
  }, [_hasHydrated, isAuthenticated, userType, router]);

  // 加载创作者身份
  useEffect(() => {
    if (!storeId) return;
    loadIdentity();
  }, [storeId]);

  const loadIdentity = async () => {
    try {
      const res = await fetch(`/api/store/creator-identity?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.identity) {
          setIdentity(data.identity);
        }
      }
    } catch (err) {
      console.error('Failed to load identity:', err);
    }
  };

  const handleGenerate = async () => {
    if (!identity) {
      setError('请先设置创作者身份');
      return;
    }

    setGenerating(true);
    setError(null);
    setTopics([]);

    try {
      const res = await fetch('/api/store/ai-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          accountStage,
          contentDirection,
          decisionStage,
          topicCount: parseInt(topicCount),
        }),
      });

      const data = await res.json();
      
      if (data.topics && data.topics.length > 0) {
        setTopics(data.topics);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('生成选题失败:', err);
      setError('生成选题失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToScript = async (topic: Topic) => {
    if (!storeId) {
      console.log('storeId is null, userType:', userType);
      alert('请先选择门店');
      return;
    }

    const payload = {
      storeId,
      topic: topic.title,
      summary: topic.summary || null,
      angle: topic.angle || null,
      corePoints: topic.corePoints || null,
    };
    console.log('Saving topic payload:', JSON.stringify(payload, null, 2));
    try {
      // 调用 /api/store/topics 创建选题
      const res = await fetch('/api/store/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('API response data:', data);
        // 保存成功后，更新本地状态，标记该选题已保存，并存储返回的topicId
        setTopics(prev => prev.map(t => 
          t.title === topic.title ? { ...t, id: data.topic?.id, savedAt: Date.now() } : t
        ));
        // 3秒后清除成功提示
        setTimeout(() => {
          setTopics(prev => prev.map(t => 
            t.title === topic.title ? { ...t, savedAt: undefined } : t
          ));
        }, 3000);
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save topic:', err);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 页面标题 */}
      <div className="p-4 md:p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">选题策划</h1>
        </div>
        <p className="text-sm text-gray-500">基于创作者身份，智能生成精准匹配的短视频选题</p>
      </div>

      {/* 两列布局 */}
      <div className="px-4 md:px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左边：基础信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                选题配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 创作者身份锁定 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">已锁定创作者身份</span>
                  </div>
                  <NextLink href="/store/ai-identity">
                    <Button variant="outline" size="sm" className="text-xs h-7 border-green-200 text-green-700 hover:bg-green-100">
                      <User className="h-3 w-3 mr-1" />
                      {identity ? '修改' : '设置'}
                    </Button>
                  </NextLink>
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
                  </div>
                ) : (
                  <span className="text-sm text-amber-700">尚未设置，请先配置创作者身份</span>
                )}
              </div>

              {/* 账号阶段 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">账号阶段</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '冷启动期', label: '冷启动期', sub: '0-1000粉' },
                    { value: '成长期', label: '成长期', sub: '1000-1万粉' },
                    { value: '成熟期', label: '成熟期', sub: '1万+粉' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAccountStage(opt.value)}
                      className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border text-xs transition-all ${
                        accountStage === opt.value
                          ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20 text-green-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-gray-400 mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 内容方向 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">内容方向</div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { value: '全部', label: '全部', sub: '不限' },
                    { value: '教知识', label: '教知识', sub: '涨粉' },
                    { value: '聊观点', label: '聊观点', sub: '人设' },
                    { value: '讲故事', label: '讲故事', sub: '信任' },
                    { value: '晒过程', label: '晒过程', sub: '变现' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setContentDirection(opt.value)}
                      className={`flex flex-col items-center justify-center px-1 py-2.5 rounded-lg border text-xs transition-all ${
                        contentDirection === opt.value
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

              {/* 用户决策阶段 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">用户决策阶段</div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: '', label: '不限', sub: '自由发挥' },
                    { value: '选择困难', label: '选择困难', sub: '在犹豫' },
                    { value: '已决定', label: '已决定', sub: '在比较' },
                    { value: '执行中', label: '执行中', sub: '在实施' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDecisionStage(opt.value)}
                      className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border text-xs transition-all ${
                        decisionStage === opt.value
                          ? 'border-green-500 bg-green-50 ring-1 ring-green-500/20 text-green-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-gray-400 mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成条数 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">生成条数</Label>
                <Select value={topicCount} onValueChange={setTopicCount}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 条</SelectItem>
                    <SelectItem value="10">10 条</SelectItem>
                    <SelectItem value="15">15 条</SelectItem>
                    <SelectItem value="20">20 条</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !identity}
                className="w-full bg-green-600 hover:bg-green-700 h-10"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                {generating ? '正在生成选题...' : '生成选题'}
              </Button>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右边：选题结果 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  生成的选题
                  {topics.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{topics.length} 条</Badge>
                  )}
                </CardTitle>
                {topics.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Loader2 className={`h-3 w-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                    换一批
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-green-600 animate-spin mb-3" />
                  <p className="text-sm text-gray-500">正在生成选题...</p>
                </div>
              ) : topics.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {topics.map((topic, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:border-green-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 mb-1">{topic.title}</div>
                          <div className="text-xs text-gray-500 mb-1">{topic.summary}</div>
                          {topic.angle && (
                            <div className="text-xs text-green-600">
                              💡 {topic.angle}
                            </div>
                          )}
                          {topic.savedAt && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              已保存成功
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveToScript(topic)}
                            disabled={!_hasHydrated || !!topic.id}
                            className="h-7 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50"
                          >
                            {topic.id ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                已存
                              </>
                            ) : (
                              <>
                                <Library className="h-3 w-3 mr-1" />
                                存选题
                              </>
                            )}
                          </Button>
                          <NextLink 
                            href={`/store/ai-content?topicId=${topic.id || ''}&topic=${encodeURIComponent(topic.title)}&summary=${encodeURIComponent(topic.summary || '')}&angle=${encodeURIComponent(topic.angle || '')}`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs w-full"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              去创作
                            </Button>
                          </NextLink>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Lightbulb className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm">配置参数后点击「生成选题」</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
