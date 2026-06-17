'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BrainCircuit, Eye } from '@/lib/icons';

export default function StoreDashboard() {
  const router = useRouter();
  const { userName, storeId } = useAuthStore();

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">欢迎使用产后健康管理系统</h1>
        <p className="text-gray-500 mt-1">门店端 - {userName || '门店用户'} | 门店 ID: {storeId}</p>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/store/customers')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">客户管理</CardTitle>
            <Users className="h-8 w-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">管理门店客户档案和服务记录</p>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Eye className="mr-2 h-4 w-4" /> 查看客户
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/store/ai-analysis')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">方案管理</CardTitle>
            <FileText className="h-8 w-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">查看调理方案和报告记录</p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <FileText className="mr-2 h-4 w-4" /> 查看方案
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(`/store/report-submit?storeId=${storeId}`)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">AI 分析</CardTitle>
            <BrainCircuit className="h-8 w-8 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">AI 智能分析生成调理方案</p>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              <BrainCircuit className="mr-2 h-4 w-4" /> 开始分析
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
