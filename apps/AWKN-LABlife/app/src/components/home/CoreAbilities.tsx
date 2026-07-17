import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

// U-P2-2: 首页补 3 个核心入口（/ziwei、/tide、/miaosuan）
interface AbilityCard {
  key: string;
  icon: string;
  title: string;
  description: string;
  route: string;
}

export default function CoreAbilities() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language === 'en';

  const cards: AbilityCard[] = isEnglish
    ? [
        {
          key: 'ziwei',
          icon: 'stars',
          title: 'Ziwei Doushu',
          description: '12-palace star chart for life domains — career, wealth, relationships, health.',
          route: '/ziwei',
        },
        {
          key: 'tide',
          icon: 'waves',
          title: 'Destiny Kline',
          description: '36-month destiny trend — stages, windows, and timing for key decisions.',
          route: '/kline',
        },
        {
          key: 'miaosuan',
          icon: 'bolt',
          title: 'Quick Read',
          description: 'One-question one-answer — fast judgment on a single concern.',
          route: '/miaosuan',
        },
      ]
    : [
        {
          key: 'ziwei',
          icon: 'stars',
          title: '紫微斗数',
          description: '十二宫星盘看人生领域——事业、财富、关系、健康一目了然。',
          route: '/ziwei',
        },
        {
          key: 'tide',
          icon: 'waves',
          title: '命运 K线',
          description: '36 个月命运趋势——阶段、窗口与关键决策的时机。',
          route: '/kline',
        },
        {
          key: 'miaosuan',
          icon: 'bolt',
          title: '秒算',
          description: '一事一问一答——快速判断单一关切。',
          route: '/miaosuan',
        },
      ];

  const handleClick = (card: AbilityCard) => {
    trackEvent('home_core_ability_click', { key: card.key, route: card.route });
    navigate(card.route);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6"
      >
        <h2 className="text-lg lg:text-xl font-semibold text-on-surface mb-2">
          {isEnglish ? 'Core Abilities' : '核心能力'}
        </h2>
        <p className="text-sm text-on-surface/40">
          {isEnglish
            ? 'Direct access to specialized engines'
            : '直达专精术数引擎'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
        {cards.map((card, index) => (
          <motion.button
            key={card.key}
            onClick={() => handleClick(card)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 * (index + 1), ease: EASE_OUT_EXPO }}
            whileHover={{ y: -3 }}
            className="group relative rounded-2xl bg-surface-container-low/60 border border-outline/8
              hover:border-primary/30 transition-all duration-400 cursor-pointer
              p-4 lg:p-5 flex items-start gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
                {card.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-on-surface mb-1">{card.title}</h3>
              <p className="text-xs text-on-surface/50 leading-relaxed">{card.description}</p>
            </div>
            <span
              className="material-symbols-outlined text-on-surface/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0"
              style={{ fontSize: 18 }}
            >
              arrow_forward
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
