import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface Feature {
  key: string;
  icon: string;
  title: string;
  formula?: string;
  description: string;
}

const FEATURES_CN: Feature[] = [
  {
    key: 'systems-thinking',
    icon: 'balance',
    title: '中国系统思想建模',
    formula: 'LifeCloseₜ = Σ wᵢ · z(Lineᵢ,ₜ)',
    description:
      '太极看总盘，阴阳看平衡，五行看功能，八卦看状态，紫微看领域。古人用五套模型理解人生——我们把它们变成了五组可以计算的参数。',
  },
  {
    key: 'kline',
    icon: 'show_chart',
    title: '命运 K 线',
    formula: 'Stateₜ = f(趋势, 波动, 风险, 资源, 行动, 反馈)',
    description:
      '处境+选择 构成命运，七条维度线叠在 K 线上——你看得见趋势，也看得见波动。',
  },
  {
    key: 'tide-radar',
    icon: 'track_changes',
    title: '十二宫潮汐雷达',
    description:
      '紫微十二宫映射十二个人生领域，同时扫描。事业、财富、关系、健康——每一维都有你的历史基准线。同一个数字在不同阶段意义不同。',
  },
  {
    key: 'phase-space',
    icon: 'bubble_chart',
    title: '人生相位空间',
    description:
      '物理学相空间概念引入人生分析。X 轴代表承载力，Y 轴代表无序度，气泡大小是你面前的机会。四个象限四种颜色——一眼看清自己站在哪里。',
  },
  {
    key: 'five-masters',
    icon: 'diversity_3',
    title: '五大术数体系',
    description:
      '八字看命理格局、大六壬看当下、六爻看变动、紫微斗数看领域、姓名学看气象——五大学派的专精 Agent。各有独立知识库与规则引擎，交叉校验。',
  },
  {
    key: 'visual-reasoning',
    icon: 'visibility',
    title: '可视化推理 · 可追溯',
    description:
      '从时间校准到多学派综合，每一步推理完全可见——可追溯、可审计。每条结论标注置信度，连接古籍原文。你看到的不只是结论，更是推导过程。',
  },
];

const FEATURES_EN: Feature[] = [
  {
    key: 'systems-thinking',
    icon: 'balance',
    title: 'Chinese Systems Thinking',
    formula: 'LifeCloseₜ = Σ wᵢ · z(Lineᵢ,ₜ)',
    description:
      'Taiji for the whole picture, Yin-Yang for balance, Five Elements for function, Bagua for state, Ziwei for domains. Five ancient models of understanding life — translated into five sets of computable parameters.',
  },
  {
    key: 'kline',
    icon: 'show_chart',
    title: 'Destiny K-Line',
    formula: 'Stateₜ = f(Trend, Volatility, Risk, Resources, Action, Feedback)',
    description:
      'Circumstance + choice shape destiny. Seven dimension lines overlaid on the K-line chart — you can see the trend, and the volatility.',
  },
  {
    key: 'tide-radar',
    icon: 'track_changes',
    title: '12-Palace Tide Radar',
    description:
      'Ziwei\'s twelve palaces mapped to twelve life domains, scanned simultaneously. Career, wealth, relationships, health — each with your personal baseline. The same number means different things at different stages.',
  },
  {
    key: 'phase-space',
    icon: 'bubble_chart',
    title: 'Life Phase Space',
    description:
      'Physics phase-space concepts applied to life analysis. X-axis for capacity, Y-axis for entropy, bubble size for the opportunities ahead. Four quadrants, four colors — see where you stand at a glance.',
  },
  {
    key: 'five-masters',
    icon: 'diversity_3',
    title: 'Five Numerology Systems',
    description:
      'Bazi for destiny patterns, Da Liu Ren for the present, Liu Yao for change, Ziwei Dou Shu for domains, Naming for momentum — five specialized agents. Independent knowledge bases and rule engines; cross-validation throughout.',
  },
  {
    key: 'visual-reasoning',
    icon: 'visibility',
    title: 'Visual Reasoning · Traceable',
    description:
      'From temporal calibration to multi-school synthesis, every reasoning step is fully visible — traceable and auditable. Every output is confidence-scored and linked to classical sources. You see not just conclusions, but the derivation process.',
  },
];

export default function EngineFeatures() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const features = isEnglish ? FEATURES_EN : FEATURES_CN;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-lg lg:text-xl font-semibold text-on-surface mb-2">
          {isEnglish
            ? 'Chinese Systems Thinking × Algorithmic Verification'
            : '中国系统思想建模人生，算法验证人生波动'}
        </h2>
        <p className="text-sm text-on-surface/40 max-w-lg mx-auto">
          {isEnglish
            ? 'Not about believing in numerology — your life deserves a more serious coordinate system. Eastern systems thinking discovers relationships; modern algorithms verify them. Numerology is encodable, toggleable, and testable.'
            : '不是信不信命理——是你的人生，值得一套更认真的坐标系。东方系统思维发现关系，现代算法验证关系。命理可编码、可开关、可回测。'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 * index, ease: EASE_OUT_EXPO }}
            className="group rounded-2xl bg-surface-container-low/40 border border-outline/6 p-5 transition-all duration-300 hover:border-amber-400/20 hover:bg-surface-container-low/60"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4 group-hover:bg-amber-400/15 transition-colors">
              <span
                className="material-symbols-outlined text-amber-400"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
              >
                {feature.icon}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-2">{feature.title}</h3>
            {feature.formula && (
              <p
                className="text-xs text-amber-400/80 mb-2 tracking-wide"
                style={{ fontFamily: 'KaTeX_Math, KaTeX_Main, "Latin Modern Math", serif' }}
              >
                {feature.formula}
              </p>
            )}
            <p className="text-xs text-on-surface/50 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
