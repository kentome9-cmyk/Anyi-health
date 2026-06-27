'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, CheckCircle, Settings, Palette, Phone, FileText } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { SystemSettingsMap } from '@/lib/system-settings';
import { ColorPickerField } from './ColorPickerField';

// 自定义输入控件样式：覆盖默认 focus 状态（避免粗 ring + 默认蓝）
// 主题色：emerald-500；hover：边框加深；focus：绿色边框 + 极淡绿背景 + 2px 半透明绿环
const fieldClass = cn(
  'border-gray-300 bg-white',
  'hover:border-emerald-500/60 hover:bg-emerald-50/30',
  'focus-visible:!border-emerald-500 focus-visible:!ring-2 focus-visible:!ring-emerald-500/25',
  'focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-500/25 focus:bg-emerald-50/40',
  'placeholder:text-gray-400',
  'transition-all duration-150'
);

// 统一卡片样式：用清晰的 border 替代默认 ring-1（ring 是 box-shadow 实现的，
// 小卡片密集排布时会显得模糊发虚；真实 border 渲染更干净锐利）
const cardClass = 'flex flex-col min-h-0 ring-0 border border-gray-200';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = <K extends keyof SystemSettingsMap>(
    key: K,
    value: SystemSettingsMap[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '保存失败');
        return;
      }
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !settings) {
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 顶部标题 + 保存按钮 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
          <p className="text-gray-500">配置站点基本信息、客服联系方式、主题色等</p>
        </div>
        <div className="flex gap-3 items-center">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              已保存
            </span>
          )}
          <Button onClick={handleSave} disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* 设置区：2x2 网格（≥xl 屏），小屏单列。与 AI 设置页保持同一 Card 样式 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* 站点信息 */}
        <Card className={cardClass}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              站点基本信息
            </CardTitle>
            <CardDescription>显示在所有页面顶部/底部的站点信息</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">站点名称</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => handleChange('siteName', e.target.value)}
                  maxLength={50}
                  placeholder="如：产后健康管理系统"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteSubtitle">站点副标题</Label>
                <Input
                  id="siteSubtitle"
                  value={settings.siteSubtitle}
                  onChange={(e) => handleChange('siteSubtitle', e.target.value)}
                  maxLength={50}
                  placeholder="如：门店端"
                  className={fieldClass}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 客服信息 */}
        <Card className={cardClass}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              客服联系方式
            </CardTitle>
            <CardDescription>展示给用户/客户的联系方式</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerServicePhone">客服电话</Label>
                <Input
                  id="customerServicePhone"
                  value={settings.customerServicePhone}
                  onChange={(e) => handleChange('customerServicePhone', e.target.value)}
                  maxLength={50}
                  placeholder="如：400-888-8888"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerServiceWechat">客服微信号</Label>
                <Input
                  id="customerServiceWechat"
                  value={settings.customerServiceWechat}
                  onChange={(e) => handleChange('customerServiceWechat', e.target.value)}
                  maxLength={50}
                  placeholder="如：kefu01"
                  className={fieldClass}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 备案信息 */}
        <Card className={cardClass}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              备案与版权
            </CardTitle>
            <CardDescription>ICP 备案号、版权信息等</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
            <div className="space-y-2">
              <Label htmlFor="icpNumber">ICP 备案号</Label>
              <Input
                id="icpNumber"
                value={settings.icpNumber}
                onChange={(e) => handleChange('icpNumber', e.target.value)}
                maxLength={100}
                placeholder="如：京ICP备12345678号"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copyright">版权信息</Label>
              <Textarea
                id="copyright"
                value={settings.copyright}
                onChange={(e) => handleChange('copyright', e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="如：© 2026 xxx 公司 版权所有"
                className={cn(fieldClass, 'min-h-[72px] resize-none')}
              />
            </div>
          </CardContent>
        </Card>

        {/* 主题色 */}
        <Card className={cardClass}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              主题色
            </CardTitle>
            <CardDescription>管理后台和门店端侧边栏的主色</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPickerField
                label="管理后台主色"
                value={settings.themeColor}
                onChange={(v) => handleChange('themeColor', v)}
              />
              <ColorPickerField
                label="门店端主色"
                value={settings.storeThemeColor}
                onChange={(v) => handleChange('storeThemeColor', v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
