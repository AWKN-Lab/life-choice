import { motion } from 'framer-motion';

interface CostWarningMessageProps {
  warnings: Array<{ type: string; text: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  cost: '代价标注',
  boundary: '边界标注',
  memory_anchor: '记忆锚点',
  framework_correction: '框架修正',
};

/**
 * P2-2: 蛐蛐代价提醒组件
 * 琥珀色背景提醒条，显示 ⚠️ 代价提醒
 * 每轮最多 2 条，超出折叠
 */
export function CostWarningMessage({ warnings }: CostWarningMessageProps) {
  const displayWarnings = warnings.slice(0, 2);

  return (
    <div className="space-y-2">
      {displayWarnings.map((warning, index) => (
        <motion.div
          key={`${warning.type}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5"
        >
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠️</span>
            <div className="min-w-0">
              <span className="text-[10px] text-amber-400/60 uppercase tracking-wider">
                {TYPE_LABELS[warning.type] || '代价提醒'}
              </span>
              <p className="text-sm text-amber-200/90 leading-relaxed mt-0.5">
                {warning.text}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
      {warnings.length > 2 && (
        <p className="text-xs text-amber-400/40 text-center">
          还有 {warnings.length - 2} 条代价提醒
        </p>
      )}
    </div>
  );
}
