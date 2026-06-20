'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MessageCircle, Zap, Send } from '@/lib/icons';

interface Role {
  id: string;
  name: string;
}

interface Category {
  name: string;
  count: number;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  category: string;
  hitCount: number;
  role: {
    id: string;
    name: string;
  };
}

interface RelatedItem {
  id: string;
  question: string;
  answer: string;
}

export default function StoreAIPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<QAItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  // AI 问答状态
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // 加载问答列表
  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole) params.set('roleId', selectedRole);
      if (selectedCategory) params.set('category', selectedCategory);
      if (keyword) params.set('keyword', keyword);

      const res = await fetch(`/api/store/ai-qa?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setRoles(data.roles || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [selectedRole, selectedCategory]);

  // 搜索问答
  const handleSearch = () => {
    loadItems();
  };

  // AI 问答
  const handleAIQuery = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setAnswer('');
    setRelated([]);
    try {
      const res = await fetch('/api/store/ai-qa/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setAnswer(data.answer || '暂无答案');
      setRelated(data.related || []);
    } catch (error) {
      console.error('Failed to search:', error);
      setAnswer('查询失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAIQuery();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="p-4 border-b bg-white flex items-center gap-4">
        <h2 className="font-semibold text-gray-900">AI 问答助手</h2>
        <div className="flex-1 max-w-md flex gap-2">
          <Input
            placeholder="搜索问题或关键词..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">全部角色</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">全部分类</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showAIChat ? 'default' : 'outline'}
          onClick={() => setShowAIChat(!showAIChat)}
        >
          <Zap className="h-4 w-4 mr-2" />
          AI 智能问答
        </Button>
      </div>

      {/* AI 问答区域 */}
      {showAIChat && (
        <div className="border-b bg-gradient-to-r from-green-50 to-emerald-50 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                placeholder="输入您的问题，AI 将从知识库中查找答案..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleAIQuery}
                disabled={isSearching || !query.trim()}
                className="shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {answer && (
              <div className="mt-4 bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">AI 回答</span>
                </div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {answer}
                </div>

                {related.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">相关问答：</p>
                    <div className="space-y-2">
                      {related.map(item => (
                        <div key={item.id} className="text-sm">
                          <p className="text-gray-900 font-medium">Q: {item.question}</p>
                          <p className="text-gray-600 mt-1">A: {item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 问答列表 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无问答数据</p>
            <p className="text-sm mt-1">请在管理端配置问答内容</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {items.map(item => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.role?.name || '未分类'}
                    </Badge>
                    {item.category && (
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    命中 {item.hitCount} 次
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Q: {item.question}
                </h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">
                  A: {item.answer}
                </p>
                {item.keywords && (
                  <p className="text-xs text-gray-400 mt-2">
                    关键词：{item.keywords}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
