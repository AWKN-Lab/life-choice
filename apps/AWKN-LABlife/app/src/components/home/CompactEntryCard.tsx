import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface CompactEntryCardProps {
  entryKey: 'kline' | 'naming' | 'question';
  index: number;
  onEntryClick?: (entryKey: 'kline' | 'naming' | 'question') => void;
}

export default function CompactEntryCard({ entryKey, index, onEntryClick }: CompactEntryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const routes: Record<string, string> = {
    kline: '/kline-intro',
    naming: '/naming',
    question: '/question',
  };

  const handleClick = () => {
    trackEvent(`entry_${entryKey}_click`);
    if (onEntryClick) {
      onEntryClick(entryKey);
    } else {
      navigate(routes[entryKey]);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * (index + 1), ease: EASE_OUT_EXPO }}
      whileTap={{ scale: 0.97 }}
      className="group relative rounded-xl bg-surface-container-low border border-outline/8 
        hover:border-amber-400/30 transition-all duration-500 cursor-pointer w-full
        p-3 flex flex-row items-center gap-3"
    >
      <div className="flex flex-col items-start flex-1 min-w-0">
        <h3 className="text-on-surface font-medium group-hover:text-amber-400 transition-colors duration-300
          text-sm leading-tight">
          {t(`home.entries.${entryKey}.title`)}
        </h3>
        <span className="inline-flex items-center gap-1 text-amber-400/70 group-hover:text-amber-400
          transition-all duration-300 text-xs mt-0.5">
          {t(`home.entries.${entryKey}.cta`)}
          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
            arrow_forward
          </span>
        </span>
      </div>

      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700
        bg-gradient-to-t from-amber-400/5 via-transparent to-transparent pointer-events-none" />
    </motion.button>
  );
}
