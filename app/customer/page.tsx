'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerDashboard() {
  const { userName, userId } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">产后健康 - 客户中心</h1>
          <Button variant="outline">退出</Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">欢迎，{userName || '客户'}</h2>
          <p className="text-gray-600">查看您的健康报告和调理方案</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>我的报告</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">查看您的健康检测报告</p>
              <Button variant="outline" className="w-full">查看</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我的方案</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">查看专属调理方案</p>
              <Button variant="outline" className="w-full">查看</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>身体记录</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">查看到店记录</p>
              <Button variant="outline" className="w-full">查看</Button>
            </CardContent>
          </Card>
        </div>

        {userId && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <p className="text-green-800">客户 ID: {userId}</p>
          </div>
        )}
      </main>
    </div>
  );
}
