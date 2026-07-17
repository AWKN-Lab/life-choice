import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/result/Icon';
import { ZhangbanshanAvatar } from '@/components/icons/ZhangbanshanAvatar';
import type { UnifiedResult } from '@/components/result/resultTypes';
import { loadConsultData } from '@/lib/consultDataMigration';

interface BrandStrategyProps {
  result: UnifiedResult;
}

function generateBrandStory(name: string, industry: string | undefined, t: (key: string, options?: Record<string, any>) => string): string {
  if (!name) return '';
  return t('resultPage.namingAnnual.brandStoryTemplate', {
    name,
    industry: industry || t('resultPage.namingAnnual.defaultIndustry', { defaultValue: '行业' }),
    defaultValue: `${name}，以独特的品牌基因在${industry || '行业'}中建立差异化认知。名字承载着品牌的核心价值主张，在消费者心智中占据独特位置。`,
  });
}

export function BrandStrategy({ result }: BrandStrategyProps) {
  const { t } = useTranslation();

  const nameSuggestions = result.name_suggestions || [];
  const bestSuggestion = nameSuggestions.find((s: any) => ((s?.score as number) || 0) >= 80) || nameSuggestions[0];
  const brandName = bestSuggestion?.names?.[0] || bestSuggestion?.name || '';

  const draftData = loadConsultData();
  const industry: string | undefined = draftData?.industry || draftData?.brand_industry;

  // P0-4: 移除 Math.random，改为确定性固定偏移（基于推荐分数 + 固定加分）
  const memorabilityScore = brandName ? Math.min(95, ((bestSuggestion?.score as number) || 70) + 5) : 0;
  const audienceMatch = brandName ? Math.min(90, ((bestSuggestion?.score as number) || 65) + 8) : 0;
  const industryFit = brandName ? Math.min(88, ((bestSuggestion?.score as number) || 60) + 10) : 0;

  const brandStory = generateBrandStory(brandName, industry, t);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="target" size={16} className="text-primary" />
            <span className="text-sm text-primary font-medium">{t('resultPage.namingAnnual.marketPositioning')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface/50">{t('resultPage.namingAnnual.audienceMatch', { defaultValue: '受众匹配度' })}</span>
              <span className="text-sm font-medium text-primary">{audienceMatch}%</span>
            </div>
            <div className="h-1.5 bg-on-surface/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${audienceMatch}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-on-surface/50">{t('resultPage.namingAnnual.industryFit', { defaultValue: '行业契合度' })}</span>
              <span className="text-sm font-medium text-emerald-400">{industryFit}%</span>
            </div>
            <div className="h-1.5 bg-on-surface/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${industryFit}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <ZhangbanshanAvatar size={16} className="text-amber-400" userId="anonymous" />
            <span className="text-sm text-amber-400 font-medium">{t('resultPage.namingAnnual.memorability')}</span>
          </div>
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-amber-400">{memorabilityScore}</div>
            <div className="text-xs text-on-surface/40 mt-1">
              {memorabilityScore >= 80
                ? t('resultPage.namingAnnual.memorabilityHigh', { defaultValue: '高记忆度，易传播' })
                : memorabilityScore >= 60
                ? t('resultPage.namingAnnual.memorabilityMedium', { defaultValue: '中等记忆度' })
                : t('resultPage.namingAnnual.memorabilityLow', { defaultValue: '建议优化提升记忆度' })}
            </div>
          </div>
          <div className="h-2 bg-on-surface/10 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                memorabilityScore >= 80 ? 'bg-amber-400' : memorabilityScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${memorabilityScore}%` }}
            />
          </div>
        </div>
      </div>

      {brandStory && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="auto_stories" size={16} className="text-primary" />
            <span className="text-sm text-primary font-medium">{t('resultPage.namingAnnual.brandStory')}</span>
          </div>
          <p className="text-sm text-on-surface/60 leading-relaxed">{brandStory}</p>
        </div>
      )}

      <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="verified_user" size={16} className="text-blue-400" />
          <span className="text-sm text-blue-400 font-medium">{t('resultPage.namingAnnual.trademarkAdvice')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-on-surface/60">
            <span className="text-blue-400 mt-0.5">1.</span>
            <span>{t('resultPage.namingAnnual.trademarkTip1', { defaultValue: '建议在国家知识产权局官网查询商标注册情况' })}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-on-surface/60">
            <span className="text-blue-400 mt-0.5">2.</span>
            <span>{t('resultPage.namingAnnual.trademarkTip2', { defaultValue: '同时检查域名可用性（.com / .cn / .com.cn）' })}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-on-surface/60">
            <span className="text-blue-400 mt-0.5">3.</span>
            <span>{t('resultPage.namingAnnual.trademarkTip3', { defaultValue: '建议注册多个类别的商标以保护品牌' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
