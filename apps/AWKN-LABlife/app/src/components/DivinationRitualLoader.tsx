import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface RitualStep {
  id: string;
  label: string;
  icon: string;
  description: string;
  detail?: string;
}

interface TimelineEvent {
  year: number;
  age: number;
  label: string;
  description: string;
}

interface DivinationRitualLoaderProps {
  isLoading: boolean;
  onComplete?: () => void;
  type?: 'bazi' | 'ziwei' | 'qimen' | 'liuren' | 'general';
  birthDate?: string;
  nickname?: string;
}

type LoaderPhase = 'entering' | 'calculating' | 'timeline' | 'complete';

// ============================================================================
// Ritual Configurations — 仪式化步骤配置
// ============================================================================

const RITUAL_CONFIGS: Record<string, RitualStep[]> = {
  bazi: [
    { id: 'solar', label: '校准真太阳时', icon: '☀️', description: '根据出生地经度计算真太阳时', detail: '太阳时校准中...' },
    { id: 'sizhu', label: '排定四柱', icon: '🏛️', description: '年柱 · 月柱 · 日柱 · 时柱', detail: '天干地支排列中...' },
    { id: 'wuxing', label: '分析五行', icon: '🔥', description: '金木水火土力量分布', detail: '五行力量计算中...' },
    { id: 'shishen', label: '推算十神', icon: '⚖️', description: '正官 · 七杀 · 正印 · 偏印 · 比肩 · 劫财 · 食神 · 伤官 · 正财 · 偏财', detail: '十神关系推演中...' },
    { id: 'dayun', label: '排大运流年', icon: '🌊', description: '十年一大运，逐年推演', detail: '大运流年排列中...' },
    { id: 'shensha', label: '查神煞', icon: '✨', description: '天乙贵人 · 文昌 · 桃花 · 驿马', detail: '神煞星曜检索中...' },
    { id: 'pattern', label: '定格局', icon: '🎯', description: '从格 · 化格 · 专旺格', detail: '命盘格局判定中...' },
    { id: 'report', label: '生成命书', icon: '📜', description: '综合研判，生成分析报告', detail: '命书撰写中...' },
  ],
  ziwei: [
    { id: 'mingpan', label: '安命宫', icon: '🏠', description: '根据生月午时逆数至生时', detail: '命宫定位中...' },
    { id: 'wuxingju', label: '定五行局', icon: '🌿', description: '水二局 · 木三局 · 金四局 · 土五局 · 火六局', detail: '五行局数判定中...' },
    { id: 'xingyao', label: '布星曜', icon: '⭐', description: '紫微星系 · 天府星系 · 辅弼昌曲', detail: '十四主星布列中...' },
    { id: 'sihua', label: '安四化', icon: '🔄', description: '禄 · 权 · 科 · 忌', detail: '四化飞星推演中...' },
    { id: 'gongwei', label: '定十二宫', icon: '⭕', description: '命宫 · 兄弟 · 夫妻 · 子女 · 财帛 · 疾厄 · 迁移 · 交友 · 官禄 · 田宅 · 福德 · 父母', detail: '十二宫位排定中...' },
    { id: 'daxian', label: '排大限', icon: '📅', description: '十年一大限，宫干四化', detail: '大限流年排列中...' },
    { id: 'report', label: '生成命书', icon: '📜', description: '综合研判，生成分析报告', detail: '命书撰写中...' },
  ],
  qimen: [
    { id: 'dunju', label: '定局', icon: '🎲', description: '阳遁九局 · 阴遁九局', detail: '遁甲局数判定中...' },
    { id: 'bujia', label: '布甲', icon: '📿', description: '六仪 · 三奇', detail: '六甲三奇布列中...' },
    { id: 'xunshou', label: '寻旬首', icon: '🔍', description: '甲子戊 · 甲戌己 · 甲申庚 · 甲午辛 · 甲辰壬 · 甲寅癸', detail: '旬首检索中...' },
    { id: 'zhifu', label: '定值符值使', icon: '👑', description: '值符星 · 值使门', detail: '值符值使定位中...' },
    { id: 'buxing', label: '排八门', icon: '🚪', description: '休 · 生 · 伤 · 杜 · 景 · 死 · 惊 · 开', detail: '八门九星布列中...' },
    { id: 'baxing', label: '布九星', icon: '🌟', description: '天蓬 · 天任 · 天冲 · 天辅 · 天英 · 天芮 · 天柱 · 天心', detail: '九星八神排定中...' },
    { id: 'bashen', label: '排八神', icon: '👻', description: '值符 · 螣蛇 · 太阴 · 六合 · 白虎 · 玄武 · 九地 · 九天', detail: '八神布局中...' },
    { id: 'report', label: '生成命书', icon: '📜', description: '综合研判，生成分析报告', detail: '命书撰写中...' },
  ],
  liuren: [
    { id: 'yuejiang', label: '定月将', icon: '🌙', description: '根据中气换将', detail: '月将加时定位中...' },
    { id: 'tiangan', label: '排天干', icon: '🔤', description: '日干 · 日支', detail: '干支四课排列中...' },
    { id: 'sike', label: '起四课', icon: '📖', description: '干上神 · 支上神', detail: '四课三传推演中...' },
    { id: 'sanchuan', label: '定三传', icon: '📿', description: '初传 · 中传 · 末传', detail: '三传六亲判定中...' },
    { id: 'tiangan2', label: '排天将', icon: '🧙', description: '贵人 · 螣蛇 · 朱雀 · 六合 · 勾陈 · 青龙 · 天空 · 白虎 · 太常 · 玄武 · 太阴 · 天后', detail: '十二天将布列中...' },
    { id: 'panduan', label: '综合判断', icon: '🔮', description: '生克 · 刑冲 · 合害', detail: '吉凶祸福判定中...' },
    { id: 'report', label: '生成命书', icon: '📜', description: '综合研判，生成分析报告', detail: '命书撰写中...' },
  ],
  general: [
    { id: 'prepare', label: '准备命盘', icon: '🌌', description: '收集生辰信息，初始化推演环境', detail: '命盘初始化中...' },
    { id: 'calculate', label: '计算命盘', icon: '🔢', description: '排定天干地支，分析五行力量', detail: '命盘计算中...' },
    { id: 'analyze', label: '深度分析', icon: '🔍', description: '推演十神关系，判定格局喜忌', detail: '深度分析中...' },
    { id: 'predict', label: '预测推演', icon: '🔮', description: '排大运流年，查神煞吉凶', detail: '预测推演中...' },
    { id: 'synthesize', label: '综合研判', icon: '⚖️', description: '交叉验证，综合判断', detail: '综合研判中...' },
    { id: 'report', label: '生成命书', icon: '📜', description: '撰写命书，生成分析报告', detail: '命书撰写中...' },
  ],
};

