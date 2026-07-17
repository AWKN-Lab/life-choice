import { useState } from 'react';

interface ReasoningPanelProps {
  reasoningContent?: string | null;
}

export default function ReasoningPanel({ reasoningContent }: ReasoningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoningContent) return null;

  return (
    <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          查看 AI 推理过程
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed bg-on-surface/60 rounded-lg p-3 border border-purple-100">
            {reasoningContent}
          </div>
        </div>
      )}
    </div>
  );
}
