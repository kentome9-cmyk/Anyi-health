'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ArrowLeft,
  Presentation,
  Loader2,
  Download,
} from '@/lib/icons';
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
            <div className="flex items-center gap-2">
              {resource.type === 'md' ? (
                <FileText className="h-5 w-5 text-blue-600" />
              ) : (
                <Presentation className="h-5 w-5 text-orange-600" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{resource.title}</h1>
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{resource.category}</span>
              {resource.fileSize && <span>大小：{resource.fileSize}</span>}
              {resource.pageCount && <span>{resource.pageCount} 页</span>}
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
              filePath={resource.filePath!}
              title={resource.title}
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
