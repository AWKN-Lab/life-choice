import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface ResultRevealProps {
  engineName: string;
  children: React.ReactNode;
  onRevealComplete?: () => void;
}

export default function ResultReveal({ engineName, children, onRevealComplete }: ResultRevealProps) {
  const [phase, setPhase] = useState<'seal' | 'unsealing' | 'revealed'>('seal');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('unsealing'), 600);
    const t2 = setTimeout(() => {
      setPhase('revealed');
      onRevealComplete?.();
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onRevealComplete]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {phase === 'seal' && (
          <motion.div
            key="seal"
            className="flex flex-col items-center justify-center py-20 gap-6"
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
            transition={{ duration: 0.6 }}
          >
            {/* 封印图案 */}
            <div className="relative w-32 h-32">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border border-primary/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  className="text-4xl font-serif text-primary/80"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  封
                </motion.span>
              </div>
            </div>
            <motion.p
              className="text-on-surface-variant text-sm tracking-widest"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {engineName} · 推演完成
            </motion.p>
          </motion.div>
        )}

        {phase === 'unsealing' && (
          <motion.div
            key="unsealing"
            className="flex flex-col items-center justify-center py-20 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <motion.div
              className="text-primary text-lg font-serif tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              启封
            </motion.div>
            <motion.div
              className="w-24 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            />
          </motion.div>
        )}

        {phase === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
