'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, CheckCircle, Settings, Palette, Phone, FileText, Globe, Lock, MessageCircle, TestTube, Loader2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { SystemSettingsMap } from '@/lib/system-settings';
import { ColorPickerField } from './ColorPickerField';
import MDEditor from '@uiw/react-md-editor';

// 自定义输入控件样式：覆盖默认 focus 状态（避免粗 ring + 默认蓝）
// 主题色：#044332；hover：边框加深；focus：绿色边框 + 极淡绿背景 + 2px 半透明绿环
const fieldClass = cn(
  'border-gray-300 bg-white',
  'hover:border-[#044332]/60 hover:bg-[#044332]/5',
  'focus-visible:!border-[#044332] focus-visible:!ring-2 focus-visible:!ring-[#044332]/25',
  'focus:!border-[#044332] focus:!ring-2 focus:!ring-[#044332]/25 focus:bg-[#044332]/5',
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
  const [ossTesting, setOssTesting] = useState(false);
  const [ossTestResult, setOssTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
      setOssTestResult(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOssTest = async () => {
    setOssTesting(true);
    setOssTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/oss-test', {
        method: 'POST',
      });
      const data = await res.json();
      setOssTestResult(data);
    } catch (err) {
      setOssTestResult({ success: false, message: '网络错误' });
    } finally {
      setOssTesting(false);
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
            <span className="flex items-center gap-1 text-[#044332] text-sm">
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

      <Tabs defaultValue="basic" className="flex-1 min-h-0">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">基本设置</TabsTrigger>
          <TabsTrigger value="agreement">协议管理</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="flex-1 min-h-0">
          {/* 设置区：2x2 网格（≥xl 屏），小屏单列。与 AI 设置页保持同一 Card 样式 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
            {/* 站点信息 */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[#044332]" />
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
                  <Phone className="h-5 w-5 text-[#044332]" />
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
                  <FileText className="h-5 w-5 text-[#044332]" />
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
                  <Palette className="h-5 w-5 text-[#044332]" />
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

            {/* 阿里云 OSS */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#044332]" />
                  阿里云 OSS
                </CardTitle>
                <CardDescription>配置文件上传存储服务，所有文件将上传到 anyiai 文件夹</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ossRegion">地域</Label>
                    <Input
                      id="ossRegion"
                      value={settings.ossRegion}
                      onChange={(e) => handleChange('ossRegion', e.target.value)}
                      placeholder="如：oss-cn-hangzhou"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ossBucket">Bucket 名称</Label>
                    <Input
                      id="ossBucket"
                      value={settings.ossBucket}
                      onChange={(e) => handleChange('ossBucket', e.target.value)}
                      placeholder="如：my-bucket"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ossEndpoint">Endpoint（可选）</Label>
                    <Input
                      id="ossEndpoint"
                      value={settings.ossEndpoint}
                      onChange={(e) => handleChange('ossEndpoint', e.target.value)}
                      placeholder="如：oss-cn-hangzhou.aliyuncs.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ossCdnDomain">CDN 加速域名（可选）</Label>
                    <Input
                      id="ossCdnDomain"
                      value={settings.ossCdnDomain}
                      onChange={(e) => handleChange('ossCdnDomain', e.target.value)}
                      placeholder="如：cdn.example.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ossAccessKeyId">AccessKey ID</Label>
                    <Input
                      id="ossAccessKeyId"
                      value={settings.ossAccessKeyId}
                      onChange={(e) => handleChange('ossAccessKeyId', e.target.value)}
                      placeholder="AccessKey ID"
                      className={fieldClass}
                      type={settings.ossAccessKeyId && settings.ossAccessKeyId.includes('*') ? 'password' : 'text'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ossAccessKeySecret">AccessKey Secret</Label>
                    <Input
                      id="ossAccessKeySecret"
                      value={settings.ossAccessKeySecret}
                      onChange={(e) => handleChange('ossAccessKeySecret', e.target.value)}
                      placeholder="AccessKey Secret"
                      className={fieldClass}
                      type="password"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={handleOssTest}
                    disabled={ossTesting || !settings.ossRegion || !settings.ossBucket || !settings.ossAccessKeyId || !settings.ossAccessKeySecret}
                    className="self-start"
                  >
                    {ossTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        测试连接
                      </>
                    )}
                  </Button>
                  {ossTestResult && (
                    <div
                      className={cn(
                        'px-3 py-2 rounded-md text-sm',
                        ossTestResult.success
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      )}
                    >
                      {ossTestResult.success ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {ossTestResult.message}
                        </span>
                      ) : (
                        ossTestResult.message
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 微信小程序配置 */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#044332]" />
                  微信小程序配置
                </CardTitle>
                <CardDescription>配置微信小程序 AppID 和 AppSecret，用于小程序登录</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wxMpAppId">小程序 AppID</Label>
                    <Input
                      id="wxMpAppId"
                      value={settings.wxMpAppId}
                      onChange={(e) => handleChange('wxMpAppId', e.target.value)}
                      placeholder="如：wx1234567890abcdef"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wxMpAppSecret">小程序 AppSecret</Label>
                    <Input
                      id="wxMpAppSecret"
                      value={settings.wxMpAppSecret}
                      onChange={(e) => handleChange('wxMpAppSecret', e.target.value)}
                      placeholder="小程序 AppSecret"
                      className={fieldClass}
                      type="password"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 微信支付配置 */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#044332]" />
                  微信支付配置
                </CardTitle>
                <CardDescription>配置微信商户号、API密钥等信息，用于微信支付</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wxPayMchId">商户号（MCHID）</Label>
                    <Input
                      id="wxPayMchId"
                      value={settings.wxPayMchId}
                      onChange={(e) => handleChange('wxPayMchId', e.target.value)}
                      placeholder="如：1234567890"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wxPayApiV3Key">API v3 密钥</Label>
                    <Input
                      id="wxPayApiV3Key"
                      value={settings.wxPayApiV3Key}
                      onChange={(e) => handleChange('wxPayApiV3Key', e.target.value)}
                      placeholder="32位随机字符串"
                      className={fieldClass}
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wxPaySerialNo">证书序列号</Label>
                    <Input
                      id="wxPaySerialNo"
                      value={settings.wxPaySerialNo}
                      onChange={(e) => handleChange('wxPaySerialNo', e.target.value)}
                      placeholder="证书序列号"
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wxPayPrivateKey">商户私钥（PEM格式）</Label>
                    <Textarea
                      id="wxPayPrivateKey"
                      value={settings.wxPayPrivateKey}
                      onChange={(e) => handleChange('wxPayPrivateKey', e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                      className={cn(fieldClass, 'min-h-[100px] resize-none font-mono text-xs')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agreement" className="flex-1 min-h-0">
          <div className="space-y-4 flex-1 min-h-0">
            {/* 隐私政策 */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#044332]" />
                  隐私政策
                </CardTitle>
                <CardDescription>注册时需勾选同意的隐私政策内容（支持 Markdown 格式）</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto">
                <MDEditor
                  value={settings.privacyPolicy}
                  onChange={(value) => handleChange('privacyPolicy', value || '')}
                  height={500}
                />
              </CardContent>
            </Card>

            {/* 服务条款 */}
            <Card className={cardClass}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#044332]" />
                  服务条款
                </CardTitle>
                <CardDescription>注册时需勾选同意的服务条款内容（支持 Markdown 格式）</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto">
                <MDEditor
                  value={settings.termsOfService}
                  onChange={(value) => handleChange('termsOfService', value || '')}
                  height={500}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
