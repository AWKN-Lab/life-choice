import type { MonthlyKlineBar, StateSnapshot } from '../types/lifekline';
import { LIFE_DIMENSION_LABELS, QUADRANT_LABELS } from '../types/lifekline';

type DecisionTone = 'expand' | 'probe' | 'repair' | 'shrink';

export interface UnifiedDecisionBrief {
  tone: DecisionTone;
  headline: string;
  summary: string;
  nextStep: string;
  stance: string;
  positionHint: string;
  avoid: string;
  watchPoint: string;
  confidence: number;
  alignment: 'aligned' | 'mixed' | 'conflict';
  evidence: string[];
}

function labelTone(tone: DecisionTone) {
  if (tone === 'expand') return '扩张';
  if (tone === 'probe') return '试探';
  if (tone === 'repair') return '修复';
  return '收缩';
}

function pickWeakestDimension(bar?: MonthlyKlineBar | null) {
  if (!bar?.dimensions) return null;
  const entries = Object.entries(bar.dimensions) as Array<[keyof typeof LIFE_DIMENSION_LABELS, number]>;
  if (entries.length === 0) return null;
  const weakest = entries.reduce((worst, current) => (current[1] < worst[1] ? current : worst));
  return LIFE_DIMENSION_LABELS[weakest[0]]?.zh ?? weakest[0];
}

