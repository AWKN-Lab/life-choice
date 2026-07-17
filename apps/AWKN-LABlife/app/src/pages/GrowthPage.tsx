import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/BottomNav';
import { PageHeader } from '@/components/layout/PageHeader';
import { trackEvent } from '@/lib/analytics';
import { CountdownTimer } from '@/components/CountdownTimer';
import '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';

const LIMITED_OFFERS = [
  {
    id: 'newbie',
    badge: '限时',
    cta: '立即领取',
    action: 'newbie_offer',
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'weekend',
    badge: '本周有效',
    cta: '去开通',
    action: 'weekend_offer',
    expireAt: (() => {
      const now = new Date();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      sunday.setHours(23, 59, 59, 999);
      return sunday.toISOString();
    })(),
  },
];

const CASE_STUDIES = [
  {
    id: 1,
    category: '职业决策',
    question: '是否应该接受外派机会？',
    result: '接受，但先谈好回退条款',
    feedback: '宗师的分析非常精准，帮我避开了坑，现在已经顺利晋升了。',
    author: 'L 先生 · 互联网行业',
    rating: 5,
  },
  {
    id: 2,
    category: '投资判断',
    question: '现在适合入手房产吗？',
    result: '建议观望，等 Q3 再做决定',
    feedback: '听了建议没冲动买房，后来果然跌了，省了将近 50 万。',
    author: 'W 女士 · 金融行业',
    rating: 5,
  },
  {
    id: 3,
    category: '感情抉择',
    question: '这段关系还值得继续吗？',
    result: '核心问题不在感情，在沟通方式',
    feedback: '一针见血指出了问题根源，我们现在的关系比以前更好了。',
    author: 'Z 小姐 · 教育行业',
    rating: 5,
  },
];

const REWARD_TIERS = [
  { invites: 1, rewardKey: '1', iconName: 'auto_awesome' },
  { invites: 3, rewardKey: '3', iconName: 'workspace_premium' },
  { invites: 5, rewardKey: '5', iconName: 'bolt' },
  { invites: 10, rewardKey: '10', iconName: 'trending_up' },
];

