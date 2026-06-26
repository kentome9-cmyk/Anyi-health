'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  FileText,
  Presentation,
  ExternalLink,
  Loader2,
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

const CATEGORIES = [
  { value: 'all', label: '全部分类' },
  { value: '培训课程', label: '培训课程' },
  { value: '产品知识', label: '产品知识' },
  { value: '营销技巧', label: '营销技巧' },
  { value: '服务规范', label: '服务规范' },
  { value: '行业资讯', label: '行业资讯' },
  { value: '其他', label: '其他' },
];

const TYPE_LABELS: Record<string, string> = {
  md: 'MD文档',
  ppt: 'PPT/PDF',
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
  const { storeId, userType, isAuthenticated, _hasHydrated } = useAuthStore();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  useEffect(() => {
    if (searchInput === '' && searchKeyword !== '') {
      setSearchKeyword('');
      setCurrentPage(1);
    }
  }, [searchInput]);

  const loadResources = async (overrideKeyword?: string) => {
    try {
      setLoading(true);
      let url = '/api/store/learning-resources';
      const params: string[] = [];
      const keyword = overrideKeyword !== undefined ? overrideKeyword : searchKeyword;
      if (keyword.trim()) {
        params.push(`keyword=${encodeURIComponent(keyword.trim())}`);
      }
      if (filterType && filterType !== 'all') {
        params.push(`type=${filterType}`);
      }
      if (filterCategory && filterCategory !== 'all') {
        params.push(`category=${encodeURIComponent(filterCategory)}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.list || [];
      setResources(list);
    } catch (e) {
      console.error('Failed to load learning resources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadResources();
  }, [filterType, filterCategory]);

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
    setCurrentPage(1);
    loadResources(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput('');
    setSearchKeyword('');
    setFilterType('all');
    setFilterCategory('all');
    setCurrentPage(1);
    setTimeout(() => loadResources(''), 0);
  };

  const handleView = (resource: LearningResource) => {
    router.push(`/store/learning-center/${resource.id}`);
  };

  const filteredResources = useMemo(() => {
    if (!searchKeyword.trim() && filterType === 'all' && filterCategory === 'all') return resources;
    const kw = searchKeyword.trim().toLowerCase();
    return resources.filter((r) => {
      const matchesKeyword = !kw ||
        (r.title || '').toLowerCase().includes(kw) ||
        (r.description || '').toLowerCase().includes(kw);
      const matchesType = filterType === 'all' || r.type === filterType;
      const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
      return matchesKeyword && matchesType && matchesCategory;
    });
  }, [resources, searchKeyword, filterType, filterCategory]);

  const pagedResources = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize));

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">学习中心</h1>
            <p className="text-sm text-gray-500 mt-0.5 md:mt-1">
              门店培训资料，包含产品知识、营销技巧等学习内容
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索资源标题或描述..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-9 w-full sm:w-56"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="md">MD文档</SelectItem>
                <SelectItem value="ppt">PPT/PDF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch} className="w-full sm:w-auto">
              搜索
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
              重置
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:block px-6 pb-6">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : pagedResources.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {searchKeyword || filterType !== 'all' || filterCategory !== 'all' ? '未找到匹配的学习资源' : '暂无学习资源'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[10%] text-center">类型</TableHead>
                      <TableHead className="w-[30%]">标题</TableHead>
                      <TableHead className="w-[12%] text-center">分类</TableHead>
                      <TableHead className="w-[25%]">描述</TableHead>
                      <TableHead className="w-[13%] text-center">文件信息</TableHead>
                      <TableHead className="w-[10%] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedResources.map((resource) => (
                      <TableRow key={resource.id} className="hover:bg-gray-50">
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {resource.type === 'md' ? (
                              <FileText className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Presentation className="h-4 w-4 text-orange-500" />
                            )}
                            <span className="text-xs text-gray-600">{TYPE_LABELS[resource.type]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900" title={resource.title}>
                            {resource.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-gray-600">{resource.category}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500" title={resource.description || ''}>
                            {truncate(resource.description, 40)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {resource.fileSize && <div>{resource.fileSize}</div>}
                            {resource.pageCount && <div>{resource.pageCount} 页</div>}
                            <div>{formatDate(resource.createdAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(resource)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-500">
                      共 {filteredResources.length} 条 · 第 {currentPage} / {totalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden px-4 pb-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : pagedResources.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {searchKeyword || filterType !== 'all' || filterCategory !== 'all' ? '未找到匹配的学习资源' : '暂无学习资源'}
          </div>
        ) : (
          pagedResources.map((resource) => (
            <Card key={resource.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${resource.type === 'md' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    {resource.type === 'md' ? (
                      <FileText className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Presentation className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-sm truncate flex-1" title={resource.title}>
                        {resource.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={resource.description || ''}>
                      {truncate(resource.description, 60)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded">{resource.category}</span>
                        <span>{TYPE_LABELS[resource.type]}</span>
                        {resource.fileSize && <span>· {resource.fileSize}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(resource)}
                        className="text-green-600 hover:text-green-700 h-7 px-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        查看
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