// ============================================================================
// Timeline Data — 人生时间线示例数据
// ============================================================================

const generateTimeline = (birthYear: number): TimelineEvent[] => [
  { year: birthYear, age: 0, label: '命宫开启', description: '天命降临，命盘启动' },
  { year: birthYear + 1, age: 1, label: '起运', description: '大运开始流转' },
  { year: birthYear + 10, age: 10, label: '第一个十年', description: '童年运势初现' },
  { year: birthYear + 20, age: 20, label: '弱冠之年', description: '成年自立，运势转折' },
  { year: birthYear + 30, age: 30, label: '而立之年', description: '事业家庭初定' },
  { year: birthYear + 40, age: 40, label: '不惑之年', description: '人生方向明确' },
  { year: birthYear + 50, age: 50, label: '知天命', description: '顺应天时，知命不惑' },
  { year: birthYear + 60, age: 60, label: '耳顺之年', description: '甲子轮回，一甲子完' },
];

// ============================================================================
// Sub-Components
// ============================================================================

/** 太极旋转图标 */
function TaijiSpinner({ size = 48 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path
        d="M50 5 A45 45 0 0 1 50 95 A22.5 22.5 0 0 1 50 50 A22.5 22.5 0 0 0 50 5"
        fill="currentColor"
        opacity="0.6"
      />
      <circle cx="50" cy="27.5" r="6" fill="currentColor" opacity="0.8" />
      <circle cx="50" cy="72.5" r="6" fill="currentColor" opacity="0.3" />
    </motion.svg>
  );
}

