'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PlanProject {
  name: string;
  suggestedCount: string;
}

export interface PlanSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actualCounts: Record<string, string>) => Promise<void> | void;
  coreProjects: PlanProject[];
  assistantProjects: PlanProject[];
  customerName: string;
}

const PlanSaveModal: React.FC<PlanSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  coreProjects,
  assistantProjects,
  customerName,
}) => {
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialCounts: Record<string, string> = {};
      coreProjects.forEach((p) => {
        initialCounts[`core_${p.name}`] = p.suggestedCount.replace(/[^\d]/g, '') || '';
      });
      assistantProjects.forEach((p) => {
        initialCounts[`assistant_${p.name}`] = p.suggestedCount.replace(/[^\d]/g, '') || '';
      });
      setActualCounts(initialCounts);
    }
  }, [isOpen, coreProjects, assistantProjects]);

  const handleInputChange = (key: string, value: string) => {
    const filtered = value.replace(/[^\d]/g, '');
    setActualCounts((prev) => ({
      ...prev,
      [key]: filtered,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(actualCounts);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const hasProjects = coreProjects.length > 0 || assistantProjects.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>保存调理方案</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-800">客户姓名：</span>
            {customerName}
          </div>

          {coreProjects.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-800 mb-2">核心项目</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 text-xs font-medium text-gray-600 px-3 py-2 border-b border-gray-200">
                  <span>项目名称</span>
                  <span className="text-center">建议次数</span>
                  <span className="text-center">实际次数</span>
                </div>
                {coreProjects.map((project, idx) => (
                  <div
                    key={`core-${idx}`}
                    className="grid grid-cols-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-800">{project.name}</span>
                    <span className="text-center text-gray-500">{project.suggestedCount}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="text-center w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                      value={actualCounts[`core_${project.name}`] || ''}
                      onChange={(e) => handleInputChange(`core_${project.name}`, e.target.value)}
                      placeholder="请输入"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {assistantProjects.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-800 mb-2">辅助项目</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 text-xs font-medium text-gray-600 px-3 py-2 border-b border-gray-200">
                  <span>项目名称</span>
                  <span className="text-center">建议次数</span>
                  <span className="text-center">实际次数</span>
                </div>
                {assistantProjects.map((project, idx) => (
                  <div
                    key={`assistant-${idx}`}
                    className="grid grid-cols-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-800">{project.name}</span>
                    <span className="text-center text-gray-500">{project.suggestedCount}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="text-center w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                      value={actualCounts[`assistant_${project.name}`] || ''}
                      onChange={(e) => handleInputChange(`assistant_${project.name}`, e.target.value)}
                      placeholder="请输入"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasProjects && (
            <div className="text-sm text-gray-500 text-center py-4">暂无项目数据可保存</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasProjects}>
            {loading ? '保存中...' : '保存方案'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanSaveModal;