export function deriveUnifiedDecisionBrief(
  bar?: MonthlyKlineBar | null,
  snapshot?: StateSnapshot | null,
): UnifiedDecisionBrief | null {
  if (!bar || !snapshot) return null;

  const klineSignal = bar.signalLabel ?? '震荡整固';
  const tideTone = snapshot.actionBias ?? 'repair';
  const weakest = pickWeakestDimension(bar) ?? '短板项';
  const factorTrend = bar.factorScores?.trend ?? snapshot.factorScores?.trend ?? 50;
  const factorPressure = bar.factorScores?.pressure ?? snapshot.factorScores?.pressure ?? 50;
  const tideScore = snapshot.tideScore ?? 50;
  const windowMid = snapshot.windowScores?.mid ?? tideScore;
  const windowLong = snapshot.windowScores?.long ?? tideScore;

  let alignment: UnifiedDecisionBrief['alignment'] = 'mixed';
  if (
    (tideTone === 'expand' && ['主升窗口', '蓄势待发', '修复抬升', '震荡整固'].includes(klineSignal)) ||
    (tideTone === 'repair' && ['修复抬升', '震荡整固', '承压回撤'].includes(klineSignal)) ||
    (tideTone === 'shrink' && klineSignal === '承压回撤')
  ) {
    alignment = 'aligned';
  } else if (
    (tideTone === 'expand' && klineSignal === '承压回撤') ||
    (tideTone === 'shrink' && ['主升窗口', '蓄势待发'].includes(klineSignal))
  ) {
    alignment = 'conflict';
  }

  let tone: DecisionTone = tideTone;
  let headline = '';
  let summary = '';
  let nextStep = '';
  let stance = '';
  let positionHint = '';
  let avoid = '';
  let watchPoint = '';

  const coherenceBonus = Math.max(0, 12 - Math.abs(windowMid - windowLong));
  const pressurePenalty = Math.max(0, factorPressure - factorTrend) / 2;
  const alignmentBase = alignment === 'aligned' ? 72 : alignment === 'mixed' ? 58 : 44;
  const confidence = Math.max(
    28,
    Math.min(92, Math.round(alignmentBase + coherenceBonus + (tideScore - 50) / 4 - pressurePenalty)),
  );

  if (alignment === 'aligned' && tideTone === 'expand') {
    tone = 'expand';
    headline = '趋势和状态同向，适合有纪律地扩张';
    summary = `K 线处于 ${klineSignal}，潮汐落在 ${QUADRANT_LABELS[snapshot.quadrant].zh}，说明现在不是盲动，而是可以围绕已经验证的方向加速。`;
    nextStep = `优先放大已经跑通的主线，但别忽略 ${weakest}，否则扩张会变成透支。`;
    stance = '顺势推进';
    positionHint = '可以偏进攻，但只加在已经验证的主线上。';
    avoid = '不要同时铺开太多新线，也不要拿短期兴奋替代真实承接力。';
    watchPoint = `重点盯住 ${weakest} 和压力分，任何一项继续走弱都意味着该减速。`;
  } else if (alignment === 'aligned' && tideTone === 'repair') {
    tone = 'repair';
    headline = '趋势未坏，但当前更适合修复后再推';
    summary = `K 线没有彻底走弱，潮汐却提示 ${labelTone(tideTone)}，说明问题主要出在承载力，而不是方向本身。`;
    nextStep = `先补 ${weakest}，等中窗分重新站稳再把动作做大。`;
    stance = '以修代攻';
    positionHint = '暂不放大动作，先把底盘补厚。';
    avoid = '不要用新机会掩盖旧漏洞，也不要把修复期误判成错失期。';
    watchPoint = `看 ${weakest} 是否止跌，以及中窗分能否重新高于长窗。`;
  } else if (alignment === 'aligned' && tideTone === 'shrink') {
    tone = 'shrink';
    headline = '趋势和状态同时转弱，先收缩再判断';
    summary = `K 线已经进入 ${klineSignal}，潮汐也在 ${QUADRANT_LABELS[snapshot.quadrant].zh}，这时候继续冲会放大损耗。`;
    nextStep = `优先缩减消耗、停止无效试错，把 ${weakest} 稳住后再谈下一段。`;
    stance = '防守收口';
    positionHint = '动作宜小，先保现金流、精力和关系缓冲。';
    avoid = '不要为了证明原判断没错继续加码，也不要在承压期硬切新战线。';
    watchPoint = `先看压力分能否回落，再看 ${weakest} 是否从拖累项变回可控项。`;
  } else if (alignment === 'conflict') {
    tone = 'probe';
    headline = '长期趋势与当前状态背离，只适合小步试探';
    summary = `K 线给出的长期信号是 ${klineSignal}，但潮汐动作偏向 ${labelTone(tideTone)}。说明大方向和当下体感没有完全对上。`;
    nextStep = `不要一次性重仓，先用低成本试探验证，等状态和趋势重新同向再放大动作。`;
    stance = '轻仓试探';
    positionHint = '只做小闭环验证，不做一把梭的判断。';
    avoid = '不要把长期乐观直接翻译成当前重仓，也不要因短期难受彻底否定长期方向。';
    watchPoint = `最该盯的是中长窗是否重新同向，以及 ${weakest} 会不会继续拖累执行。`;
  } else {
    tone = 'probe';
    headline = '可以动，但要控制节奏';
    summary = `K 线处于 ${klineSignal}，潮汐综合分 ${tideScore.toFixed(1)}，说明局势不是坏掉，而是需要更谨慎地筛选主攻方向。`;
    nextStep = `先做最小闭环，再观察中长窗是否继续抬升，别被短期波动牵着走。`;
    stance = '观察中推进';
    positionHint = '允许动作，但更像试盘，不像决战。';
    avoid = '不要在证据还不够时提前下大结论，也不要因一次波动来回换方向。';
    watchPoint = `继续盯中长窗、趋势/压力差和 ${weakest} 的改善速度。`;
  }

  return {
    tone,
    headline,
    summary,
    nextStep,
    stance,
    positionHint,
    avoid,
    watchPoint,
    confidence,
    alignment,
    evidence: [
      `K线阶段：${klineSignal}`,
      `潮汐相位：${QUADRANT_LABELS[snapshot.quadrant].zh}`,
      `综合潮汐分：${tideScore.toFixed(1)}，中窗/长窗：${windowMid.toFixed(1)} / ${windowLong.toFixed(1)}`,
      `趋势/压力：${factorTrend.toFixed(1)} / ${factorPressure.toFixed(1)}`,
    ],
  };
}
