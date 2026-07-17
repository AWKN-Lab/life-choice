import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface MomentCard {
  key: string;
  title: string;
  question: string;
  description: string;
  tags: string[];
  route: string;
  entryKey?: 'kline' | 'naming' | 'question';
}

export interface CriticalMomentsProps {
  onEntryClick?: (entryKey: 'kline' | 'naming' | 'question') => void;
}

export default function CriticalMoments({ onEntryClick }: CriticalMomentsProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language === 'en';

  const cards: MomentCard[] = isEnglish ? [
    {
      key: 'explore',
      title: 'Exploring Possibilities',
      question: 'Should I stay the course,\nor seek a new horizon?',
      description: 'See the energy others overlook, align your gifts with opportunity, and step onto the trajectory that\'s truly yours.',
      tags: ['Potential Discovery', 'Trend Analysis', 'Timing Advice'],
      route: '/kline-intro',
      entryKey: 'kline',
    },
    {
      key: 'relationship',
      title: 'Relationship Insight',
      question: 'Soulmates,\nor a trial written by fate?',
      description: 'Move beyond a single label. Deconstruct how energy fields interweave and reshape each other — about yourself, about others.',
      tags: ['Energy Match', 'Bond Depth', 'Communication Window'],
      route: '/consult?q=relationship',
      entryKey: 'question',
    },
    {
      key: 'risk',
      title: 'Critical Decision',
      question: 'Is now the right time\nto do this?',
      description: 'How do I avoid the hidden reefs ahead? At life\'s critical junctures, see when to ride momentum and when to step back.',
      tags: ['Timing Window', 'Downside Risk', 'Opportunity Cost'],
      route: '/kline-intro',
      entryKey: 'kline',
    },
  ] : [
    {
      key: 'explore',
      title: '探索可能',
      question: '我该坚守，\n还是寻找新方向？',
      description: '看见他人忽略的能量，让你的天赋与机遇对齐，踏上真正属于你的轨迹。',
      tags: ['潜能发现', '趋势分析', '时机建议'],
      route: '/kline-intro',
      entryKey: 'kline',
    },
    {
      key: 'relationship',
      title: '关系洞察',
      question: '灵魂伴侣，\n还是命中注定的考验？',
      description: '超越单一标签，解构能量场如何交织与重塑——看见自己的光，也看见他人的影。',
      tags: ['能量匹配', '纽带深度', '沟通窗口'],
      route: '/consult?q=关系', // q → ConsultPage.tsx:47
      entryKey: 'question',
    },
    {
      key: 'risk',
      title: '关键决策',
      question: '这件事现在做，\n时机对不对？',
      description: '前方的暗礁，我该如何避开？在人生关键节点看清何时顺势而为，何时明智退守。',
      tags: ['时机窗口', '下行风险', '机会成本'],
      route: '/kline-intro',
      entryKey: 'kline',
    },
  ];

  const handleClick = (card: MomentCard) => {
    trackEvent(`moment_${card.key}_click`);
    if (card.entryKey && onEntryClick) {
      onEntryClick(card.entryKey);
    } else {
      navigate(card.route);
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-lg lg:text-xl font-semibold text-on-surface mb-2">
          {isEnglish ? 'Critical Moment' : '关键时刻'}
        </h2>
        <p className="text-sm text-on-surface/40">
          {isEnglish
            ? 'Questions you\'ve probably asked yourself more than once'
            : '这些问题，你一定不止一次问过自己'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {cards.map((card, index) => (
          <motion.button
            key={card.key}
            onClick={() => handleClick(card)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 * (index + 1), ease: EASE_OUT_EXPO }}
            whileHover={{ y: -4 }}
            className="group relative rounded-2xl bg-surface-container-low/60 border border-outline/8
              hover:border-amber-400/30 transition-all duration-500 cursor-pointer
              p-5 lg:p-7 flex flex-col text-left"
          >
            <h3 className="text-xs text-amber-400/60 uppercase tracking-widest mb-3">
              {card.title}
            </h3>
            <p className="text-base lg:text-lg font-semibold text-on-surface mb-3 whitespace-pre-line leading-relaxed">
              {card.question}
            </p>
            <p className="text-sm text-on-surface/50 leading-relaxed mb-4 flex-1">
              {card.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {card.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-surface-container-high/50 text-on-surface/40">
                  {tag}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 text-amber-400/70 group-hover:text-amber-400 transition-all text-sm">
              {isEnglish ? 'Start Analysis' : '开始分析'}
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_forward
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}