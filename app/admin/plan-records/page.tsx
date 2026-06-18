'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MessageSquare, Eye } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface AiAnalysis {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  storeId: string;
  storeName: string;
  content: string | null;
  reportContent: string | null;
  structuredData: any;
  createdAt: string;
}

export default function AdminAiAnalysisPage() {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/ai-analysis?pageSize=100');
      const data = await res.json();
      setAnalyses(data.list || []);
    } catch (error) {
      console.error('Failed to load ai analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = analyses.filter(record =>
    record.customerName.includes(searchTerm) ||
    record.storeName.includes(searchTerm) ||
    (record.reportContent?.includes(searchTerm) ?? false)
  );

  const pagination = useDataTablePagination(filteredRecords, 10);
  const pagedRecords = pagination.pagedItems;

  const formatContent = (data: any) => {
    if (!data) return '-';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI 对话记录</h2>
        <p className="text-gray-500">查看所有客户的 AI 分析记录</p>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索客户姓名、门店或内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 对话记录列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">共 {filteredRecords.length} 条记录</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700 text-center">客户姓名</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">所属门店</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">对话内容</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">对话时间</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900 text-center">{record.customerName}</TableCell>
                    <TableCell className="text-gray-600 text-center">{record.storeName}</TableCell>
                    <TableCell className="max-w-xs text-gray-600 truncate text-center">{record.reportContent || '-'}</TableCell>
                    <TableCell className="text-gray-600 text-center">{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        查看详情
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="!max-w-[700px] !w-[95vw] max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle>对话详情</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">客户姓名：</span>
                  {selectedRecord.customerName}
                </div>
                <div>
                  <span className="font-medium text-gray-500">手机号：</span>
                  {selectedRecord.customerPhone}
                </div>
                <div>
                  <span className="font-medium text-gray-500">所属门店：</span>
                  {selectedRecord.storeName}
                </div>
                <div>
                  <span className="font-medium text-gray-500">对话时间：</span>
                  {new Date(selectedRecord.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">客户描述：</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                  {selectedRecord.reportContent || '无内容'}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">AI 分析结果：</h4>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded whitespace-pre-wrap">
                  {selectedRecord.content || '无分析结果'}
                </p>
              </div>

              {selectedRecord.structuredData && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">结构化数据：</h4>
                  <pre className="text-sm text-gray-600 bg-green-50 p-3 rounded whitespace-pre-wrap overflow-x-auto max-h-96">
                    {formatContent(selectedRecord.structuredData)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
