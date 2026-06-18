'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, CheckCircle, MessageSquare, Database, Play, Loader2 } from '@/lib/icons';

interface AiSettings {
  id?: string;
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

export default function AdminAiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>({
    apiKey: '',
    agentId: '',
    datasetId: '',
    baseUrl: '',
    modelId: '',
    embeddingApiKey: '',
    embeddingBaseUrl: '',
    embeddingModelId: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<'reply' | 'embedding' | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json();
      if (data) {
        setSettings({
          apiKey: data.apiKey || '',
          agentId: data.agentId || '',
          datasetId: data.datasetId || '',
          baseUrl: data.baseUrl || '',
          modelId: data.modelId || '',
          embeddingApiKey: data.embeddingApiKey || '',
          embeddingBaseUrl: data.embeddingBaseUrl || '',
          embeddingModelId: data.embeddingModelId || '',
        });
      }
    } catch (error) {
      console.error('Failed to load ai settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AiSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
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
        body: JSON.stringify({ apiType }),
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
          <p className="text-gray-500">配置 AI 服务商参数</p>
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
              用于 AI 对话、分析和内容生成的 API 配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="请输入 API Key"
                value={settings.apiKey || ''}
                onChange={(e) => handleChange('apiKey', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID</Label>
              <Input
                id="modelId"
                placeholder="如：doubao-seed-1.6-250615"
                value={settings.modelId || ''}
                onChange={(e) => handleChange('modelId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="如：https://ark.cn-beijing.volces.com/api/v3"
                value={settings.baseUrl || ''}
                onChange={(e) => handleChange('baseUrl', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  placeholder="可选"
                  value={settings.agentId || ''}
                  onChange={(e) => handleChange('agentId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="datasetId">Dataset ID</Label>
                <Input
                  id="datasetId"
                  placeholder="可选"
                  value={settings.datasetId || ''}
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
              <Label htmlFor="embeddingApiKey">Embedding API Key</Label>
              <Input
                id="embeddingApiKey"
                type="password"
                placeholder="请输入 Embedding API Key"
                value={settings.embeddingApiKey || ''}
                onChange={(e) => handleChange('embeddingApiKey', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embeddingModelId">Embedding Model ID</Label>
              <Input
                id="embeddingModelId"
                placeholder="如：doubao-embedding-text-256k"
                value={settings.embeddingModelId || ''}
                onChange={(e) => handleChange('embeddingModelId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embeddingBaseUrl">Embedding Base URL</Label>
              <Input
                id="embeddingBaseUrl"
                placeholder="如：https://ark.cn-beijing.volces.com/api/v3"
                value={settings.embeddingBaseUrl || ''}
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

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
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
              <p className="font-medium text-gray-900 mb-1">配置步骤</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>请先在 AI 服务商平台申请 API Key 和相关参数</li>
                <li>将申请的参数填写到上方配置中</li>
                <li>点击&quot;保存设置&quot;保存配置</li>
                <li>配置成功后，系统将启用 AI 分析功能</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
