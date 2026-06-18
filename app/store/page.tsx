'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BrainCircuit, BookOpen, Sparkles, User, Wand2, Library, MessageCircleQuestion } from '@/lib/icons';

export default function StoreDashboard() {
  const router = useRouter();
  const { userName, storeId } = useAuthStore();

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 页面标题 */}
      <div className="p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">欢迎使用产后健康管理系统</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">门店端 - {userName || '门店用户'}</p>
      </div>

      {/* 方案搭配模块 */}
      <div className="px-4 md:px-6 pb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" /> 方案搭配
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/customers')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Users className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">客户管理</h3>
              <p className="text-xs text-gray-500 mt-1">客户档案和服务记录</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push(`/store/report-submit?storeId=${storeId}`)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <BrainCircuit className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">在线分析</h3>
              <p className="text-xs text-gray-500 mt-1">AI 智能分析生成方案</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hidden md:block"
            onClick={() => router.push('/store/ai-analysis')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <FileText className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">方案管理</h3>
              <p className="text-xs text-gray-500 mt-1">查看方案和报告记录</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 问答查询模块 */}
      <div className="px-4 md:px-6 pb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-green-600" /> 问答查询
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/ai-qa')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <MessageCircleQuestion className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">知识问答</h3>
              <p className="text-xs text-gray-500 mt-1">查询产后健康知识</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/ai-qa')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <BookOpen className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">调理知识</h3>
              <p className="text-xs text-gray-500 mt-1">项目和方案知识</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 短视频助手模块 */}
      <div className="px-4 md:px-6 pb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-green-600" /> 短视频助手
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/ai-identity')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <User className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">创作者身份</h3>
              <p className="text-xs text-gray-500 mt-1">设定赛道和人设风格</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/ai-content')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Wand2 className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">内容创作</h3>
              <p className="text-xs text-gray-500 mt-1">AI 生成短视频脚本</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
            onClick={() => router.push('/store/ai-scripts')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Library className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">脚本库</h3>
              <p className="text-xs text-gray-500 mt-1">查看和管理已生成脚本</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
