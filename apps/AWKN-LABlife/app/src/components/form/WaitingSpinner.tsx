/**
 * @deprecated 推演仪式旧版等待图，仅 ComponentPreview 引用。
 * 业务代码请使用 feedback/LoadingState。
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DivinationLoaderProps {
  engineName?: string;
  onComplete?: () => void;
  duration?: number;
}

const RITUAL_STEPS = [
  '起局排盘',
  '纳甲安星',
  '推演气机',
  '参详命数',
  '凝练结论',
];

export default function WaitingSpinner({
  engineName = '推演',
  onComplete,
  duration = 3000,
}: DivinationLoaderProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = duration / RITUAL_STEPS.length;
    let currentStep = 0;

    const stepTimer = setInterval(() => {
      currentStep += 1;
      if (currentStep >= RITUAL_STEPS.length) {
        clearInterval(stepTimer);
        setTimeout(() => onComplete?.(), 400);
      } else {
        setStep(currentStep);
      }
    }, stepInterval);

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return p + 2;
      });
    }, duration / 50);

    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
    };
  }, [duration, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      {/* 八卦旋转 */}
      <div className="relative w-40 h-40">
        {/* 外圈 — 八卦符号 */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          {['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'].map((trigram, i) => {
            const angle = (i * 45 - 90) * (Math.PI / 180);
            const r = 70;
            const x = 80 + r * Math.cos(angle);
            const y = 80 + r * Math.sin(angle);
            return (
              <motion.span
                key={trigram}
                className="absolute text-primary/60 text-lg font-serif"
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              >
                {trigram}
              </motion.span>
            );
          })}
        </motion.div>

        {/* 中圈 — 星辰连线 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
          {/* 背景圆 */}
          <circle cx="80" cy="80" r="45" fill="none" stroke="hsl(var(--primary) / 0.1)" strokeWidth="0.5" />
          <circle cx="80" cy="80" r="30" fill="none" stroke="hsl(var(--primary) / 0.08)" strokeWidth="0.5" />

          {/* 星辰点 */}
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60 - 90 + step * 12) * (Math.PI / 180);
            const r = 38;
            const x = 80 + r * Math.cos(angle);
            const y = 80 + r * Math.sin(angle);
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill="hsl(var(--primary))"
                animate={{
                  r: [2, 3.5, 2],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            );
          })}

          {/* 连线 */}
          {Array.from({ length: 6 }, (_, i) => {
            const angle1 = (i * 60 - 90 + step * 12) * (Math.PI / 180);
            const angle2 = ((i + 1) * 60 - 90 + step * 12) * (Math.PI / 180);
            const r = 38;
            const x1 = 80 + r * Math.cos(angle1);
            const y1 = 80 + r * Math.sin(angle1);
            const x2 = 80 + r * Math.cos(angle2);
            const y2 = 80 + r * Math.sin(angle2);
            return (
              <motion.line
                key={`line-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="0.5"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            );
          })}

          {/* 中心发光 */}
          <motion.circle
            cx="80"
            cy="80"
            r="8"
            fill="hsl(var(--primary) / 0.15)"
            animate={{
              r: [6, 12, 6],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>

        {/* 内圈文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-primary text-sm font-serif font-bold"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {engineName}
          </motion.span>
        </div>
      </div>

      {/* 步骤文字 */}
      <div className="text-center space-y-3">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-primary font-medium text-base tracking-wide"
        >
          {RITUAL_STEPS[step]}
        </motion.div>
        <div className="text-on-surface-variant text-xs">
          {step + 1} / {RITUAL_STEPS.length}
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-48 h-1 bg-surface-container-high rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
