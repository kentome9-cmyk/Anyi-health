'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Check, Sparkles } from '@/lib/icons';
import { useCreatorIdentity } from '@/hooks/use-creator-identity';
import { useAuthStore } from '@/stores/auth.store';

export default function StoreAIIdentityPage() {
  const { storeId } = useAuthStore();
  const { identity, loading, loadIdentity } = useCreatorIdentity();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contentTrack: identity?.contentTrack || '',
    personaStyle: identity?.personaStyle || '',
    targetAudience: identity?.targetAudience || '',
    videoTone: identity?.videoTone || '',
    videoDuration: identity?.videoDuration || '',
  });

  useEffect(() => {
    if (identity) {
      setForm({
        contentTrack: identity.contentTrack || '',
        personaStyle: identity.personaStyle || '',
        targetAudience: identity.targetAudience || '',
        videoTone: identity.videoTone || '',
        videoDuration: identity.videoDuration || '',
      });
    }
  }, [identity]);

  const handleSave = async () => {
    if (!form.contentTrack || !form.personaStyle || !form.targetAudience) {
      alert('请填写必填项');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/store/creator-identity?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.identity) {
        await loadIdentity();
        alert('保存成功');
      }
    } catch (error) {
      console.error('Failed to save identity:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 text-green-600" />
          创作者身份设置
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          设置您的创作者身份信息，这是所有AI生成内容的核心约束
        </p>
      </div>

      {/* 当前身份状态 */}
      {identity && (
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">已设置创作者身份</span>
              </div>
              <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                全局锁定
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 设置表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            {identity ? '修改身份信息' : '设置身份信息'}
          </CardTitle>
          <CardDescription className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            <Lock className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            此身份为全局核心约束，一次设置永久生效，所有AI生成逻辑优先级：固定身份 {'>'} 模板样式 {'>'} 素材内容
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                内容赛道 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="例如：产后健康管理 / 母婴育儿 / 家庭理财 / 职场成长..."
                value={form.contentTrack}
                onChange={e => setForm(prev => ({ ...prev, contentTrack: e.target.value }))}
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                人设风格 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="例如：专业温暖的产后康复师 / 经验分享的宝妈 / 幽默接地气的普通人..."
                value={form.personaStyle}
                onChange={e => setForm(prev => ({ ...prev, personaStyle: e.target.value }))}
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                目标受众 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="例如：25-35岁产后宝妈，关注身体健康和自我成长 / 年轻职场女性..."
                value={form.targetAudience}
                onChange={e => setForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  视频调性（可选）
                </label>
                <Input
                  placeholder="例如：亲切口语化 / 专业干货 / 情感共鸣 / 轻松幽默..."
                  value={form.videoTone}
                  onChange={e => setForm(prev => ({ ...prev, videoTone: e.target.value }))}
                  className="h-10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  视频时长（可选）
                </label>
                <Input
                  placeholder="例如：60秒口播 / 30秒快节奏 / 3分钟深度讲解..."
                  value={form.videoDuration}
                  onChange={e => setForm(prev => ({ ...prev, videoDuration: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={loadIdentity}>
                重置
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {identity ? '更新身份' : '保存并锁定身份'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
