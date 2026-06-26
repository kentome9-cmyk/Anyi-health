'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  Loader2,
} from '@/lib/icons';

interface PdfViewerProps {
  filePath: string;
  title: string;
}

// Mozilla PDF.js Viewer 的 URL
const PDFJS_VIEWER_URL = '/pdfjs-legacy/viewer.html';

export default function PdfViewer({ filePath, title }: PdfViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 构建 PDF.js Viewer URL，传递文件路径和初始参数
  // 使用 #file= 前缀让 viewer.html 自动加载文件
  const viewerUrl = useRef<string>('');

  useEffect(() => {
    // 构建 viewer URL，viewer 会自动从 hash 中读取文件路径
    // 去掉 hash 参数，因为 Mozilla viewer 从 ?file= 读取
    const encodedFilePath = encodeURIComponent(filePath);
    const url = `${PDFJS_VIEWER_URL}?file=${encodedFilePath}`;
    viewerUrl.current = url;
    setIsLoading(true);
  }, [filePath]);

  // 监听 iframe 加载完成
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // 上一页
  const handlePrevPage = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'previousPage' }, '*');
  };

  // 下一页
  const handleNextPage = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'nextPage' }, '*');
  };

  // 页码输入提交
  const handlePageInputSubmit = () => {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1) {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage({ type: 'goToPage', page: num }, '*');
      setCurrentPage(num);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // 放大
  const handleZoomIn = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'zoomIn' }, '*');
    setScale((s) => Math.min(s + 0.25, 3));
  };

  // 缩小
  const handleZoomOut = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'zoomOut' }, '*');
    setScale((s) => Math.max(s - 0.25, 0.5));
  };

  // 重置缩放
  const handleResetZoom = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'resetZoom' }, '*');
    setScale(1);
  };

  // 监听来自 PDF.js viewer 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, page, total, scale: viewerScale } = event.data || {};
      if (type === 'pagechange' && page) {
        setCurrentPage(page);
        setPageInput(String(page));
      }
      if (type === 'loaded' && total) {
        setNumPages(total);
        setIsLoading(false);
      }
      if (type === 'scalechange' && viewerScale) {
        setScale(viewerScale);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 下载
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = filePath;
    a.download = title + (filePath.split('.').pop() ? `.${filePath.split('.').pop()}` : '');
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 全屏
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-gray-100 flex-1 min-h-0"
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5 text-sm">
            <Input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePageInputSubmit();
              }}
              className="h-8 w-14 text-center px-1"
            />
            <span className="text-gray-600 whitespace-nowrap">
              / {numPages || '?'} 页
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextPage}
            disabled={numPages > 0 && currentPage >= numPages}
            title="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="h-8 px-2 text-sm font-medium"
            title="重置缩放"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {Math.round(scale * 100)}%
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8"
            title="下载"
          >
            <Download className="h-4 w-4 mr-1" />
            下载
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF 渲染区 */}
      <div className="flex-1 min-h-0 bg-gray-200 overflow-auto relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">PDF 加载中...</span>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={viewerUrl.current}
          className="w-full h-full border-0 bg-gray-100"
          title={title}
          onLoad={handleIframeLoad}
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
}
