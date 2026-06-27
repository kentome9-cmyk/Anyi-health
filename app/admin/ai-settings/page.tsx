'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, CheckCircle, MessageSquare, Database, Play, Loader2 } from '@/lib/icons';

const MODULES = [
  { id: 'default', name: '健康助手', description: '通用 AI 对话、健康分析和建议功能' },
  { id: 'qa', name: '知识库问答', description: '门店知识库问答检索' },
  { id: 'content', name: '内容创作', description: '文案、选题、脚本创作' },
];

interface AiSettings {
  id?: string;
  module: string;
  apiKey: string | null;
  agentId: string | null;
  datasetId: string | null;
  baseUrl: string | null;
  modelId: string | null;
  embeddingApiKey: string | null;
  embeddingBaseUrl: string | null;
  embeddingModelId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TestResult {
  type: 'reply' | 'embedding';
  success: boolean;
  message: string;
}

const emptySettings: AiSettings = {
  module: 'default',
  apiKey: '',
  agentId: '',
  datasetId: '',
  baseUrl: '',
  modelId: '',
  embeddingApiKey: '',
  embeddingBaseUrl: '',
  embeddingModelId: '',
};

const normalizeAiSettings = (item: AiSettings): AiSettings => ({
  ...item,
  apiKey: item.apiKey || '',
  agentId: item.agentId || '',
  datasetId: item.datasetId || '',
  baseUrl: item.baseUrl || '',
  modelId: item.modelId || '',
  embeddingApiKey: item.embeddingApiKey || '',
  embeddingBaseUrl: item.embeddingBaseUrl || '',
  embeddingModelId: item.embeddingModelId || '',
});

export default function AdminAiSettingsPage() {
  const [activeModule, setActiveModule] = useState('default');
  const [allSettings, setAllSettings] = useState<Record<string, AiSettings>>({});
  const [currentSettings, setCurrentSettings] = useState<AiSettings>(emptySettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<'reply' | 'embedding' | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadAllSettings();
  }, []);

  useEffect(() => {
    // 切换模块时更新当前设置
    if (allSettings[activeModule]) {
      setCurrentSettings(allSettings[activeModule]);
    } else {
      setCurrentSettings({ ...emptySettings, module: activeModule });
    }
    setSaved(false);
    setTestResult(null);
  }, [activeModule, allSettings]);

  const loadAllSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json();
      
      const settingsMap: Record<string, AiSettings> = {};
      if (Array.isArray(data)) {
        data.forEach((item: AiSettings) => {
          settingsMap[item.module] = normalizeAiSettings(item);
        });
      }
      
      setAllSettings(settingsMap);
      
