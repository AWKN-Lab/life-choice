/**
 * P0-5: 知识库引用来源卡片
 *
 * 展示 RAG 检索到的知识库引用（标题+来源+摘要）。
 * 当后端 RAG 就绪后，UnifiedResult.citations 会被填充，此组件自动渲染。
 * citations 为空或不存在时不渲染。
 */
import { useTranslation } from 'react-i18next';
import type { UnifiedResult } from './resultTypes';

interface CitationsCardProps {
  citations?: UnifiedResult['citations'];
}

export function CitationsCard({ citations }: CitationsCardProps) {
  const { t } = useTranslation();

  if (!citations || citations.length === 0) return null;

  return (
    <details className="rounded-xl bg-surface-container-high/50 overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
          menu_book
        </span>
        {t('resultPage.citations.title', { defaultValue: '引用来源' })}
        <span className="ml-auto text-xs text-on-surface/50 font-normal">
          {citations.length}
        </span>
      </summary>
      <div className="p-4 space-y-3">
        {citations.map((citation, index) => (
          <div
            key={index}
            className="rounded-lg bg-surface-container/60 p-3 border border-border/20"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-on-surface line-clamp-1">
                {citation.title}
              </h4>
              <span className="text-xs text-amber-400/70 whitespace-nowrap">
                {citation.source}
              </span>
            </div>
            <p className="text-xs text-on-surface/60 leading-relaxed line-clamp-3">
              {citation.snippet}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
