import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  onLoginSuccess?: () => void; // 登录成功时的回调
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login', onLoginSuccess }: AuthModalProps) {
  const { t } = useTranslation();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(loginEmail, loginPassword);
    if (success) {
      onLoginSuccess?.(); // 优先调用登录成功回调
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await register(registerName, registerEmail, registerPassword);
    if (success) {
      onLoginSuccess?.(); // 优先调用登录成功回调
      onClose();
    }
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    clearError();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'hsl(var(--surface-dim) / 0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={t('auth.dialogLabel')}
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
          animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
          exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[85vh] sm:max-h-none overflow-y-auto"
          style={{ background: 'hsl(var(--surface-container))', border: '1px solid hsl(var(--primary) / 0.2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 transition-colors z-10"
            style={{ color: 'hsl(var(--outline))' }}
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined icon-md" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>close</span>
          </button>

          {/* Header Tab */}
          <div className="flex" style={{ borderBottom: '1px solid hsl(var(--border-variant) / 0.2)' }}>
            <button
              onClick={() => switchTab('login')}
              className="flex-1 py-4 text-sm font-medium transition-colors"
              role="tab"
              aria-selected={activeTab === 'login'}
              style={{
                color: activeTab === 'login' ? 'hsl(var(--primary))' : 'hsl(var(--outline))',
                borderBottom: activeTab === 'login' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              }}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => switchTab('register')}
              className="flex-1 py-4 text-sm font-medium transition-colors"
              role="tab"
              aria-selected={activeTab === 'register'}
              style={{
                color: activeTab === 'register' ? 'hsl(var(--primary))' : 'hsl(var(--outline))',
                borderBottom: activeTab === 'register' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              }}
            >
              {t('auth.register')}
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl text-sm"
                style={{ background: 'hsl(var(--error) / 0.1)', border: '1px solid hsl(var(--error) / 0.3)', color: 'hsl(var(--error))' }}
                role="alert"
              >
                {error}
              </motion.div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm mb-2" style={{ color: 'hsl(var(--on-surface-variant))' }}>{t('auth.email')}</label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input-mystic"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm mb-2" style={{ color: 'hsl(var(--on-surface-variant))' }}>{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-mystic pr-10"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'hsl(var(--outline-variant))' }}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="gold-shimmer w-full mt-2"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>progress_activity</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>login</span>
                      {t('auth.login')}
                    </span>
                  )}
                </button>

                <p className="text-center text-sm" style={{ color: 'hsl(var(--outline))' }}>
                  {t('auth.noAccount')}
                  <button
                    type="button"
                    onClick={() => switchTab('register')}
                    className="ml-1 transition-colors"
                    style={{ color: 'hsl(var(--primary))' }}
                    aria-label={t('auth.registerNow')}
                  >
                    {t('auth.registerNow')}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="register-name" className="block text-sm mb-2" style={{ color: 'hsl(var(--on-surface-variant))' }}>{t('auth.name')}</label>
                  <input
                    id="register-name"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="input-mystic"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-sm mb-2" style={{ color: 'hsl(var(--on-surface-variant))' }}>{t('auth.email')}</label>
                  <input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input-mystic"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-sm mb-2" style={{ color: 'hsl(var(--on-surface-variant))' }}>{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-mystic pr-10"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'hsl(var(--outline-variant))' }}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="gold-shimmer w-full mt-2"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>progress_activity</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>how_to_reg</span>
                      {t('auth.register')}
                    </span>
                  )}
                </button>

                <p className="text-center text-sm" style={{ color: 'hsl(var(--outline))' }}>
                  {t('auth.hasAccount')}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="ml-1 transition-colors"
                    style={{ color: 'hsl(var(--primary))' }}
                    aria-label={t('auth.loginNow')}
                  >
                    {t('auth.loginNow')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
