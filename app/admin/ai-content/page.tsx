'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, FileText, Eye, EyeOff } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  variables: any;
  outputFormat: string;
  exampleOutput: string | null;
  roleId: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  role?: {
    id: string;
    name: string;
  } | null;
}

interface AIRole {
  id: string;
  name: string;
}

const OUTPUT_FORMAT_LABELS: Record<string, string> = {
  text: '纯文本',
  markdown: 'Markdown',
  json: 'JSON',
};

const DEFAULT_PROMPTS: Record<string, string> = {
  marketing: `请为以下产品/服务生成营销文案：

产品名称：{{product}}
产品特点：{{features}}
目标用户：{{target}}

要求：
1. 突出产品卖点
2. 语言简洁有力
3. 包含行动号召
4. 适合朋友圈传播`,

  product: `请为以下产品生成详情页内容：

产品名称：{{product}}
产品描述：{{description}}
核心功效：{{effects}}

请生成包含以下部分的内容：
1. 产品亮点
2. 功效说明
3. 适用人群
4. 使用方法`,

  promotion: `请生成促销活动的宣传文案：

活动主题：{{theme}}
活动时间：{{time}}
优惠内容：{{offer}}

要求：
1. 吸引眼球
2. 突出优惠力度
3. 包含报名/参与方式`,
};

export default function AdminAIContentPage() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [roles, setRoles] = useState<AIRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);
  const [templateType, setTemplateType] = useState<string>('marketing');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: DEFAULT_PROMPTS.marketing,
    outputFormat: 'text',
    exampleOutput: '',
    roleId: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<ContentTemplate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesRes, rolesRes] = await Promise.all([
        fetch('/api/admin/ai-content'),
        fetch('/api/admin/ai-roles'),
      ]);
      const templatesData = await templatesRes.json();
      const rolesData = await rolesRes.json();
      setTemplates(templatesData.list || []);
      setRoles(rolesData.list || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTemplateType('marketing');
    setFormData({
      name: '',
      description: '',
      prompt: DEFAULT_PROMPTS.marketing,
      outputFormat: 'text',
      exampleOutput: '',
      roleId: '',
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (template: ContentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      prompt: template.prompt,
      outputFormat: template.outputFormat,
      exampleOutput: template.exampleOutput || '',
      roleId: template.roleId || '',
      isActive: template.isActive,
    });
    setShowDialog(true);
  };

  const handleTemplateTypeChange = (type: string) => {
    setTemplateType(type);
    setFormData((prev) => ({
      ...prev,
      name: '',
      prompt: DEFAULT_PROMPTS[type] || '',
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert('请填写模板名称和提示词');
      return;
    }

    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/admin/ai-content/${editingTemplate.id}`
        : '/api/admin/ai-content';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          roleId: formData.roleId || null,
        }),
      });

      if (res.ok) {
        await loadData();
        setShowDialog(false);
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-content/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除失败');
    }
  };

  const handleToggleActive = async (template: ContentTemplate) => {
    try {
      const res = await fetch(`/api/admin/ai-content/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, isActive: !template.isActive }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const pagination = useDataTablePagination(templates, 10);
  const pagedTemplates = pagination.pagedItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">内容生成模板</h2>
          <p className="text-gray-500">管理 AI 内容生成提示词模板</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新增模板
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-center">模板名称</TableHead>
                <TableHead className="text-center">类型</TableHead>
                <TableHead className="text-center">关联角色</TableHead>
                <TableHead className="text-center">输出格式</TableHead>
                <TableHead className="text-center">使用次数</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    暂无模板，点击上方按钮创建
                  </TableCell>
                </TableRow>
              ) : (
                pagedTemplates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-gray-50">
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{OUTPUT_FORMAT_LABELS[template.outputFormat] || template.outputFormat}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {template.role?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {OUTPUT_FORMAT_LABELS[template.outputFormat] || '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {template.usageCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleActive(template)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          template.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {template.isActive ? (
                          <>
                            <Eye className="h-3 w-3" /> 启用
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> 禁用
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewTemplate(template)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(template)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(template.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && templates.length > 10 && (
            <div className="p-4 border-t">
              <DataTablePagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新增模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">模板类型</label>
              {!editingTemplate && (
                <div className="flex gap-3 mt-1 mb-3">
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeChange('marketing')}
                    className={`px-3 py-1.5 rounded-md text-sm ${
                      templateType === 'marketing'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    营销文案
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeChange('product')}
                    className={`px-3 py-1.5 rounded-md text-sm ${
                      templateType === 'product'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    产品详情
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeChange('promotion')}
                    className={`px-3 py-1.5 rounded-md text-sm ${
                      templateType === 'promotion'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    活动宣传
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">模板名称 *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：朋友圈营销文案"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">关联角色</label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, roleId: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择角色（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">模板描述</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="简要描述这个模板的用途"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">输出格式</label>
                <Select
                  value={formData.outputFormat}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, outputFormat: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">纯文本</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">启用</label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">提示词模板 *</label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                使用 {'{{变量名}}'} 格式定义变量，如 {'{{product}}'}
              </p>
              <Textarea
                value={formData.prompt}
                onChange={(e) => setFormData((prev) => ({ ...prev, prompt: e.target.value }))}
                placeholder="请为以下产品生成营销文案..."
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">示例输出</label>
              <Textarea
                value={formData.exampleOutput}
                onChange={(e) => setFormData((prev) => ({ ...prev, exampleOutput: e.target.value }))}
                placeholder="输入示例，AI 将按照这个风格生成"
                rows={5}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看模板对话框 */}
      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {viewTemplate && (
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">描述：</span>{viewTemplate.description || '-'}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">关联角色：</span>{viewTemplate.role?.name || '-'}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">提示词模板：</h4>
                <pre className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {viewTemplate.prompt}
                </pre>
              </div>
              {viewTemplate.exampleOutput && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">示例输出：</h4>
                  <pre className="bg-blue-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-gray-700">
                    {viewTemplate.exampleOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="!max-w-[500px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">确定要删除这个模板吗？此操作不可恢复。</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
