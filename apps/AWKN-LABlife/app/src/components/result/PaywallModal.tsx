/**
 * 付费墙弹窗组件（从 ResultPage 抽取）
 *
 * 功能:
 * - 5分钟倒计时
 * - 限免1次按钮
 * - 开通会员按钮
 * - 稍后再说关闭
 */
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Icon } from '@/components/result/Icon';
import { trackEvent } from '@/lib/analytics';

interface PaywallModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 倒计时结束时间 */
  expireTime: Date | null;
  /** 是否可用限免 */
  freeTrialAvailable: boolean;
  /** 限免点击回调（成功后应关闭弹窗并跳转） */
  onFreeTrialClick: () => Promise<void>;
  /** 开通会员点击回调 */
  onUpgradeClick: () => void;
  /** 记录 ID（用于埋点） */
  recordId: string;
}

export function PaywallModal({
  visible,
  onClose,
  expireTime,
  freeTrialAvailable,
  onFreeTrialClick,
  onUpgradeClick,
  recordId,
}: PaywallModalProps) {
  const { t } = useTranslation();

  if (!visible || !expireTime) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-sm rounded-2xl bg-surface-container p-6 text-center shadow-2xl"
      >
        <Icon name="lock" size={32} className="text-amber-400 mx-auto mb-3" filled />
        <h3 className="text-lg font-bold text-on-surface mb-2">解锁完整结果</h3>
        <p className="text-sm text-on-surface/60 mb-4">
          深度分析为会员专属内容，限时优惠中
        </p>

        {/* 倒计时 */}
        <div className="mb-4">
          <p className="text-xs text-on-surface/40 mb-1.5">优惠倒计时</p>
          <CountdownTimer
            endTime={expireTime}
            type="offer"
            format="short"
            onExpire={() => {
              trackEvent('paywall_countdown_expired', { record_id: recordId });
            }}
          />
        </div>

        {/* 限免按钮 */}
        {freeTrialAvailable && (
          <button
            onClick={async () => {
              trackEvent('free_trial_click', { record_id: recordId });
              try {
                await onFreeTrialClick();
              } catch {
                // 限免失败，走付费
              }
            }}
            className="w-full mb-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-on-surface text-sm font-bold hover:from-amber-700 hover:to-amber-600 active:from-amber-800 transition-colors"
          >
            限免体验1次
          </button>
        )}

        {/* 付费按钮 */}
        <button
          onClick={() => {
            trackEvent('paywall_upgrade_click', { record_id: recordId });
            onUpgradeClick();
          }}
          className="w-full px-4 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 active:bg-primary/35 transition-colors"
        >
          开通会员，解锁全部
        </button>

        <button
          onClick={onClose}
          className="mt-3 text-xs text-on-surface/40 hover:text-on-surface/60 transition-colors"
        >
          稍后再说
        </button>
      </motion.div>
    </div>
  );
}
