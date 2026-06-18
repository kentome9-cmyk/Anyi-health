'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Pencil, Trash2, Plus, X, Lightbulb, MessageSquare, Bot } from '@/lib/icons';

interface Prompt {
  id: string;
  name: string;
  type: string;
  description: string | null;
  content: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const PROMPT_TYPES = [
  { value: 'plan', label: '方案搭配', icon: MessageSquare },
  { value: 'topic', label: '选题策划', icon: Lightbulb },
  { value: 'analysis', label: 'AI 分析', icon: Bot },
];

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'plan',
    description: '',
    content: '',
    isActive: true,
    sortOrder: 0,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const res = await fetch('/api/admin/prompts');
      const data = await res.json();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPrompt(null);
    setFormData({
      name: '',
      type: 'plan',
      description: '',
      content: '',
      isActive: true,
      sortOrder: prompts.length,
    });
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsCreating(false);
    setFormData({
      name: prompt.name,
      type: prompt.type,
      description: prompt.description || '',
      content: prompt.content,
      isActive: prompt.isActive,
      sortOrder: prompt.sortOrder,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个提示词吗？')) return;

    try {
      await fetch(`/api/admin/prompts?id=${id}`, { method: 'DELETE' });
      loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (editingPrompt) {
        await fetch('/api/admin/prompts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPrompt.id, ...formData }),
        });
      } else {
        await fetch('/api/admin/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setIsCreating(false);
      setEditingPrompt(null);
      loadPrompts();
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingPrompt(null);
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = PROMPT_TYPES.find(t => t.value === type);
    const Icon = typeInfo?.icon || Bot;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return PROMPT_TYPES.find(t => t.value === type)?.label || type;
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
          <h2 className="text-2xl font-bold text-gray-900">提示词管理</h2>
          <p className="text-gray-500">管理各类 AI 功能的提示词模板</p>
        </div>
        <div className="flex gap-3 items-center">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              已保存
            </span>
          )}
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            添加提示词
          </Button>
        </div>
      </div>

      {/* 提示词列表 */}
      <div className="grid gap-4">
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bot className="h-12 w-12 mb-4 text-gray-300" />
              <p>暂无提示词模板</p>
              <p className="text-sm mt-1">点击上方按钮添加第一个提示词</p>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className={!prompt.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getTypeIcon(prompt.type)}
                      {getTypeLabel(prompt.type)}
                      <span className="text-xs text-muted-foreground ml-1">({prompt.type})</span>
                    </Badge>
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                    {!prompt.isActive && (
                      <Badge variant="secondary">已禁用</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(prompt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(prompt.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {prompt.description && (
                  <CardDescription className="mt-2">{prompt.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                  {prompt.content.slice(0, 500)}{prompt.content.length > 500 ? '...' : ''}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 编辑/创建弹窗 */}
      {(isCreating || editingPrompt) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-white border-b">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingPrompt ? '编辑提示词' : '添加提示词'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    placeholder="如：方案搭配助手"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">类型</Label>
                  <select
                    id="type"
                    className="w-full h-10 px-3 border rounded-md bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {PROMPT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} ({type.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  placeholder="简短描述此提示词的用途"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">提示词内容</Label>
                <Textarea
                  id="content"
                  placeholder="请输入提示词内容..."
                  className="h-64 font-mono text-sm"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
                <p className="text-sm text-gray-500">
                  提示词中可使用 {'{变量名}'} 占位符，程序会自动替换。
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">启用此提示词</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button onClick={handleSave}>
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