/** 粒子背景效果 */
function ParticleBackground() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/** 八卦阵装饰 */
function BaguaDecoration() {
  const trigrams = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="relative w-96 h-96"
      >
        {trigrams.map((trigram, i) => {
          const angle = (i * 45 - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * 160;
          const y = Math.sin(angle) * 160;
          return (
            <div
              key={i}
              className="absolute text-4xl text-amber-500"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {trigram}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/** 时间线展示 */
function TimelineDisplay({ events, currentIndex }: { events: TimelineEvent[]; currentIndex: number }) {
  return (
    <div className="relative py-8">
      {/* 中心轴线 */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
      
      <div className="space-y-6">
        {events.map((event, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <motion.div
              key={event.year}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{
                opacity: isActive ? 1 : 0.2,
                x: 0,
                scale: isCurrent ? 1.05 : 1,
              }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex items-center gap-4 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {/* 内容卡片 */}
              <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                <motion.div
                  className={`inline-block p-3 rounded-xl border ${
                    isCurrent
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : isActive
                      ? 'border-white/10/10 bg-white/[0.03]'
                      : 'border-white/10/5 bg-white/[0.01]'
                  }`}
                >
                  <div className="text-sm font-medium text-amber-400">{event.label}</div>
                  <div className="text-xs text-white/50 mt-1">{event.description}</div>
                  <div className="text-xs text-white/30 mt-1">{event.year}年 · {event.age}岁</div>
                </motion.div>
              </div>
              
              {/* 节点 */}
              <motion.div
                className={`w-4 h-4 rounded-full border-2 z-10 ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500'
                    : isActive
                    ? 'border-amber-500/50 bg-amber-500/20'
                    : 'border-white/10/10 bg-transparent'
                }`}
                animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              
              {/* 占位 */}
              <div className="flex-1" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** 单步骤卡片 */
function StepCard({
  step,
  index,
  isCompleted,
  isActive,
  isPending,
}: {
  step: RitualStep;
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{
        opacity: isPending ? 0.2 : 1,
        x: 0,
        scale: isActive ? 1.02 : 1,
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
        isActive
          ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5'
          : isCompleted
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-white/10/5 bg-white/[0.02]'
      }`}
    >
      {/* 序号/图标 */}
      <motion.div
        animate={isActive ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
          isActive
            ? 'bg-amber-500/20 text-amber-400'
            : isCompleted
            ? 'bg-green-500/20 text-green-400'
            : 'bg-white/5 text-white/30'
        }`}
      >
        {isCompleted ? '✓' : step.icon}
      </motion.div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              isActive ? 'text-amber-400' : isCompleted ? 'text-green-400' : 'text-white/50'
            }`}
          >
            {step.label}
          </span>
          {isActive && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-xs text-amber-400 font-medium"
            >
              {step.detail || '推演中...'}
            </motion.span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-1 leading-relaxed">{step.description}</p>
      </div>

      {/* 状态指示器 */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-white/10/10" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DivinationRitualLoader({
  isLoading,
  onComplete,
  type = 'general',
  birthDate,
  nickname,
}: DivinationRitualLoaderProps) {
  const [phase, setPhase] = useState<LoaderPhase>('entering');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [timelineIndex, setTimelineIndex] = useState(0);
  const controls = useAnimation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = RITUAL_CONFIGS[type] || RITUAL_CONFIGS.general;
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : 1990;
  const timelineEvents = generateTimeline(birthYear);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const runCalculationPhase = useCallback(() => {
    setPhase('calculating');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setTimelineIndex(0);

    let stepIndex = 0;
    // U-P0-2: 仪式步骤间隔 1000ms → 500ms（总时长 14s → 7s）
    intervalRef.current = setInterval(() => {
      if (stepIndex >= steps.length) {
        clearIntervalRef();
        // Transition to timeline phase
        setPhase('timeline');

        // Animate timeline
        let tiIndex = 0;
        // U-P0-2: timeline 间隔 600ms → 300ms
        intervalRef.current = setInterval(() => {
          if (tiIndex >= timelineEvents.length) {
            clearIntervalRef();
            setPhase('complete');
            // U-P0-2: complete 延迟 2000ms → 1000ms
            setTimeout(() => {
              onComplete?.();
            }, 1000);
            return;
          }
          setTimelineIndex(tiIndex);
          tiIndex++;
        }, 300);
        return;
      }

      setCurrentStep(stepIndex);
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(steps[stepIndex].id);
        return next;
      });
      stepIndex++;
    }, 500);
  }, [steps, timelineEvents.length, onComplete, clearIntervalRef]);

  useEffect(() => {
    if (isLoading) {
      setPhase('entering');
      controls.start({ opacity: 1, scale: 1 });

      // U-P0-2: entering 延迟 800ms → 400ms
      const timer = setTimeout(() => {
        runCalculationPhase();
      }, 400);
      
      return () => {
        clearTimeout(timer);
        clearIntervalRef();
      };
    } else {
      setPhase('entering');
      setCompletedSteps(new Set());
      setCurrentStep(0);
      setTimelineIndex(0);
    }
  }, [isLoading, controls, runCalculationPhase, clearIntervalRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearIntervalRef();
  }, [clearIntervalRef]);

  if (!isLoading && phase !== 'complete') return null;

  const progress = phase === 'calculating' 
    ? ((currentStep + 1) / steps.length) * 100 
    : phase === 'timeline'
    ? 100
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        // U-P0-2: 仪式动画改为背景层 — z-50→z-10, bg-black/90→bg-black/70
        // 让 ResultPage 的 LLM 流式文本层在上方（z-20+）展示核心结论
        className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        {/* Background Effects */}
        <ParticleBackground />
        <BaguaDecoration />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10/10 bg-[#0f0f1a]/95 p-8 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-4"
            >
              <TaijiSpinner size={48} />
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {phase === 'entering' && '准备推演'}
                  {phase === 'calculating' && '正在推演命盘'}
                  {phase === 'timeline' && '人生命途'}
                  {phase === 'complete' && '推演完成'}
                </h2>
                <p className="text-sm text-white/50">
                  {phase === 'entering' && '天机不可泄露，请稍候...'}
                  {phase === 'calculating' && `步骤 ${currentStep + 1} / ${steps.length} · ${Math.round(progress)}%`}
                  {phase === 'timeline' && '人生轨迹，时空交错'}
                  {phase === 'complete' && '天机已现，请查看命书'}
                </p>
                {nickname && (
                  <p className="text-xs text-amber-400/60 mt-2">为 {nickname} 推演中</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          {(phase === 'calculating' || phase === 'timeline') && (
            <div className="mb-8">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-white/30">排盘</span>
                <span className="text-xs text-white/30">推演</span>
                <span className="text-xs text-white/30">洞察</span>
              </div>
            </div>
          )}

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {/* Calculating Phase */}
            {phase === 'calculating' && (
              <motion.div
                key="calculating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-3"
              >
                {steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    isCompleted={completedSteps.has(step.id)}
                    isActive={index === currentStep}
                    isPending={index > currentStep}
                  />
                ))}
              </motion.div>
            )}

            {/* Timeline Phase */}
            {phase === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-amber-400">人生时间线</h3>
                  <p className="text-xs text-white/40 mt-1">命盘轨迹，时空锚定</p>
                </div>
                <TimelineDisplay events={timelineEvents} currentIndex={timelineIndex} />
              </motion.div>
            )}

            {/* Complete Phase */}
            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-lg shadow-amber-500/20"
                >
                  <span className="text-4xl">📜</span>
                </motion.div>
                
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-white mb-2"
                >
                  命书已成
                </motion.h3>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-white/50 mb-8"
                >
                  千年术数，一瞬洞察
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/20"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    ✨
                  </motion.span>
                  <span>查看命书</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Quote */}
          {phase !== 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 text-center"
            >
              <p className="text-xs text-white/20 italic">
                "像大师一样思考；像工程师一样输出"
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DivinationRitualLoader;
