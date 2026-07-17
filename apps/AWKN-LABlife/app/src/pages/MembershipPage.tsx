import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { MagneticButton } from '@/components/MagneticButton';
import { trackEvent } from '@/lib/analytics';
import '@/lib/i18n';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorBanner } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';

export function MembershipPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const currentPlan = 'month'; // 与后端API返回的id匹配
  const { user } = useAuthStore();
  const {
    currentOrder,
    isProcessing,
    error,
    createOrder,
    clearCurrentOrder,
    clearError,
  } = useOrderStore();

  // 套餐 id → 后端 MembershipPlan id 映射（与后端 MEMBERSHIP_PLANS 一致）
  const PRODUCT_ID_MAP: Record<string, { productType: 'membership' | 'single'; productId: string; amount: number }> = {
    single: { productType: 'single', productId: 'single', amount: 199 },
    month: { productType: 'membership', productId: 'month', amount: 99 },
    year: { productType: 'membership', productId: 'year', amount: 699 },
  };

  useEffect(() => {
    if (!user && selectedPlan) {
      navigate('/profile', { state: { triggerLogin: true } });
    }
  }, [user, selectedPlan, navigate]);

  useEffect(() => {
    trackEvent('membership_exposure', {});
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      trackEvent('payment_start', {
        plan_id: planId,
        status: 'redirect_to_login',
      });
      navigate('/profile', { state: { triggerLogin: true } });
      return;
    }

    setSelectedPlan(planId);
    const planData = PLANS.find((p) => p.id === planId);
    if (planData) {
      trackEvent('membership_plan_select', { plan_id: planData.id, plan_name: planData.id });
    }

    const productConfig = PRODUCT_ID_MAP[planId];
    if (!productConfig) {
      console.error('Unknown plan id:', planId);
      return;
    }

    try {
      trackEvent('payment_start', { plan_id: planId });
      trackEvent('membership_pay_click', { plan_id: planId });

      const order = await createOrder({
        productType: productConfig.productType,
        productId: productConfig.productId,
        paymentMethod: 'stripe',
        amount: productConfig.amount,
        currency: 'cny',
      });

      // mock 模式下没有真实 paymentUrl，订单状态为 pending 时进入 mock 成功提示
      if (order.status === 'pending') {
        setPaymentMockSuccess(order.orderId);
      }
    } catch (err) {
      console.error('Create order failed:', err);
      trackEvent('payment_error', {
        plan_id: planId,
        error_message: err instanceof Error ? err.message : 'unknown',
      });
    }
  };

  const setPaymentMockSuccess = (orderId: string) => {
    trackEvent('payment_success_mock', { order_id: orderId });

    setTimeout(() => {
      toast.success(t('membership.mockPaymentSuccess', { orderId }));
      clearCurrentOrder();
      setSelectedPlan(null);
    }, 500);
  };

  const formatPrice = (price: string | number) => {
    const value = String(price);
    return value.startsWith('¥') ? value : `¥${value}`;
  };

  const PLANS = [
    {
      id: 'single',
      ...t('membership.plans.single', { returnObjects: true }) as any,
    },
    {
      id: 'month',
      ...t('membership.plans.monthly', { returnObjects: true }) as any,
    },
    {
      id: 'year',
      ...t('membership.plans.yearly', { returnObjects: true }) as any,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-lg mx-auto px-4 py-8 mobile-safe-top">

        <PageHeader
          title={t('membership.title')}
          subtitle={t('membership.subtitle')}
          onBack={() => navigate(-1)}
        />

        {error && <ErrorBanner message={error} onClose={clearError} className="mb-4" />}

        <div className="space-y-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => !isProcessing && handleSelectPlan(plan.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
                plan.id === currentPlan
                  ? 'border-green-500/50 bg-gradient-to-br from-green-900/20 to-emerald-900/10'
                  : selectedPlan === plan.id || plan.popular
                    ? 'border-primary/50 bg-gradient-to-br from-primary/20 to-primary-dim/10'
                    : 'border-outline/30 bg-surface-container-low/30 hover:border-zinc-600/50'
              } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
            >
              {plan.id === currentPlan && (
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-[10px] font-medium text-on-surface">
                  {t('membership.currentPlan')}
                </div>
              )}
              {(plan.badge || plan.popular) && plan.id !== currentPlan && (
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-gradient-to-r from-primary to-primary-dim rounded-full text-[10px] font-medium text-on-primary">
                  {plan.badge || t('membership.recommended')}
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-on-surface">{plan.name}</h3>
                  <p className="text-xs text-primary/80 mt-0.5">{plan.scene}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xl sm:text-2xl font-bold ${plan.id === currentPlan ? 'text-green-400' : 'text-primary'}`}>{formatPrice(plan.price)}</span>
                  {plan.originalPrice > plan.price && (
                    <p className="text-lg sm:text-2xl text-on-surface-variant/50 line-through ml-1">{formatPrice(plan.originalPrice)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(plan.features || []).map((feature: string) => (
                  <span key={feature} className={`text-xs ${plan.id === currentPlan ? 'text-green-400/80' : 'text-on-surface-variant/60'}`}>
                    {feature}
                  </span>
                ))}
              </div>

              {selectedPlan === plan.id && isProcessing && (
                <LoadingState size="sm" label={t('membership.creating')} className="mt-4 py-2" />
              )}

              {/* 主按钮 */}
              {plan.id !== currentPlan && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan(plan.id);
                  }}
                  disabled={isProcessing}
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-lg text-sm font-medium hover:from-primary-light hover:to-primary transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {plan.button}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-on-surface-variant/40 mt-5 pb-2">
          {t('membership.footerHint')}
        </p>
      </div>
    </div>
  );
}
