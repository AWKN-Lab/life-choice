import { useState } from 'react';
import { EmptyState } from './EmptyState';
import { AuthModal } from '@/components/AuthModal';
import { useTranslation } from 'react-i18next';

interface LoginRequiredProps {
  icon?: string;
  title?: string;
  description?: string;
}

/**
 * 未登录引导页
 * 基于 EmptyState + AuthModal 集成
 */
export function LoginRequired({ icon = 'lock', title, description }: LoginRequiredProps) {
  const { t } = useTranslation();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <EmptyState
        icon={icon}
        title={title || t('common.loginRequired', { defaultValue: '请先登录' })}
        description={description || t('common.loginRequiredDesc', { defaultValue: '登录后查看完整内容' })}
        actionText={t('common.login', { defaultValue: '登录' })}
        onAction={() => setShowAuth(true)}
        className="min-h-[60vh]"
      />
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={() => setShowAuth(false)}
      />
    </>
  );
}
