import { motion } from 'framer-motion';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-3"
    >
      <ZhangbanshanAvatar size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/40 bg-surface-container px-4 py-3">
        <span className="mr-1 text-xs text-on-surface-variant/70">张半山思考中</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
