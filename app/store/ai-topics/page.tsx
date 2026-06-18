'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lightbulb, Sparkles, Lock, User, Wand2, Library, Check } from '@/lib/icons';
import NextLink from 'next/link';

interface Topic {
  title: string;
  summary: string;
  angle: string;
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
  const [decisionStage, setDecisionStage] = useState('选择困难');
  const [topicCount, setTopicCount] = useState('10');

  // 创作者身份
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);

  // 选题结果
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
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
      console.log('生成选题返回:', data);
      
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
    if (!storeId) return;

    try {
      const res = await fetch('/api/store/ai-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          title: topic.title,
          scriptContent: `【选题标题】${topic.title}\n\n【内容摘要】${topic.summary}\n\n【切入角度】${topic.angle}`,
          source: 'topic-planner',
          metadata: {
            accountStage,
            contentDirection,
            decisionStage,
            summary: topic.summary,
            angle: topic.angle,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedIds(prev => new Set([...prev, topic.title]));
      }
    } catch (err) {
      console.error('Failed to save script:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 创作者身份锁定区域 */}
      <div className="p-4 md:p-6 pb-0">
        <div className="border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-b-lg">
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
                </div>
              ) : (
                <span className="text-sm text-amber-700">⚠️ 尚未设置，请先配置创作者身份</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NextLink href="/store/ai-scripts">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <Library className="h-3.5 w-3.5 mr-1.5" />
                  脚本库
                </Button>
              </NextLink>
              <NextLink href="/store/ai-identity">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  {identity ? '修改身份' : '设置身份'}
                </Button>
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      {/* 页面标题 */}
      <div className="p-4 md:p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">选题策划</h1>
        </div>
        <p className="text-sm text-gray-500">基于创作者身份，智能生成精准匹配的短视频选题</p>
      </div>

      {/* 配置表单 */}
      <div className="px-4 md:px-6 pb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              选题配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <div className="grid grid-cols-3 gap-2">
                {[
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
      </div>

      {/* 选题结果 */}
      {topics.length > 0 && (
        <div className="px-4 md:px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              生成的选题（共 {topics.length} 个）
            </h2>
          </div>
          <div className="space-y-3">
            {topics.map((topic, idx) => (
              <Card key={idx} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                          {topic.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 ml-8 leading-relaxed">
                        {topic.summary}
                      </p>
                      {topic.angle && (
                        <p className="text-xs text-green-600 ml-8 mt-1">
                          💡 {topic.angle}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveToScript(topic)}
                      disabled={savedIds.has(topic.title)}
                      className="h-8 px-2 flex-shrink-0 text-xs border-green-200 text-green-700 hover:bg-green-50"
                    >
                      {savedIds.has(topic.title) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          已存
                        </>
                      ) : (
                        <>
                          <Library className="h-3 w-3 mr-1" />
                          存脚本
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 底部操作 */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Loader2 className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              换一批选题
            </Button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!generating && topics.length === 0 && !error && (
        <div className="px-4 md:px-6 pb-6">
          <Card className="border border-dashed border-gray-300">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">配置选题参数，点击「生成选题」开始策划</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
