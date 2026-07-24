'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Upload, CheckCircle, CircleAlert, Loader2, Trash2 } from '@/lib/icons';

const files = [
  {
    key: 'stores.csv',
    title: '门店表',
    description: '少量门店明细，用来支撑门店列表和详情',
  },
  {
    key: 'customers.csv',
    title: '客户表',
    description: '少量客户明细，通过门店编号关联门店',
  },
  {
    key: 'service-records.csv',
    title: '服务记录表',
    description: '少量报告、方案、身体记录、AI 分析、聊天记录',
  },
  {
    key: 'video-scripts.csv',
    title: '短视频文案表',
    description: '少量短视频选题和脚本，通过门店编号关联门店',
  },
] as const;

const dashboardFields = [
  { key: 'totalStores', title: '门店总数', defaultValue: '58' },
  { key: 'totalCustomers', title: '客户总数', defaultValue: '12860' },
  { key: 'totalPlans', title: '方案总数', defaultValue: '9360' },
  { key: 'activePlans', title: '进行中方案', defaultValue: '2140' },
  { key: 'reports', title: '客户报告', defaultValue: '11280' },
  { key: 'aiAnalyses', title: 'AI 分析', defaultValue: '5280' },
  { key: 'scriptRecords', title: '脚本记录', defaultValue: '1860' },
  { key: 'topics', title: '选题', defaultValue: '960' },
  { key: 'knowledgeBase', title: '知识库', defaultValue: '320' },
  { key: 'qaItems', title: '问答库', defaultValue: '680' },
  { key: 'prompts', title: '提示词', defaultValue: '48' },
  { key: 'learningResources', title: '学习资源', defaultValue: '120' },
  { key: 'chatSessions', title: '月经会话', defaultValue: '2480' },
  { key: 'chatMessages', title: '月经消息', defaultValue: '18600' },
] as const;

const trendFields = [
  { key: 'loginCount', title: '登录次数', description: '首页 7 日趋势里的登录次数总量', defaultValue: '1240' },
  { key: 'operationCount', title: '操作次数', description: '首页 7 日趋势里的操作日志总量', defaultValue: '6800' },
  { key: 'aiAnalysisCount', title: 'AI 分析次数', description: '首页 7 日趋势里的 AI 分析总量', defaultValue: '1850' },
  { key: 'chatMessageCount', title: '聊天消息', description: '首页 7 日趋势里的聊天消息总量', defaultValue: '9200' },
] as const;

type DemoFileKey = (typeof files)[number]['key'];
type DashboardFieldKey = (typeof dashboardFields)[number]['key'];
type TrendFieldKey = (typeof trendFields)[number]['key'];

type ImportTotals = {
  stores: number;
  customers: number;
  reports: number;
  plans: number;
  bodyRecords: number;
  aiAnalyses: number;
  chatSessions: number;
  chatMessages: number;
  topics: number;
  scripts: number;
  loginLogs: number;
  operationLogs: number;
};

