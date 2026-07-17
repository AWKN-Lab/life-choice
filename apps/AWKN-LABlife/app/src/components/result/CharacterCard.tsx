import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { ZhangbanshanAvatar } from '../icons/ZhangbanshanAvatar';

interface CharacterCardProps {
  portrait?: string;
  classicAnalysis?: string;
  defaultExpanded?: boolean;
}

export function CharacterCard({ portrait, classicAnalysis, defaultExpanded = true }: CharacterCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!portrait && !classicAnalysis) return null;

  return (
    <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
      <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
        <ZhangbanshanAvatar size={18} userId="anonymous" />
        性格画像
      </h3>

      {portrait && (
        <div className="mb-3">
          <p className="text-on-surface/70 text-sm leading-relaxed whitespace-pre-line">{portrait}</p>
        </div>
      )}

      {classicAnalysis && (
        <div className="border-t border-outline/5 pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-on-surface/50 hover:text-on-surface/70 transition-colors mb-2"
          >
            <Icon name="menu_book" size={14} />
            <span>经典依据</span>
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={14} />
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-lg bg-on-surface/[0.02] border border-outline/5">
                  <p className="text-on-surface/50 text-sm leading-relaxed whitespace-pre-line">
                    {classicAnalysis}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}