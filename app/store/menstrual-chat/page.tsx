'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, Plus, Trash2, MessageSquare } from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';
import { ChatMarkdown } from '@/components/ui/chat-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  createdAt: string;
}

interface Session {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const quickSuggestions = [
  '月经期注意事项',
  '痛经如何缓解？',
  '经期饮食建议',
  '周期推迟的原因',
];

export default function StoreMenstrualChatPage() {
  const { storeId } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (loadingSessions === false && sessions.length === 0 && !currentSessionId) {
      createNewSession();
    } else if (loadingSessions === false && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [loadingSessions, sessions, currentSessionId]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/store/menstrual-chat/sessions', {
        headers: { 'x-store-id': storeId || '' },
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Load sessions error:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/store/menstrual-chat/sessions/${sessionId}`, {
        headers: { 'x-store-id': storeId || '' },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((msg: Message) => ({
          ...msg,
          reasoning: msg.reasoning || '',
        })));
      }
    } catch (error) {
      console.error('Load session messages error:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/store/menstrual-chat/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': storeId || '',
        },
        body: JSON.stringify({ title: '新对话' }),
      });
      const data = await res.json();
      if (data.session) {
        setCurrentSessionId(data.session.id);
        setMessages([]);
        setInput('');
        loadSessions();
      }
    } catch (error) {
      console.error('Create session error:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个对话吗？')) return;
    
    try {
      await fetch(`/api/store/menstrual-chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'x-store-id': storeId || '' },
      });
      loadSessions();
      if (currentSessionId === sessionId) {
        if (sessions.length > 1) {
          const otherSession = sessions.find(s => s.id !== sessionId);
          setCurrentSessionId(otherSession?.id || null);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Delete session error:', error);
    }
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      reasoning: '',
      createdAt: new Date().toISOString(),
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoning: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/store/menstrual-chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': storeId || '',
        },
        body: JSON.stringify({ 
          message: userMessage.content, 
          sessionId: currentSessionId,
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '发送失败');
      }

      if (!res.body) {
        const data = await res.json();
        setCurrentSessionId(data.sessionId);
        loadSessions();
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.id === assistantMessageId) {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: data.content || '抱歉，暂时无法回答您的问题。',
            };
          }
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'));

          for (const line of lines) {
            const raw = line.replace(/^data:\s*/, '');
            if (!raw) continue;

            let data: { content?: string; reasoning?: string; done?: boolean; error?: string; sessionId?: string };
            try {
              data = JSON.parse(raw);
            } catch {
              continue;
            }

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              if (data.sessionId) {
                setCurrentSessionId(data.sessionId);
              }
              loadSessions();
              continue;
            }

            if (data.content || data.reasoning) {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.id === assistantMessageId) {
                  updated[updated.length - 1] = {
                    ...lastMsg,
                    content: `${lastMsg.content}${data.content || ''}`,
                    reasoning: `${lastMsg.reasoning}${data.reasoning || ''}`,
                  };
                }
                return updated;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : '发送失败，请重试');
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.id === assistantMessageId) {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: '',
            reasoning: '',
          };
        }
        return updated.filter(m => m.content || m.role === 'user');
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFB]">
      {/* 顶部标题栏 */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4">
          {/* 左侧标题 */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">安姨聊天</h1>
            <p className="text-sm text-gray-500 mt-0.5 md:mt-1">智能月经健康咨询助手</p>
          </div>
          
          {/* 右侧按钮 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-5 py-2 rounded-full border border-[#BFC8C9] text-sm font-bold text-[#3F484A] flex items-center gap-2 hover:bg-gray-50 transition-colors w-full sm:w-auto">
                  <svg width="10.5" height="10.5" viewBox="0 0 10.5 10.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.25 9.1875C7.375 9.1875 9.1875 7.375 9.1875 5.25C9.1875 3.125 7.375 1.3125 5.25 1.3125C3.125 1.3125 1.3125 3.125 1.3125 5.25C1.3125 7.375 3.125 9.1875 5.25 9.1875Z" stroke="#3F484A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.25 3.9375V5.25L6.5625 6.5625" stroke="#3F484A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  历史记录
                  <svg width="7" height="4.32" viewBox="0 0 7 4.32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L3.5 3.32L6 1" stroke="#3F484A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 border border-[#E1E3E4] shadow-lg" side="bottom" align="end">
                {/* 标题 */}
                <div className="px-4 py-3 border-b border-[#E1E3E4]">
                  <p className="text-xs font-bold text-[#6F797A] uppercase tracking-wider">最近咨询</p>
                </div>
                
                {/* 会话列表 */}
                <div className="max-h-[300px] overflow-y-auto">
                  {loadingSessions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      暂无历史对话
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                            currentSessionId === session.id ? 'bg-[rgba(0,67,73,0.05)]' : ''
                          }`}
                          onClick={() => selectSession(session.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#191C1D] truncate">
                              {session.title}
                            </p>
                            <p className="text-xs text-[#6F797A]">
                              {formatDate(session.updatedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 查看全部历史 */}
                {sessions.length > 0 && (
                  <div className="px-4 py-2 border-t border-[#E1E3E4]">
                    <button className="w-full text-xs font-bold text-[#004349] hover:text-[#003540]">
                      查看全部历史
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <button
              onClick={createNewSession}
              className="px-5 py-2 rounded-full bg-[#004349] text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm hover:bg-[#003540] transition-colors w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              新对话
            </button>
          </div>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
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
                  {(loading && msg.role === 'assistant' && !msg.content) ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>正在思考...</span>
                    </div>
                  ) : (
                    <>
                      {msg.reasoning && (
                        <div className="mb-3 p-3 bg-[rgba(0,67,73,0.05)] rounded-lg border border-[rgba(0,67,73,0.1)]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-[#004349] animate-pulse" />
                            <span className="text-xs font-bold text-[#004349] uppercase tracking-wider">思考过程</span>
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {msg.reasoning}
                          </p>
                        </div>
                      )}
                      {(loading && msg.role === 'assistant') ? (
                        <div className="flex items-start">
                          <ChatMarkdown content={msg.content} />
                          <span className="inline-block w-1 animate-pulse text-[#004349] ml-1 mt-2 flex-shrink-0">|</span>
                        </div>
                      ) : (
                        <ChatMarkdown content={msg.content} />
                      )}
                    </>
                  )}
                </div>
            </div>
          ))}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              {/* 头像 */}
              <div className="w-24 h-24 rounded-full bg-[#0D5C63] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-white font-bold text-3xl">安</span>
              </div>
              <h3 className="text-base font-bold text-[#191C1D] mb-2">安姨</h3>
              <p className="text-lg text-[#3F484A] text-center mb-10">你好，我是安姨，有任何月经问题都可以问我</p>
              
              {/* 快捷建议按钮 */}
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

      {/* 输入区域 */}
      <div className="border-t border-gray-200 bg-white/70 backdrop-blur-sm p-4 pb-8 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* 背景渐变阴影 */}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,67,73,0.1)] to-[rgba(135,78,88,0.1)] rounded-3xl blur-md opacity-30 -m-1" />
            
            <div className="relative flex items-end gap-2 bg-white rounded-3xl border border-[rgba(191,200,201,0.3)] shadow-md p-2">
              {/* 附件按钮区域 */}
              <div className="flex items-center justify-center w-10 h-10">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <svg width="12.5" height="20" viewBox="0 0 12.5 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 7.5C4.5 4.46243 6.46243 2 9 2C11.5376 2 13.5 4.46243 13.5 7.5V10.5C13.5 11.3284 12.8284 12 12 12H11.5L10 20L8.5 12H8C7.17157 12 6.5 11.3284 6.5 10.5V7.5Z" stroke="#6F797A" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              
              {/* 输入框 */}
              <div className="flex-1">
                <textarea
                  ref={inputRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="有问题，尽管问，Shift+Enter换行"
                  disabled={loading}
                  rows={1}
                  className="w-full resize-none bg-transparent text-base leading-[29.25px] text-[#191C1D] placeholder:text-[rgba(111,121,122,0.6)] focus:outline-none disabled:opacity-50"
                  style={{ minHeight: '29.25px', maxHeight: '87.75px' }}
                />
              </div>
              
              {/* 发送按钮 */}
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-12 h-12 rounded-full bg-[#004349] flex items-center justify-center shadow-md hover:bg-[#003540] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.354 8L1.35403 15.5L8.35403 8M18.354 8L8.35403 1M18.354 8L1.35403 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* 底部提示 */}
          <p className="text-[10px] text-[#6F797A] text-center mt-3 leading-[15px]">
            安姨提供的是通用健康信息，不应被视为专业医疗建议。如有紧急情况请咨询医生。
          </p>
        </div>
      </div>
    </div>
  );
}
