'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  ArrowLeft,
  Presentation,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
} from '@/lib/icons';
import type { PdfViewerRef } from './PdfViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// 动态加载 PDF 查看器（禁用 SSR 避免 PDF.js 在服务端报错）
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

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
  createdAt: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b-2 border-gray-200 text-gray-900">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-gray-200 text-gray-900">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold mt-5 mb-2 text-[#265D47]">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-bold mt-4 mb-2 text-gray-800">
      {children}
    </h4>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#265D47] border-b border-[#265D47]/30 hover:border-[#265D47] font-medium"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 pr-4 py-2 bg-gray-50 border-l-4 border-[#265D47] text-gray-600 rounded-r">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gradient-to-b from-gray-50 to-gray-100">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 border border-gray-200 text-left font-semibold text-gray-900 bg-gray-50">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 border border-gray-200 text-gray-700">{children}</td>
  ),
};

function isPdfFile(filePath: string | null | undefined): boolean {
  if (!filePath) return false;
  return filePath.toLowerCase().endsWith('.pdf');
}

export default function LearningResourceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { userType, isAuthenticated, _hasHydrated } = useAuthStore();
  const [resource, setResource] = useState<LearningResource | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (id) loadResource();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (resource?.type === 'md') e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [resource]);

  const loadResource = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/learning-resources/${id}`);
      if (res.ok) {
        const data = await res.json();
        setResource(data);
      } else {
        setResource(null);
      }
    } catch (e) {
      console.error('Failed to load resource:', e);
      setResource(null);
    } finally {
      setLoading(false);
    }
  };

  const isPdf = useMemo(() => isPdfFile(resource?.filePath), [resource]);
  const isPptx = useMemo(() => {
    if (!resource?.filePath) return false;
    const lower = resource.filePath.toLowerCase();
    return lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }, [resource]);

  // PDF 工具栏状态（位于标题行）
  const pdfRef = useRef<PdfViewerRef>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 监听全屏变化
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handlePageInputSubmit = () => {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= numPages) {
      setCurrentPage(num);
      pdfRef.current?.handlePageInputSubmit(num);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handlePptxDownload = () => {
    if (resource?.filePath) {
      const a = document.createElement('a');
      a.href = resource.filePath;
      a.download =
        resource.title + (resource.filePath.split('.').pop() || '');
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500 mb-4">学习资源不存在或已被删除</p>
        <Button variant="outline" onClick={() => router.push('/store/learning-center')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回学习中心
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden h-screen">
      <div className="p-4 md:p-6 w-full flex-shrink-0">
        <div className="flex items-center gap-3 mb-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/store/learning-center')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col mx-auto" style={{ height: 'calc(100vh - 120px)', maxWidth: 'min(100%, 1400px)' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {resource.type === 'md' ? (
                <FileText className="h-5 w-5 text-blue-600" />
              ) : (
                <Presentation className="h-5 w-5 text-orange-600" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{resource.title}</h1>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{resource.category}</span>
              {resource.fileSize && <span className="text-sm text-gray-500">大小：{resource.fileSize}</span>}
              {resource.pageCount && <span className="text-sm text-gray-500">{resource.pageCount} 页</span>}

              {/* PDF 工具栏 - 嵌入标题行 */}
              {isPdf && (
                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  {/* 翻页 */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => pdfRef.current?.handlePrevPage()}
                      disabled={currentPage <= 1}
                      title="上一页"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 text-sm">
                      <Input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput((e.target as HTMLInputElement).value)}
                        onBlur={handlePageInputSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePageInputSubmit();
                        }}
                        className="h-7 w-12 text-center px-1 text-xs"
                      />
                      <span className="text-gray-500 whitespace-nowrap text-xs">/ {numPages || '?'} 页</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => pdfRef.current?.handleNextPage()}
                      disabled={numPages > 0 && currentPage >= numPages}
                      title="下一页"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="w-px h-5 bg-gray-200" />

                  {/* 缩放 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => pdfRef.current?.handleZoomOut()}
                    disabled={scale <= 0.5}
                    title="缩小"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      pdfRef.current?.handleResetZoom();
                      setScale(1);
                    }}
                    className="h-7 px-2 text-xs font-medium"
                    title="重置缩放"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {Math.round(scale * 100)}%
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => pdfRef.current?.handleZoomIn()}
                    disabled={scale >= 3}
                    title="放大"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  <div className="w-px h-5 bg-gray-200" />

                  {/* 下载 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => pdfRef.current?.handleDownload(resource.title)}
                    className="h-7 px-2 text-xs"
                    title="下载"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    下载
                  </Button>

                  {/* 全屏 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => pdfRef.current?.toggleFullscreen()}
                    title={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            {resource.description && (
              <p className="text-sm text-gray-600 mt-3">{resource.description}</p>
            )}
          </div>

          {resource.type === 'md' ? (
            <div
              className="p-6 select-none flex-1 overflow-y-auto"
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              style={{ WebkitUserSelect: 'none' }}
            >
              <div className="markdown-body max-w-4xl mx-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {resource.content || '暂无内容'}
                </ReactMarkdown>
              </div>
            </div>
          ) : isPdf ? (
            <PdfViewer
              ref={pdfRef}
              filePath={resource.filePath!}
              title={resource.title}
              onPageChange={(p) => {
                setCurrentPage(p);
                setPageInput(String(p));
              }}
              onLoaded={(total) => setNumPages(total)}
              onScaleChange={(s) => setScale(s)}
            />
          ) : isPptx ? (
            <div className="p-12 flex-1 flex flex-col items-center justify-center bg-gray-50">
              <Presentation className="h-16 w-16 text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PPT 文件预览</h3>
              <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                PPT 文件无法在浏览器中直接预览，请下载后使用 PowerPoint 或 WPS 等软件查看
              </p>
              <Button onClick={handlePptxDownload} className="bg-[#265D47] hover:bg-[#1a3d2f]">
                <Download className="h-4 w-4 mr-2" />
                下载文件
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              暂无文件内容
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