export function GrowthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [inviteCode] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  });

  useEffect(() => {
    trackEvent('growth_page_exposure');
  }, []);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCopyInvite = () => {
    const utmParams = new URLSearchParams({
      utm_source: 'invite',
      utm_medium: 'share',
      utm_campaign: `invite_${inviteCode}`,
      ref: inviteCode,
    });
    const link = `https://awkn.life/?${utmParams.toString()}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      trackEvent('invite_link_copy', { invite_code: inviteCode, link_type: 'utm' });
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleOfferClick = (action: string) => {
    trackEvent('growth_offer_click', { offer_type: action });
    if (action === 'newbie_offer') {
      navigate('/consult');
    } else {
      navigate('/membership');
    }
  };

  return (
    <div className="page-container relative">
      <div className="relative z-10 px-5 pt-6 pb-32">

        {/* Header */}
        <PageHeader
          title={t('growthPage.title')}
          onBack={() => navigate(-1)}
          className="px-0 pt-0 pb-0 mb-6"
        />

        {/* Limited Time Offers */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Icon name="schedule" size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-on-surface">{t('growthPage.limitedOffers')}</h2>
          </div>

          <div className="space-y-3">
            {LIMITED_OFFERS.map((offer) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                onClick={() => handleOfferClick(offer.action)}
                className={`relative cursor-pointer rounded-2xl border ${offer.id === 'newbie' ? 'border-tertiary/30 bg-gradient-to-br from-tertiary/20 to-secondary/5' : 'border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5'} p-5 transition-all hover:scale-[1.02]`}
              >
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-full text-[10px] font-medium text-on-surface">
                  {offer.id === 'newbie' ? t('growthPage.offers.newbie.badge') : t('growthPage.offers.weekend.badge')}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-on-surface font-semibold text-base">{offer.id === 'newbie' ? t('growthPage.offers.newbie.title') : t('growthPage.offers.weekend.title')}</h3>
                    <p className="text-primary text-sm font-medium">{offer.id === 'newbie' ? t('growthPage.offers.newbie.subtitle') : t('growthPage.offers.weekend.subtitle')}</p>
                  </div>
                  {offer.expireAt && (
                    <CountdownTimer
                      endTime={offer.expireAt}
                      format="compact"
                      expiredText={t('growthPage.expired')}
                      onExpire={() => trackEvent('offer_expired', { offer_id: offer.id })}
                      className="shrink-0"
                    />
                  )}
                </div>
                <p className="text-on-surface/50 text-xs leading-relaxed mb-3">{offer.id === 'newbie' ? t('growthPage.offers.newbie.desc') : t('growthPage.offers.weekend.desc')}</p>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface/40 text-xs">{t('growthPage.clickToClaim')}</span>
                  <span className="text-primary text-sm font-medium">{offer.cta}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Invite Rewards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Icon name="redeem" size={20} className="text-secondary" />
            <h2 className="text-lg font-semibold text-on-surface">{t('growthPage.inviteRewards')}</h2>
          </div>

          <div className="card p-5">
            <p className="text-on-surface/60 text-sm mb-4">
              {t('growthPage.inviteHint')}
            </p>

            {/* Invite Code */}
            <div className="bg-on-surface/30 rounded-xl p-4 mb-5">
              <p className="text-on-surface/40 text-xs mb-2">{t('growthPage.yourCode')}</p>
              <div className="flex items-center justify-between">
                <code className="text-primary text-lg font-mono tracking-widest">{inviteCode}</code>
                <button
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {copied ? (
                    <>
                      <Icon name="check" size={14} /> {t('growthPage.copied')}
                    </>
                  ) : (
                    <>
                      <Icon name="content_copy" size={14} /> {t('growthPage.copyLink')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* reward Tiers */}
            <div className="space-y-2.5">
              {REWARD_TIERS.map((tier) => (
                <div
                  key={tier.invites}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/40 border border-outline/10"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icon name={tier.iconName} size={18} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-medium">
                      {t('growthPage.inviteReward.invite')} {tier.invites} {t('growthPage.inviteReward.people')}
                    </p>
                    <p className="text-on-surface/40 text-xs">{t(`growthPage.inviteReward.rewards.${tier.rewardKey}`)}</p>
                  </div>
                  <Icon name="chevron_right" size={16} className="text-on-surface/20 shrink-0" />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                trackEvent('invite_share_click');
                handleCopyInvite();
              }}
              className="mt-4 w-full gold-shimmer py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Icon name="share" size={16} />
              {t('growthPage.shareFriends')}
            </button>
          </div>
        </motion.section>

        {/* Case Studies */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Icon name="star" size={20} className="text-primary" filled />
            <h2 className="text-lg font-semibold text-on-surface">{t('growthPage.caseStudies')}</h2>
          </div>

          <div className="space-y-3">
            {CASE_STUDIES.map((cs, idx) => (
              <motion.div
                key={cs.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.08 }}
                className="card p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    {cs.category}
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(cs.rating)].map((_, i) => (
                      <Icon key={i} name="star" size={12} className="text-primary" filled />
                    ))}
                  </div>
                </div>
                <p className="text-on-surface/70 text-sm mb-1 italic">"{cs.question}"</p>
                <p className="text-primary text-sm font-medium mb-2">→ {cs.result}</p>
                <p className="text-on-surface/40 text-xs leading-relaxed mb-2">"{cs.feedback}"</p>
                <p className="text-on-surface/25 text-xs">— {cs.author}</p>
              </motion.div>
            ))}
          </div>

          <Link
            to="/consult"
            onClick={() => trackEvent('growth_case_study_cta')}
            className="mt-5 flex items-center justify-center gap-2 text-primary text-sm hover:text-primary/80 transition-colors"
          >
            {t('growthPage.iWantConsult')}
            <Icon name="arrow_forward" size={16} />
          </Link>
        </motion.section>
      </div>

      <BottomNav />
    </div>
  );
}
