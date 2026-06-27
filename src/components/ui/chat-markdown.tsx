'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownProps {
  content: string;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:mb-2 prose-p:last:mb-0 prose-ul:mb-2 prose-ol:mb-2 prose-li:mb-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-2 break-words">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-2 break-words">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold break-words">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm break-all">{children}</code>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}