      // 设置当前模块
      const current = settingsMap[activeModule];
      if (current) {
        setCurrentSettings(current);
      } else {
        setCurrentSettings({ ...emptySettings, module: activeModule });
      }
    } catch (error) {
      console.error('Failed to load ai settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AiSettings, value: string) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings),
      });
      if (res.ok) {
        const savedData = await res.json();
        setAllSettings((prev) => ({
          ...prev,
          [savedData.module]: normalizeAiSettings(savedData),
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save ai settings:', error);
    }
  };

  const handleTest = async (apiType: 'reply' | 'embedding') => {
    setTesting(apiType);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType, module: activeModule }),
      });
      const data = await res.json();
      setTestResult({
        type: apiType,
        success: data.success,
        message: data.message,
      });
    } catch (error) {
      setTestResult({
        type: apiType,
        success: false,
        message: '测试请求失败',
      });
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI 设置</h2>
          <p className="text-gray-500">配置各模块 AI 服务参数</p>
        </div>
        <div className="flex gap-3 items-center">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              已保存
            </span>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>

      {/* 模块选择 Tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule}>
        <TabsList className="grid w-full grid-cols-3">
          {MODULES.map((mod) => (
            <TabsTrigger key={mod.id} value={mod.id}>
              {mod.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {MODULES.map((mod) => (
          <TabsContent key={mod.id} value={mod.id} className="space-y-6">
            <p className="text-sm text-gray-500">{mod.description}</p>

            {/* API 配置 - 两列布局 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 答复 API 配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    答复 API
                  </CardTitle>
                  <CardDescription>
                    用于 {mod.name} 的 AI 对话和分析
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`apiKey-${mod.id}`}>API Key</Label>
                    <Input
                      id={`apiKey-${mod.id}`}
                      type="password"
                      placeholder="请输入 API Key"
                      value={currentSettings.apiKey || ''}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`modelId-${mod.id}`}>Model ID</Label>
                    <Input
                      id={`modelId-${mod.id}`}
                      placeholder="如：doubao-seed-1.6-250615"
                      value={currentSettings.modelId || ''}
                      onChange={(e) => handleChange('modelId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`baseUrl-${mod.id}`}>Base URL</Label>
                    <Input
                      id={`baseUrl-${mod.id}`}
                      placeholder="如：https://ark.cn-beijing.volces.com/api/v3"
                      value={currentSettings.baseUrl || ''}
                      onChange={(e) => handleChange('baseUrl', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`agentId-${mod.id}`}>Agent ID</Label>
                      <Input
                        id={`agentId-${mod.id}`}
                        placeholder="可选"
                        value={currentSettings.agentId || ''}
                        onChange={(e) => handleChange('agentId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`datasetId-${mod.id}`}>Dataset ID</Label>
                      <Input
                        id={`datasetId-${mod.id}`}
                        placeholder="可选"
                        value={currentSettings.datasetId || ''}
                        onChange={(e) => handleChange('datasetId', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleTest('reply')}
                      disabled={testing === 'reply'}
                    >
                      {testing === 'reply' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      测试答复 API
                    </Button>
                    {testResult?.type === 'reply' && (
                      <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 向量 API 配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-600" />
                    向量 API（Embedding）
                  </CardTitle>
                  <CardDescription>
                    用于知识库检索和文本向量化
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`embeddingApiKey-${mod.id}`}>Embedding API Key</Label>
                    <Input
                      id={`embeddingApiKey-${mod.id}`}
                      type="password"
                      placeholder="请输入 Embedding API Key"
                      value={currentSettings.embeddingApiKey || ''}
                      onChange={(e) => handleChange('embeddingApiKey', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`embeddingModelId-${mod.id}`}>Embedding Model ID</Label>
                    <Input
                      id={`embeddingModelId-${mod.id}`}
                      placeholder="如：doubao-embedding-text-256k"
                      value={currentSettings.embeddingModelId || ''}
                      onChange={(e) => handleChange('embeddingModelId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`embeddingBaseUrl-${mod.id}`}>Embedding Base URL</Label>
                    <Input
                      id={`embeddingBaseUrl-${mod.id}`}
                      placeholder="如：https://ark.cn-beijing.volces.com/api/v3"
                      value={currentSettings.embeddingBaseUrl || ''}
                      onChange={(e) => handleChange('embeddingBaseUrl', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleTest('embedding')}
                      disabled={testing === 'embedding'}
                    >
                      {testing === 'embedding' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      测试向量 API
                    </Button>
                    {testResult?.type === 'embedding' && (
                      <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 模块使用说明 */}
            {mod.id === 'qa' && (
              <Card>
                <CardHeader>
                  <CardTitle>知识库问答配置建议</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>建议使用 <code className="px-1 py-0.5 bg-gray-100 rounded">gpt-4o-mini</code> 或 <code className="px-1 py-0.5 bg-gray-100 rounded">doubao-seed</code> 等轻量模型，</p>
                  <p>因为知识库问答主要是检索匹配，不需要复杂的推理能力。</p>
                </CardContent>
              </Card>
            )}
            {mod.id === 'content' && (
              <Card>
                <CardHeader>
                  <CardTitle>内容创作配置建议</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>建议使用 <code className="px-1 py-0.5 bg-gray-100 rounded">gpt-4o</code> 或 <code className="px-1 py-0.5 bg-gray-100 rounded">doubao-pro</code> 等主力模型，</p>
                  <p>因为内容创作需要更好的创意和长文本生成能力。</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* 通用使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>通用配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900 mb-1">答复 API</p>
              <p>用于 AI 对话分析和内容生成，支持豆包、火山引擎等兼容 OpenAI 接口的大模型。</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-gray-900 mb-1">向量 API</p>
              <p>用于知识库检索时的文本向量化，可以提升搜索匹配的准确性。如不使用向量检索，可留空。</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-gray-900 mb-1">配置优先级</p>
              <p>各模块优先使用自己的配置；如未配置，则使用&quot;默认配置&quot;。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}