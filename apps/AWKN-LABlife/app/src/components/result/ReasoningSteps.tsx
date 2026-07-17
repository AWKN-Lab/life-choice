import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

export interface ReasoningStep {
  toolName: string;
  toolOutput: string;
  llmInterpretation: string;
  confidence: number;
}

export interface ReasoningStepsProps {
  steps: ReasoningStep[];
  judgment: string;
  cost: string;
  costReminder: string;
}

const TOOL_LABELS: Record<string, string> = {
  bazi: '八字排盘',
  liuren: '六壬课式',
  wuxing: '五行分析',
  dayun: '大运推演',
  liunian: '流年推演',
  shishen: '十神分析',
  nanyin: '纳音分析',
  xiyong: '喜用神',
  shensha: '神煞分析',
  ziping: '子平推演',
  quming: '取名推演',
  zhangsheng: '长生推演',
};

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

function ConfidenceBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  const color =
    percent >= 80 ? 'bg-emerald-400' :
    percent >= 60 ? 'bg-amber-400' :
    'bg-rose-400';
  const textColor =
    percent >= 80 ? 'text-emerald-300' :
    percent >= 60 ? 'text-amber-300' :
    'text-rose-300';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-on-surface/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${textColor}`}>{percent}%</span>
    </div>
  );
}

function StepCard({ step, index }: { step: ReasoningStep; index: number }) {
  const [outputExpanded, setOutputExpanded] = useState(false);
  const isLongOutput = step.toolOutput.length > 120;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative pl-6 pb-4 last:pb-0"
    >
      <div className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full bg-primary/60 ring-2 ring-primary/20" />
      {index > 0 && (
        <div className="absolute left-[4.5px] -top-1 w-px h-3 bg-outline/20" />
      )}

      <div className="rounded-xl border border-outline/10 bg-surface-container-low/30 overflow-hidden">
        <div className="px-3.5 py-2.5 flex items-center gap-2">
          <Icon name="build_circle" size={16} className="text-primary/70" />
          <span className="text-sm font-medium text-on-surface/80">{getToolLabel(step.toolName)}</span>
          <div className="ml-auto w-20">
            <ConfidenceBar value={step.confidence} />
          </div>
        </div>

        <div className="px-3.5 pb-2.5 space-y-2">
          {step.llmInterpretation && (
            <p className="text-sm text-on-surface/65 leading-relaxed">{step.llmInterpretation}</p>
          )}

          {step.toolOutput && (
            <div className="rounded-lg border border-outline/[0.06] bg-surface-container-lowest/40 overflow-hidden">
              <button
                onClick={() => setOutputExpanded(!outputExpanded)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
              >
                <span>原始输出</span>
                <Icon
                  name={outputExpanded ? 'expand_less' : 'expand_more'}
                  size={14}
                  className="text-on-surface-variant/40"
                />
              </button>
              <AnimatePresence initial={false}>
                {(outputExpanded || !isLongOutput) && (
                  <motion.div
                    initial={isLongOutput ? { height: 0, opacity: 0 } : undefined}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={isLongOutput ? { height: 0, opacity: 0 } : undefined}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2.5">
                      <p className="text-xs text-on-surface/40 leading-relaxed whitespace-pre-wrap font-mono">
                        {step.toolOutput}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ReasoningSteps({ steps, judgment, cost, costReminder }: ReasoningStepsProps) {
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');

  if (!steps || steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card p-5 md:p-6 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2">
          <Icon name="route" size={20} />
          推理链路
        </h2>
        <button
          onClick={() => setMode(mode === 'quick' ? 'detailed' : 'quick')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Icon name={mode === 'quick' ? 'unfold_more' : 'unfold_less'} size={14} />
          {mode === 'quick' ? '看详细推理' : '快速看结果'}
        </button>
      </div>

      {mode === 'quick' ? (
        <div className="space-y-3">
          {judgment && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="gavel" size={16} className="text-primary" />
                <span className="text-xs text-primary font-medium">判语</span>
              </div>
              <p className="text-sm md:text-base text-on-surface/85 leading-relaxed">{judgment}</p>
            </div>
          )}
          {cost && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="payments" size={16} className="text-amber-300" />
                <span className="text-xs text-amber-300 font-medium">代价</span>
              </div>
              <p className="text-sm text-on-surface/70 leading-relaxed">{cost}</p>
            </div>
          )}
          {costReminder && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-400/[0.08] border border-rose-400/15 px-3 py-2.5">
              <Icon name="warning" size={16} className="text-rose-300 mt-0.5 shrink-0" />
              <p className="text-xs text-on-surface/55 leading-relaxed">{costReminder}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {(judgment || cost || costReminder) && (
            <div className="space-y-3 mb-5">
              {judgment && (
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name="gavel" size={16} className="text-primary" />
                    <span className="text-xs text-primary font-medium">判语</span>
                  </div>
                  <p className="text-sm md:text-base text-on-surface/85 leading-relaxed">{judgment}</p>
                </div>
              )}
              {cost && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name="payments" size={16} className="text-amber-300" />
                    <span className="text-xs text-amber-300 font-medium">代价</span>
                  </div>
                  <p className="text-sm text-on-surface/70 leading-relaxed">{cost}</p>
                </div>
              )}
              {costReminder && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-400/[0.08] border border-rose-400/15 px-3 py-2.5">
                  <Icon name="warning" size={16} className="text-rose-300 mt-0.5 shrink-0" />
                  <p className="text-xs text-on-surface/55 leading-relaxed">{costReminder}</p>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-outline/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="account_tree" size={16} className="text-on-surface-variant/60" />
              <span className="text-xs text-on-surface-variant/60 font-medium">
                共 {steps.length} 步推理
              </span>
            </div>
            <div className="relative ml-1">
              <div className="absolute left-[4.5px] top-2 bottom-2 w-px bg-outline/15" />
              {steps.map((step, i) => (
                <StepCard key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
