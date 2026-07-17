/**
 * P0-1 续: ResultPage 高级分析工具区
 *
 * 从 ResultPage.tsx 抽取的高级分析工具区，包含：
 * - 八字详细分析（BaZiDetail）
 * - 综合分析报告（AnalysisResult）
 * - 海报生成（PosterGenerator）
 * - K线分享卡片（KLineShareCard）
 * - 知识库引用来源（CitationsCard）
 *
 * 抽取目的：降低 ResultPage 行数，提高可维护性。
 */
import type { TFunction } from 'i18next';
import type { UnifiedResult } from './resultTypes';
import { CitationsCard } from './CitationsCard';
import BaZiDetail from '@/components/BaZiDetail';
import AnalysisResult from '@/components/AnalysisResult';
import { PosterGenerator } from '@/components/PosterGenerator';
import { KLineShareCard } from '@/components/KLineShareCard';

/** 组件需要的 user 属性子集（降低与 authStore 的耦合） */
interface UserProps {
  gender?: 'male' | 'female' | string;
  birthDate?: string;
  birthTime?: string;
  nickname?: string;
}

interface ResultAdvancedToolsProps {
  result: UnifiedResult;
  calcResult: UnifiedResult['calc_result'];
  user: UserProps | null;
  /** 预留 i18n（当前各 details 标题为硬编码中文，后续可迁移至 i18n） */
  t?: TFunction;
}

export function ResultAdvancedTools({ result, calcResult, user }: ResultAdvancedToolsProps) {
  if (!result) return null;

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* 八字详细分析 */}
      {calcResult && (
        <details className="rounded-xl bg-surface-container-high/50 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-on-surface">
            八字详细分析（五行/十神/大运）
          </summary>
          <div className="p-4">
            <BaZiDetail
              analysis={calcResult as any}
              gender={(user?.gender as 'male' | 'female') || 'male'}
              birthYear={new Date(user?.birthDate || '1990-01-01').getFullYear()}
            />
          </div>
        </details>
      )}

      {/* 分析结果展示 */}
      {calcResult && (
        <details className="rounded-xl bg-surface-container-high/50 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-on-surface">
            综合分析报告
          </summary>
          <div className="p-4">
            <AnalysisResult
              analysis={calcResult as any}
              birthYear={new Date(user?.birthDate || '1990-01-01').getFullYear()}
              birthMonth={new Date(user?.birthDate || '1990-01-01').getMonth() + 1}
              birthDay={new Date(user?.birthDate || '1990-01-01').getDate()}
              birthHour={user?.birthTime ? parseInt(user.birthTime.split(':')[0]) : 12}
            />
          </div>
        </details>
      )}

      {/* 海报生成 */}
      {result && (
        <details className="rounded-xl bg-surface-container-high/50 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-on-surface">
            生成分享海报
          </summary>
          <div className="p-4">
            <PosterGenerator
              config={{
                summaryLine: result.summary_line || '命运轨迹分析',
                baZi: result.bazi
                  ? [result.bazi.yearPillar, result.bazi.monthPillar, result.bazi.dayPillar, result.bazi.hourPillar].filter((p): p is string => Boolean(p))
                  : ['甲', '子', '丙', '寅'],
                routeType: (result.route_type as 'liuren' | 'ziping' | 'quming' | 'ziwei') || 'ziping',
                recordId: result.record_id,
                userName: user?.nickname,
              }}
            />
          </div>
        </details>
      )}

      {/* K线分享卡片 */}
      {result && (
        <details className="rounded-xl bg-surface-container-high/50 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-on-surface">
            K线分享卡片
          </summary>
          <div className="p-4">
            <KLineShareCard
              cardType="currentStage"
              bundle={result as any}
              t={(key: string) => key}
              onClose={() => {}}
            />
          </div>
        </details>
      )}

      {/* P0-5: 知识库引用来源（RAG 就绪后自动展示） */}
      <CitationsCard citations={result.citations} />
    </div>
  );
}
