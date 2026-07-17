import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

export default function HeroBanner() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
      className="text-center pt-8 pb-6 lg:pt-12 lg:pb-8"
    >
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-3xl lg:text-5xl font-bold text-on-surface tracking-tight mb-3"
      >
        {isEnglish ? (
          <>
            Destiny has no <span className="text-primary">standard answer</span>,
            <br />
            but the game has an <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">optimal solution</span>
          </>
        ) : (
          <>
            命运没有<span className="text-primary">标准答案</span>
            <br />
            但博弈有<span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">最优解</span>
          </>
        )}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-base lg:text-lg text-on-surface/60 max-w-xl mx-auto leading-relaxed"
      >
        {isEnglish ? (
          <>
            <span className="text-on-surface/80 font-medium">Zhang Banshan · Eastern Numerology Expert</span>
            <br />
            Helps you see the cost of every path — the choice is yours.
          </>
        ) : (
          <>
            <span className="text-on-surface/80 font-medium">张半山 · 东方术数专家</span>
            <br />
            帮你看清每条路的代价——选择，你自己做。
          </>
        )}
      </motion.p>

    </motion.section>
  );
}
