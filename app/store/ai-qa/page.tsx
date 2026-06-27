'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';
import { Loader2, Search, MessageCircle, Zap, Send, ClipboardList, MessageSquare, X } from '@/lib/icons';
import { ChatMarkdown } from '@/components/ui/chat-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  related?: { id: string; question: string; answer: string }[];
  timestamp: Date;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  category: string;
  hitCount: number;
}

const quickSuggestions = [
  '产后多久可以开始运动？',
  '哺乳期可以减肥吗？',
  '产后腰痛怎么办？',
];

export default function StoreAIPage() {
  const [viewMode, setViewMode] = useState<'chat' | 'list'>('chat');
  const [items, setItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);

  const pagination = useDataTablePagination(items, 15);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/store/ai-qa');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isSearching) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSearching(true);

    try {
      const res = await fetch('/api/store/ai-qa/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      });
      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || '抱歉，暂无相关答案',
        related: data.related || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to search:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '查询失败，请稍后重试',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFB]">
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">问答查询</h1>
            <p className="text-sm text-gray-500 mt-0.5 md:mt-1">基于知识库的智能问答助手</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant={viewMode === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chat')}
              className={`w-full sm:w-auto ${viewMode === 'chat' ? 'bg-[#004349] hover:bg-[#003540]' : ''}`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              对话
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`w-full sm:w-auto ${viewMode === 'list' ? 'bg-[#004349] hover:bg-[#003540]' : ''}`}
            >
              <ClipboardList className="h-4 w-4 mr-1" />
              列表
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'chat' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 break-words overflow-hidden ${
                    msg.role === 'user'
                      ? 'bg-[#004349] text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  <ChatMarkdown content={msg.content} />

                  {msg.role === 'assistant' && msg.related && msg.related.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">相关问答：</p>
                      <div className="space-y-2">
                        {msg.related.map(item => (
                          <div key={item.id} className="text-sm bg-gray-50 rounded-lg p-2">
                            <p className="font-medium text-gray-700">Q: {item.question}</p>
                            <p className="text-gray-600 mt-1">A: {item.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSearching && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>正在检索...</span>
                  </div>
                </div>
              </div>
            )}

            {!isSearching && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-24 h-24 rounded-full bg-[#0D5C63] flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-white font-bold text-3xl">问</span>
                </div>
                <h3 className="text-base font-bold text-[#191C1D] mb-2">问答助手</h3>
                <p className="text-lg text-[#3F484A] text-center mb-10">输入您的问题，我将为您从知识库中查找答案</p>
                
                <div className="flex flex-wrap justify-center gap-3">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSuggestion(suggestion)}
                      className="px-4 py-2 rounded-full bg-[rgba(38,93,71,0.1)] border border-[rgba(38,93,71,0.2)] text-sm font-bold text-[#084531] hover:bg-[rgba(38,93,71,0.15)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {viewMode === 'chat' && (
        <div className="border-t border-gray-200 bg-white/70 backdrop-blur-sm p-4 pb-8 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  清空对话
                </Button>
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,67,73,0.1)] to-[rgba(135,78,88,0.1)] rounded-3xl blur-md opacity-30 -m-1" />
              
              <div className="relative flex items-end gap-2 bg-white rounded-3xl border border-[rgba(191,200,201,0.3)] shadow-md p-2">
                <div className="flex items-center justify-center w-10 h-10">
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <svg width="12.5" height="20" viewBox="0 0 12.5 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.5 7.5C4.5 4.46243 6.46243 2 9 2C11.5376 2 13.5 4.46243 13.5 7.5V10.5C13.5 11.3284 12.8284 12 12 12H11.5L10 20L8.5 12H8C7.17157 12 6.5 11.3284 6.5 10.5V7.5Z" stroke="#6F797A" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="有问题，尽管问，Shift+Enter换行"
                    disabled={isSearching}
                    rows={1}
                    className="w-full resize-none bg-transparent text-base leading-[29.25px] text-[#191C1D] placeholder:text-[rgba(111,121,122,0.6)] focus:outline-none disabled:opacity-50"
                    style={{ minHeight: '29.25px', maxHeight: '87.75px' }}
                  />
                </div>
                
                <button
                  onClick={handleSend}
                  disabled={isSearching || !input.trim()}
                  className="w-12 h-12 rounded-full bg-[#004349] flex items-center justify-center shadow-md hover:bg-[#003540] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.354 8L1.35403 15.5L8.35403 8M18.354 8L8.35403 1M18.354 8L1.35403 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-[#6F797A] text-center mt-3 leading-[15px]">
              问答助手提供的是通用信息，如有紧急情况请咨询专业人士
            </p>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="flex-1 px-4 md:px-6 pb-6 flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <Card className="flex-1">
              <CardContent className="py-12 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无问答数据</p>
                <p className="text-sm mt-1">请在管理端配置问答内容</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex-1 rounded-lg border bg-white overflow-hidden min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 sticky top-0 z-10">
                        <TableHead className="w-[120px]">分类</TableHead>
                        <TableHead>问题</TableHead>
                        <TableHead>答案</TableHead>
                        <TableHead className="w-[100px]">关键词</TableHead>
                        <TableHead className="w-[80px] text-center">命中次数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.pagedItems.map(item => (
                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                          <TableCell>
                            {item.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(38,93,71,0.1)] text-[#084531]">
                                {item.category}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[300px]">
                            <span className="truncate block" title={item.question}>
                              {item.question}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm max-w-[400px]">
                            <span className="line-clamp-2 block" title={item.answer}>
                              {item.answer}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-500 text-xs">
                            {item.keywords ? (
                              <span className="truncate block" title={item.keywords}>
                                {item.keywords}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-gray-400 text-sm">
                            {item.hitCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t p-3 bg-gray-50 flex-shrink-0">
                  <DataTablePagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onPageChange={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}