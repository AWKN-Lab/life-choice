import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { MagneticButton } from '@/components/MagneticButton';
import { useAuthStore } from '@/store/authStore';
import '@/lib/i18n';
import { EmptyState } from '@/components/feedback/EmptyState';

interface Ticket {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  response?: string;
}

const TICKET_TYPES = [
  { value: 'bug', label: 'feedback.ticketType.bug', icon: '🐛' },
  { value: 'suggestion', label: 'feedback.ticketType.suggestion', icon: '💡' },
  { value: 'consultation', label: 'feedback.ticketType.consultation', icon: '🔮' },
  { value: 'payment', label: 'feedback.ticketType.payment', icon: '💳' },
  { value: 'other', label: 'feedback.ticketType.other', icon: '📝' },
];

/**
 * 工单反馈页面
 * 提供用户提交反馈和查看历史工单的功能
 */
export function FeedbackPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // 新工单表单状态
  const [ticketType, setTicketType] = useState('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');

  // 加载历史工单
  useEffect(() => {
    if (isAuthenticated) {
      setTickets([
        {
          id: 'TK2024001',
          type: 'bug',
          title: t('feedback.mock.title'),
          description: t('feedback.mock.description'),
          status: 'resolved',
          created_at: '2024-01-15 10:30',
          updated_at: '2024-01-15 14:20',
          response: t('feedback.mock.response'),
        },
      ]);
    }
  }, [isAuthenticated, t]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    const newTicket: Ticket = {
      id: `TK${Date.now()}`,
      type: ticketType,
      title,
      description,
      status: 'open',
      created_at: new Date().toLocaleString(t('common.locale')),
      updated_at: new Date().toLocaleString(t('common.locale')),
    };

    setTickets(prev => [newTicket, ...prev]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // 重置表单
    setTitle('');
    setDescription('');
    setTicketType('suggestion');

    // 切换到历史记录
    setActiveTab('history');
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'resolved':
        return 'bg-green-500/10 text-green-400';
      case 'closed':
        return 'bg-gray-500/10 text-on-surface-variant/60';
      default:
        return 'bg-gray-500/10 text-on-surface-variant/60';
    }
  };

  const getStatusLabel = (status: Ticket['status']) => {
    return t(`feedback.status.${status}`);
  };

  const getTypeIcon = (type: string) => {
    return TICKET_TYPES.find(t => t.value === type)?.icon || '📝';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-base pb-20">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-on-surface mb-4">{t('feedback.title')}</h1>
          <div className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-container-low flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-on-surface font-medium mb-2">{t('feedback.loginRequired')}</h3>
            <p className="text-sm text-on-surface-variant/60">{t('feedback.loginHint')}</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-on-surface">{t('feedback.title')}</h1>
          <p className="text-sm text-on-surface-variant/60 mt-1">{t('feedback.subtitle')}</p>
        </div>

        {/* Tab切换 */}
        <div className="flex gap-2 mb-6 bg-surface-container-low/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('feedback.tab.new')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('feedback.tab.history')} ({tickets.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.div
              key="new-ticket"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* 问题类型 */}
              <div>
                <label className="block text-sm text-on-surface-variant/80 mb-2">{t('feedback.ticketType.label')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {TICKET_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setTicketType(type.value)}
                      className={`py-3 rounded-xl text-sm transition-all flex flex-col items-center gap-1 ${
                        ticketType === type.value
                          ? 'bg-primary/20 border border-primary text-on-surface'
                          : 'bg-surface-container-low/50 border border-outline/30 text-on-surface-variant/60 hover:text-on-surface'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span>{t(type.label)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm text-on-surface-variant/80 mb-2">{t('feedback.form.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('feedback.form.titlePlaceholder')}
                  className="w-full px-4 py-3 bg-surface-container-low/50 border border-outline/30 rounded-xl text-on-surface placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                  maxLength={100}
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm text-on-surface-variant/80 mb-2">{t('feedback.form.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('feedback.form.descriptionPlaceholder')}
                  rows={5}
                  className="w-full px-4 py-3 bg-surface-container-low/50 border border-outline/30 rounded-xl text-on-surface placeholder-gray-500 focus:outline-none focus:border-primary transition-colors resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-on-surface-variant/50 mt-1 text-right">{description.length}/1000</p>
              </div>

              {/* 联系方式 */}
              <div>
                <label className="block text-sm text-on-surface-variant/80 mb-2">{t('feedback.form.contact')}</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t('feedback.form.contactPlaceholder')}
                  className="w-full px-4 py-3 bg-surface-container-low/50 border border-outline/30 rounded-xl text-on-surface placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* 提交按钮 */}
              <MagneticButton
                onClick={handleSubmit}
                disabled={!title.trim() || !description.trim()}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  !title.trim() || !description.trim()
                    ? 'bg-zinc-700 text-on-surface-variant/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-primary-dim text-on-primary hover:from-primary-light hover:to-primary shadow-lg shadow-primary/20'
                }`}
              >
                {t('feedback.form.submit')}
              </MagneticButton>

              {/* 提示 */}
              <p className="text-xs text-on-surface-variant/50 text-center">{t('feedback.form.hint')}</p>
            </motion.div>
          ) : (
            <motion.div
              key="ticket-history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {tickets.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title={t('feedback.empty.title')}
                  description={t('feedback.empty.desc')}
                  className="bg-surface-container-low/50 border border-outline/20 rounded-2xl p-8"
                />
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-surface-container-low/50 border border-outline/20 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xl">{getTypeIcon(ticket.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                          <span className="text-xs text-on-surface-variant/50">#{ticket.id}</span>
                        </div>
                        <h4 className="text-on-surface text-sm font-medium truncate">{ticket.title}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant/60 line-clamp-2 mb-3">{ticket.description}</p>

                    {ticket.response && (
                      <div className="bg-surface-container-low/30 rounded-lg p-3 mb-3">
                        <p className="text-xs text-on-surface-variant/50 mb-1">{t('feedback.response.label')}</p>
                        <p className="text-sm text-on-surface-variant/80">{ticket.response}</p>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-on-surface-variant/50">
                      <span>{ticket.created_at}</span>
                      {ticket.updated_at !== ticket.created_at && (
                        <span>{t('feedback.updated')}: {ticket.updated_at}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 提交成功提示 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full bg-green-500 text-on-surface font-medium shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('feedback.submitSuccess')}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
