'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Loader2 } from '@/lib/icons';

const PDFJS_VIEWER_URL = '/pdfjs-legacy/viewer.html';

export interface PdfViewerRef {
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageInputSubmit: (page: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleDownload: (title: string) => void;
  toggleFullscreen: () => void;
}

interface PdfViewerProps {
  filePath: string;
  title: string;
  onPageChange?: (page: number) => void;
  onLoaded?: (total: number) => void;
  onScaleChange?: (scale: number) => void;
}

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(function PdfViewer(
  { filePath, title, onPageChange, onLoaded, onScaleChange },
  ref
) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerUrl = `${PDFJS_VIEWER_URL}?file=${encodeURIComponent(filePath)}`;

  useImperativeHandle(ref, () => ({
    handlePrevPage: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'previousPage' }, '*');
    },
    handleNextPage: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'nextPage' }, '*');
    },
    handlePageInputSubmit: (page: number) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'goToPage', page }, '*');
    },
    handleZoomIn: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'zoomIn' }, '*');
    },
    handleZoomOut: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'zoomOut' }, '*');
    },
    handleResetZoom: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'resetZoom' }, '*');
    },
    handleDownload: (fileTitle: string) => {
      const a = document.createElement('a');
      a.href = filePath;
      const ext = filePath.split('.').pop() || '';
      a.download = ext ? `${fileTitle}.${ext}` : fileTitle;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    toggleFullscreen: () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    },
  }), [filePath, title]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, page, total, scale: viewerScale } = event.data || {};
      if (type === 'pagechange' && page) {
        onPageChange?.(page);
      }
      if (type === 'loaded' && total) {
        onLoaded?.(total);
        setIsLoading(false);
      }
      if (type === 'scalechange' && viewerScale) {
        onScaleChange?.(viewerScale);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPageChange, onLoaded, onScaleChange]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-gray-100 flex-1 min-h-0"
      data-fullscreen={isFullscreen}
    >
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
          src={viewerUrl}
          className="w-full h-full border-0 bg-gray-100"
          title={title}
          onLoad={() => setIsLoading(false)}
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
});

export default PdfViewer;
