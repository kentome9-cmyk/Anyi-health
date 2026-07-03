'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MessageSquare, Eye, Trash2 } from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Session {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMenstrualChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/admin/menstrual-chat/sessions?pageSize=100');
      const data = await res.json();
      setSessions(data.list || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/menstrual-chat/sessions/${sessionId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个对话记录吗？')) return;
    
    try {
      const res = await fetch(`/api/admin/menstrual-chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadSessions();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Delete session error:', error);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.includes(searchTerm) ||
    session.storeName.includes(searchTerm)
  );

  const pagination = useDataTablePagination(filteredSessions, 10);
  const pagedSessions = pagination.pagedItems;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">对话记录</h2>
        <p className="text-gray-500">查看所有门店的月经助手对话记录</p>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索对话标题、门店名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 对话记录列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">共 {filteredSessions.length} 条记录</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700 text-center">会话标题</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">所属门店</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">消息数量</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">创建时间</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">更新时间</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : pagedSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                pagedSessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{session.title}</TableCell>
                    <TableCell className="text-gray-600 text-center">{session.storeName}</TableCell>
                    <TableCell className="text-gray-600 text-center">{session.messageCount}</TableCell>
                    <TableCell className="text-gray-600 text-center">{formatDate(session.createdAt)}</TableCell>
                    <TableCell className="text-gray-600 text-center">{formatDate(session.updatedAt)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            loadMessages(session.id);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          查看
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="text-sm text-red-600 hover:text-red-900 flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </button>
                      </div>
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
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="!max-w-[800px] !w-[95vw] max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedSession?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">所属门店：</span>
                  {selectedSession.storeName}
                </div>
                <div>
                  <span className="font-medium text-gray-500">消息数量：</span>
                  {selectedSession.messageCount} 条
                </div>
                <div>
                  <span className="font-medium text-gray-500">创建时间：</span>
                  {formatDate(selectedSession.createdAt)}
                </div>
                <div>
                  <span className="font-medium text-gray-500">更新时间：</span>
                  {formatDate(selectedSession.updatedAt)}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">对话内容</h4>
                {loadingMessages ? (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无消息</div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-[#044332] text-white'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium ${
                              msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {msg.role === 'user' ? '用户' : '助手'}
                            </span>
                            <span className={`text-xs ${
                              msg.role === 'user' ? 'text-white/50' : 'text-gray-400'
                            }`}>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user' ? 'text-white' : 'text-gray-700'
                          }`}>
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}