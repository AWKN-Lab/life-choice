import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface EntryCardProps {
  entryKey: 'kline' | 'naming' | 'question';
  index: number;
  onEntryClick?: (entryKey: 'kline' | 'naming' | 'question') => void;
}

export default function EntryCard({ entryKey, index, onEntryClick }: EntryCardProps) {
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
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      whileTap={{ scale: 0.97 }}
      className="group relative rounded-2xl bg-surface-container-low border border-outline/8 
        hover:border-amber-400/30 transition-all duration-500 cursor-pointer w-full
        p-3 sm:p-5 lg:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[180px] lg:min-h-[260px]"
    >
      <h3 className="text-on-surface font-medium group-hover:text-amber-400 transition-colors duration-300
        text-xs sm:text-sm lg:text-lg mb-1 sm:mb-2">
        {t(`home.entries.${entryKey}.title`)}
      </h3>

      <p className="text-on-surface/50 group-hover:text-on-surface/70 transition-colors duration-300 leading-relaxed
        text-sm lg:text-base mb-4 flex-1 hidden sm:block">
        {t(`home.entries.${entryKey}.description`)}
      </p>

      <span className="inline-flex items-center gap-1.5 text-amber-400/70 group-hover:text-amber-400
        transition-all duration-300 group-hover:gap-2 text-xs sm:text-sm">
        {t(`home.entries.${entryKey}.cta`)}
        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
          arrow_forward
        </span>
      </span>

      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700
        bg-gradient-to-t from-amber-400/5 via-transparent to-transparent pointer-events-none" />
    </motion.button>
  );
}