export default function DemoDataImportPage() {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [dashboardCounts, setDashboardCounts] = useState<Record<DashboardFieldKey, string>>(() =>
    Object.fromEntries(dashboardFields.map((item) => [item.key, item.defaultValue])) as Record<DashboardFieldKey, string>
  );
  const [trendCounts, setTrendCounts] = useState<Record<TrendFieldKey, string>>(() =>
    Object.fromEntries(trendFields.map((item) => [item.key, item.defaultValue])) as Record<TrendFieldKey, string>
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [totals, setTotals] = useState<ImportTotals | null>(null);

  const selectedCount = files.filter((item) => selectedFiles[item.key]).length;

  const appendDashboardConfig = (formData: FormData) => {
    for (const item of dashboardFields) {
      formData.append(item.key, dashboardCounts[item.key] || '0');
    }
    for (const item of trendFields) {
      formData.append(item.key, trendCounts[item.key] || '0');
    }
  };

  const handleNumberChange = <T extends string>(
    key: T,
    value: string,
    setter: React.Dispatch<React.SetStateAction<Record<T, string>>>
  ) => {
    setter((prev) => ({ ...prev, [key]: value.replace(/[^\d]/g, '') }));
  };

  const submitForm = async (formData: FormData, loadingState: string) => {
    setError('');
    setMessage('');
    setTotals(null);
    appendDashboardConfig(formData);
    setLoadingKey(loadingState);

    try {
      const res = await fetch('/api/admin/demo-data/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '导入失败');
        return;
      }
      setMessage(data.message || '保存完成');
      setTotals(data.totals || null);
    } catch {
      setError('网络错误，操作失败');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleImport = async (fileKey?: DemoFileKey) => {
    const formData = new FormData();
    const targetFiles = fileKey ? files.filter((item) => item.key === fileKey) : files;

    for (const item of targetFiles) {
      const file = selectedFiles[item.key];
      if (file) {
        formData.append(item.key, file);
      }
    }

    if (!Array.from(formData.keys()).some((key) => String(key).endsWith('.csv'))) {
      setError(fileKey ? '请先选择这张 CSV 文件' : '请先选择至少一张 CSV 文件');
      return;
    }

    await submitForm(formData, fileKey || 'all');
  };

  const handleSaveDashboard = async () => {
    const formData = new FormData();
    formData.append('dashboardOnly', '1');
    await submitForm(formData, 'dashboard');
  };

  const handleClearDemoData = async () => {
    if (!window.confirm('确定清空当前演示数据吗？真实门店和真实客户不会受影响。')) {
      return;
    }

    setError('');
    setMessage('');
    setTotals(null);
    setLoadingKey('reset');

    try {
      const res = await fetch('/api/admin/demo-data/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '清空失败');
        return;
      }
      setMessage(data.message || '演示数据已清空');
    } catch {
      setError('网络错误，操作失败');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">演示数据导入</h2>
        <p className="text-gray-500">
          首页规模数字使用模拟看板配置；CSV 只需要少量空数据支撑列表和详情页。
        </p>
      </div>

      <Card className="border border-amber-200 bg-amber-50 ring-0">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-amber-800">
            <CircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              演示首页会显示这里填写的模拟数据，不再依赖真实明细数量。真实 admin 仍然只看真实数据库统计。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 ring-0">
        <CardHeader>
          <CardTitle>首页模拟总览</CardTitle>
          <CardDescription>这里控制 demo 首页顶部卡片和右侧模块数量。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardFields.map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="text-sm font-medium text-gray-800">{item.title}</label>
                <input
                  type="number"
                  min="0"
                  max="99999999"
                  value={dashboardCounts[item.key]}
                  onChange={(event) => handleNumberChange(item.key, event.target.value, setDashboardCounts)}
                  className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#044332] focus:ring-2 focus:ring-[#044332]/10"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 ring-0">
        <CardHeader>
          <CardTitle>7 日数据趋势</CardTitle>
          <CardDescription>这里控制 demo 首页趋势图，系统会自动分布到最近 7 天。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trendFields.map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="text-sm font-medium text-gray-800">{item.title}</label>
                <input
                  type="number"
                  min="0"
                  max="99999999"
                  value={trendCounts[item.key]}
                  onChange={(event) => handleNumberChange(item.key, event.target.value, setTrendCounts)}
                  className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#044332] focus:ring-2 focus:ring-[#044332]/10"
                />
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={handleSaveDashboard} disabled={Boolean(loadingKey)} className="h-9 px-4">
              {loadingKey === 'dashboard' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  保存首页模拟数据
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {files.map((item) => {
          const selectedFile = selectedFiles[item.key];
          const importing = loadingKey === item.key;

          return (
            <Card key={item.key} className="border border-gray-200 ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[#044332]" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    setSelectedFiles((prev) => ({
                      ...prev,
                      [item.key]: event.target.files?.[0] || null,
                    }));
                  }}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-[#044332] file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-[#033528]"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedFile?.name || '未选择文件'}</span>
                  <span>{item.key}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleImport(item.key)}
                    disabled={!selectedFile || Boolean(loadingKey)}
                    className="h-9 px-4"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        导入中
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        导入此表
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {message}
          </div>
        </div>
      )}

      {totals && (
        <Card className="border border-gray-200 ring-0">
          <CardHeader>
            <CardTitle>导入结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              {Object.entries(totals).map(([key, value]) => (
                <div key={key} className="rounded border border-gray-200 bg-white p-3">
                  <div className="text-gray-500">{key}</div>
                  <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          onClick={handleClearDemoData}
          disabled={Boolean(loadingKey)}
          className="h-9 border border-red-200 bg-white px-4 text-red-700 hover:bg-red-50"
        >
          {loadingKey === 'reset' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              清空中
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              清空演示数据
            </>
          )}
        </Button>
        <Button
          type="button"
          onClick={() => handleImport()}
          disabled={selectedCount === 0 || Boolean(loadingKey)}
          className="h-9 px-4"
        >
          {loadingKey === 'all' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              导入中
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              导入全部已选择表
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
