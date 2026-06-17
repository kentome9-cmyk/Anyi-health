"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const showPages: number[] = [];
  const windowSize = 1;
  const start = Math.max(1, currentPage - windowSize);
  const end = Math.min(totalPages, currentPage + windowSize);
  for (let i = start; i <= end; i++) showPages.push(i);

  const pageClickableList: { value: number | 'dots-left' | 'dots-right' }[] = [];
  if (start > 1) {
    pageClickableList.push({ value: 1 });
    if (start > 2) pageClickableList.push({ value: 'dots-left' });
  }
  showPages.forEach((p) => pageClickableList.push({ value: p }));
  if (end < totalPages) {
    if (end < totalPages - 1) pageClickableList.push({ value: 'dots-right' });
    pageClickableList.push({ value: totalPages });
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-white',
        className
      )}
    >
      <div className="text-xs text-gray-500 whitespace-nowrap">
        显示 <span className="font-medium text-gray-700">{from}</span> -{' '}
        <span className="font-medium text-gray-700">{to}</span> 条，共{' '}
        <span className="font-medium text-gray-700">{total}</span> 条
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
            }}
            className="h-8 px-2 rounded-md border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            aria-label="每页数量"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>条</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            aria-label="第一页"
            title="第一页"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            aria-label="上一页"
            title="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageClickableList.map((item, idx) =>
            typeof item.value === 'number' ? (
              <Button
                key={idx}
                variant={item.value === currentPage ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => onPageChange(item.value as number)}
                aria-label={`第 ${item.value} 页`}
                className="min-w-[2rem] w-auto px-2"
              >
                {item.value}
              </Button>
            ) : (
              <span key={idx} className="px-1 text-xs text-gray-400 select-none">
                …
              </span>
            )
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            aria-label="下一页"
            title="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label="最后一页"
            title="最后一页"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
