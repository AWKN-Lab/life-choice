import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/BottomNav';
import '@/lib/i18n';

/**
 * 价格说明页面
 * 解释各项服务的价格构成和价值
 */
export function PricePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-on-surface">{t('pricePage.title')}</h1>
          <p className="text-sm text-on-surface-variant/60 mt-1">{t('pricePage.subtitle')}</p>
        </div>

        {/* 服务定价说明 */}
        <div className="space-y-4">
          {/* 单次咨询 */}
          <div className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <h3 className="text-on-surface font-medium">{t('pricePage.single.title')}</h3>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.single.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-on-surface-variant/80">
                <span>{t('pricePage.single.item1')}</span>
                <span className="text-amber-600">{t('pricePage.single.price1')}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant/80">
                <span>{t('pricePage.single.item2')}</span>
                <span className="text-amber-600">{t('pricePage.single.price2')}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant/80">
                <span>{t('pricePage.single.item3')}</span>
                <span className="text-amber-600">{t('pricePage.single.price3')}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-on-surface-variant/50">{t('pricePage.single.note')}</p>
          </div>

          {/* 会员套餐 */}
          <div className="bg-gradient-to-br from-primary/10 to-primary-dim/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">👑</span>
              </div>
              <div>
                <h3 className="text-on-surface font-medium">{t('pricePage.membership.title')}</h3>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.membership.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-surface-container-low/30 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-on-surface-variant/80">{t('pricePage.membership.monthly.name')}</span>
                  <span className="text-amber-600 font-medium">{t('pricePage.membership.monthly.price')}</span>
                </div>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.membership.monthly.desc')}</p>
              </div>
              <div className="bg-surface-container-low/30 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-on-surface-variant/80">{t('pricePage.membership.yearly.name')}</span>
                  <span className="text-amber-600 font-medium">{t('pricePage.membership.yearly.price')}</span>
                </div>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.membership.yearly.desc')}</p>
              </div>
            </div>
          </div>

          {/* 价格构成说明 */}
          <div className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-5">
            <h3 className="text-on-surface font-medium mb-4 flex items-center gap-2">
              <span>💡</span>
              {t('pricePage.explanation.title')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="text-primary flex-shrink-0">1.</span>
                <p className="text-on-surface-variant/60">{t('pricePage.explanation.point1')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary flex-shrink-0">2.</span>
                <p className="text-on-surface-variant/60">{t('pricePage.explanation.point2')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary flex-shrink-0">3.</span>
                <p className="text-on-surface-variant/60">{t('pricePage.explanation.point3')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary flex-shrink-0">4.</span>
                <p className="text-on-surface-variant/60">{t('pricePage.explanation.point4')}</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-5">
            <h3 className="text-on-surface font-medium mb-4 flex items-center gap-2">
              <span>❓</span>
              {t('pricePage.faq.title')}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-on-surface-variant/80 mb-1">{t('pricePage.faq.q1')}</p>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.faq.a1')}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant/80 mb-1">{t('pricePage.faq.q2')}</p>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.faq.a2')}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant/80 mb-1">{t('pricePage.faq.q3')}</p>
                <p className="text-xs text-on-surface-variant/50">{t('pricePage.faq.a3')}</p>
              </div>
            </div>
          </div>

          {/* 联系方式 */}
          <div className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-5">
            <h3 className="text-on-surface font-medium mb-3 flex items-center gap-2">
              <span>📞</span>
              {t('pricePage.contact.title')}
            </h3>
            <p className="text-xs text-on-surface-variant/60">{t('pricePage.contact.desc')}</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
