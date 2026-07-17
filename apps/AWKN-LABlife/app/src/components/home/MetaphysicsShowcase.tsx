import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';
import BaguaDiagram from './BaguaDiagram';
import StarmapDiagram from './StarmapDiagram';
import WuxingDiagram from './WuxingDiagram';

type EntryKey = 'kline' | 'naming' | 'question';

interface MetaphysicsShowcaseProps {
  onEntryClick: (entryKey: EntryKey) => void;
}

interface ShowcaseCard {
  key: EntryKey;
  label: string;
  labelEn: string;
  diagram: ReactNode;
}

const CARDS: ShowcaseCard[] = [
  {
    key: 'kline',
    label: '星盘',
    labelEn: 'Star Map',
    diagram: <StarmapDiagram />,
  },
  {
    key: 'naming',
    label: '五行',
    labelEn: 'Wu Xing',
    diagram: <WuxingDiagram />,
  },
  {
    key: 'question',
    label: '八卦',
    labelEn: 'Ba Gua',
    diagram: <BaguaDiagram />,
  },
];

/** 首页只回答用户最关心的三件事，不展示内部术数引擎目录。 */
export default function MetaphysicsShowcase({ onEntryClick }: MetaphysicsShowcaseProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  const handleClick = (entryKey: EntryKey) => {
    trackEvent(`entry_${entryKey}_click`, { presentation: 'animated_showcase' });
    onEntryClick(entryKey);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-0 pt-3 pb-28 sm:px-2 lg:py-8" aria-label={t('home.entries.heading')}>
      <div className="mb-5 text-center">
        <h2 className="text-lg font-semibold text-on-surface lg:text-xl">
          {t('home.entries.heading')}
        </h2>
        <p className="mt-1 text-sm text-on-surface/50">
          {t('home.entries.subheading')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        {CARDS.map((card, index) => (
          <motion.button
            key={card.key}
            type="button"
            onClick={() => handleClick(card.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 * (index + 1), ease: EASE_OUT_EXPO }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex min-h-[390px] w-full flex-col overflow-hidden rounded-2xl border border-outline/10 bg-surface-container-low/70 p-5 text-left transition-colors duration-300 hover:border-primary/35 md:min-h-[430px] lg:p-6"
          >
            <div className="mb-1 text-xs font-medium text-primary/70">
              {isEnglish ? card.labelEn : card.label}
            </div>

            <div className="flex h-52 w-full shrink-0 items-center justify-center overflow-hidden sm:h-56 lg:h-60">
              <div className="w-full max-w-[300px]">
                {card.diagram}
              </div>
            </div>

            <div className="mt-auto">
              <h3 className="text-xl font-semibold text-on-surface">
                {t(`home.entries.${card.key}.title`)}
              </h3>
              <p className="mt-2 min-h-[3.75rem] text-sm leading-6 text-on-surface/55">
                {t(`home.entries.${card.key}.description`)}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all group-hover:gap-2.5">
                {t(`home.entries.${card.key}.cta`)}
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
                  arrow_forward
                </span>
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
