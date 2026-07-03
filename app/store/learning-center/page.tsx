'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  FileText,
  Presentation,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
} from '@/lib/icons';

interface LearningResource {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string | null;
  content: string | null;
  filePath: string | null;
  pageCount: number | null;
  fileSize: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface LearningCategory {
  id: string;
  name: string;
  sortOrder: number;
}

const TYPE_LABELS: Record<string, string> = {
  md: 'MD文档',
  ppt: 'PDF/PPT',
  video: '视频',
};

function truncate(text: string | null, len: number): string {
  if (!text) return '-';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StoreLearningCenterPage() {
  const router = useRouter();
  const { userType, isAuthenticated, _hasHydrated } = useAuthStore();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (userType !== 'store_user' && userType !== 'admin') {
      router.push('/login');
      return;
    }
  }, [_hasHydrated, isAuthenticated, userType, router]);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/store/learning-resources');
      const data = await res.json();
      const list: LearningResource[] = Array.isArray(data)
        ? data
        : data.list || [];
      const listCategories: LearningCategory[] = Array.isArray(data?.categories)
        ? data.categories
        : [];
      setResources(list);
      setCategories(listCategories);
    } catch (e) {
      console.error('Failed to load learning resources:', e);
    } finally {
      setLoading(false);
    }
  };

  const groupedResources = useMemo(() => {
    const grouped: Record<string, LearningResource[]> = {};
    // 优先用后端返回的分类列表作为分组容器（保证顺序与管理员侧一致）
    categories.forEach((cat) => {
      grouped[cat.name] = [];
    });

    const filtered = searchKeyword.trim()
      ? resources.filter((r) => {
          const kw = searchKeyword.toLowerCase();
          return (
            (r.title || '').toLowerCase().includes(kw) ||
            (r.description || '').toLowerCase().includes(kw) ||
            (r.category || '').toLowerCase().includes(kw)
          );
        })
      : resources;

    filtered.forEach((r) => {
      const cat = r.category || '其他';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(r);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    return grouped;
  }, [resources, categories, searchKeyword]);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const newExpanded = new Set<string>();
      Object.keys(groupedResources).forEach((cat) => {
        if (groupedResources[cat].length > 0) {
          newExpanded.add(cat);
        }
      });
      setExpandedCategories(newExpanded);
    }
  }, [searchKeyword]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSearch = () => setSearchKeyword(searchInput.trim());
  const handleReset = () => {
    setSearchInput('');
    setSearchKeyword('');
  };

  const handleView = (resource: LearningResource) => {
    router.push(`/store/learning-center/${resource.id}`);
  };

  const totalCount = resources.length;
  const visibleCount = Object.values(groupedResources).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* 顶部：标题 + 搜索 */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">学习中心</h1>
            <p className="text-sm text-slate-500 mt-1">
              按分类浏览门店学习资源
              {!loading && (
                <span className="ml-2 text-slate-400">· 共 {totalCount} 份</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索资源..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-9 w-64 h-9 bg-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              搜索
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-9 border-slate-200"
            >
              重置
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : visibleCount === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 py-20 text-center text-slate-500">
            {searchKeyword.trim() ? '未找到匹配的学习资源' : '暂无学习资源'}
          </div>
        ) : (
          <div className="space-y-3">
            {[
              ...categories.map((c) => c.name),
              ...Object.keys(groupedResources).filter(
                (name) => !categories.some((c) => c.name === name)
              ),
            ].map((categoryName) => {
              const items = groupedResources[categoryName] || [];
              if (items.length === 0) return null;

              const isExpanded = expandedCategories.has(categoryName) || searchKeyword.trim() !== '';

              return (
                <div
                  key={categoryName}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* 分类标题 */}
                  <button
                    onClick={() => toggleCategory(categoryName)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                      <h2 className="text-base font-semibold text-slate-900">
                        {categoryName}
                      </h2>
                      <span className="text-sm text-slate-500">（{items.length}）</span>
                    </div>
                  </button>

                  {/* 表格 */}
                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                            <th className="text-left font-medium px-5 py-2.5 w-[12%]">类型</th>
                            <th className="text-left font-medium px-3 py-2.5 w-[28%]">标题</th>
                            <th className="text-left font-medium px-3 py-2.5 w-[30%]">描述</th>
                            <th className="text-left font-medium px-3 py-2.5 w-[18%]">文件信息</th>
                            <th className="text-center font-medium px-3 py-2.5 w-[12%]">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((resource, idx) => (
                            <tr
                              key={resource.id}
                              className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                                idx === items.length - 1 ? 'border-b-0' : ''
                              }`}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                  {resource.type === 'md' ? (
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                  ) : resource.type === 'video' ? (
                                    <Play className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <Presentation className="h-4 w-4 text-amber-600" />
                                  )}
                                  <span className="text-xs text-slate-600">
                                    {TYPE_LABELS[resource.type]}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-medium text-slate-900" title={resource.title}>
                                  {resource.title}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-slate-500" title={resource.description || ''}>
                                  {truncate(resource.description, 50)}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="text-xs text-slate-500 space-y-0.5">
                                  {resource.fileSize && <div>{resource.fileSize}</div>}
                                  {resource.pageCount && <div>{resource.pageCount} 页</div>}
                                  <div className="text-slate-400">{formatDate(resource.createdAt)}</div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(resource)}
                                  className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  查看
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
