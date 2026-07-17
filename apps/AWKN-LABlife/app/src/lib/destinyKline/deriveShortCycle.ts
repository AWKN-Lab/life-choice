import type {
  PeriodType,
  KlineAspect,
  ShortCycleConfig,
  ShortCycleKlinePoint,
  ShortCycleKlineResult,
} from './types';
import { SHORT_CYCLE_CONFIGS, clamp } from './types';

function calcDayScore(
  dayGanZhi: string,
  daYunScore: number,
  birthWuxing: Record<string, number>,
  dayConflicts: string[]
): number {
  const wuxingMap: Record<string, string> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火',
    戊: '土', 己: '土', 庚: '金', 辛: '金',
    壬: '水', 癸: '水',
    寅: '木', 卯: '木', 巳: '火', 午: '火',
    辰: '土', 戌: '土', 丑: '土', 未: '土',
    申: '金', 酉: '金', 亥: '水', 子: '水',
  };

  const wuxingScore: Record<string, number> = {
    木: 72, 火: 78, 土: 68, 金: 70, 水: 76,
  };

  const gan = dayGanZhi[0];
  const zhi = dayGanZhi[1];
  const ganWx = wuxingMap[gan] || '';
  const zhiWx = wuxingMap[zhi] || '';

  const dayWxScore = (wuxingScore[ganWx] || 60) * 0.6 + (wuxingScore[zhiWx] || 60) * 0.4;

  const birthWxBonus = birthWuxing[ganWx] || birthWuxing[zhiWx] || 0;
  const wxCompat = birthWxBonus > 0 ? Math.min(birthWxBonus * 0.15, 8) : 0;

  const penalty = dayConflicts.length * 6;

  return clamp(
    dayWxScore * 0.3 + daYunScore * 0.2 + wxCompat + 35 - penalty,
    10,
    90
  );
}

function calcDaySignal(
  score: number,
  dayGanZhi: string,
  dayConflicts: string[],
  prevScore?: number
): string {
  const gan = dayGanZhi[0];
  const yinStars = ['甲', '乙', '丙'];
  const shiStars = ['庚', '辛'];

  if (dayConflicts.length >= 2) return '不宜硬碰';
  if (prevScore !== undefined && score > prevScore + 5) return '先低后高';
  if (prevScore !== undefined && score < prevScore - 5) return '先高后低';
  if (yinStars.includes(gan) && dayConflicts.length === 0) return '适合沟通';
  if (shiStars.includes(gan) && score >= 70) return '财运回升';
  if (dayConflicts.length === 1 && score < 60) return '事业等待';
  if (score >= 65 && score <= 75) return '稳中有动';
  if (score > 75) return '势头强劲';
  return '蓄力观望';
}

function generateDayPoints(
  days: number,
  calcResult: any,
  daYunScore: number,
  birthWuxing: Record<string, number>
): ShortCycleKlinePoint[] {
  const points: ShortCycleKlinePoint[] = [];
  const today = new Date();
  const liuRi = calcResult?.calcData?.liuRi || [];

  let prevScore: number | undefined;

  for (let offset = -days; offset <= 0; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);

    const liuRiEntry = liuRi.find((lr: any) => lr.date === dateStr);
    const dayGanZhi = liuRiEntry?.ganZhi || getFallbackGanZhi(d);
    const dayConflicts = liuRiEntry?.chongHe || [];

    const score = calcDayScore(dayGanZhi, daYunScore, birthWuxing, dayConflicts);
    const signalLabel = calcDaySignal(score, dayGanZhi, dayConflicts, prevScore);

    points.push({
      date: dateStr,
      dayOffset: offset,
      score,
      signalLabel,
      evidenceTags: dayConflicts.length > 0 ? dayConflicts : undefined,
    });

    prevScore = score;
  }

  return points;
}

function getFallbackGanZhi(_d: Date): string {
  // 简单取模无法得到正确干支日，返回占位符避免误导
  return '';
}

function buildSummary(points: ShortCycleKlinePoint[], days: number): ShortCycleKlineResult['summary'] {
  const today = points.find((p) => p.dayOffset === 0) || points[points.length - 1];
  const firstHalf = points.filter((p) => p.dayOffset < -Math.floor(days / 2));
  const secondHalf = points.filter((p) => p.dayOffset >= -Math.floor(days / 2));
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, p) => s + p.score, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, p) => s + p.score, 0) / secondHalf.length : 0;

  const suitable: string[] = [];
  const caution: string[] = [];

  if (today.score >= 65) suitable.push('沟通与签约');
  if (today.score >= 70) suitable.push('推进项目');
  if (!today.signalLabel.includes('不宜')) suitable.push('日常决策');

  if (today.signalLabel === '不宜硬碰') caution.push('避免冲突性决策');
  if (today.score < 55) caution.push('延后重要事项');
  if (today.evidenceTags && today.evidenceTags.length > 0) caution.push('注意人际关系');

  return {
    todaySignal: today.signalLabel || '平稳',
    overallTrend: secondAvg > firstAvg ? '先低后高' : secondAvg < firstAvg ? '先高后低' : '稳中有动',
    suitable,
    caution,
  };
}

export function deriveShortCycle(
  calcResult: any,
  periodKey: string,
  activeAspect?: KlineAspect
): ShortCycleKlineResult | null {
  const config = SHORT_CYCLE_CONFIGS[periodKey];
  if (!config) return null;

  const data = calcResult?.calcData || calcResult || {};
  const daYun = data.daYun || [];
  const birthWuxing = data.wuxing || {};
  const currentDaYun = daYun.length > 0 ? daYun[daYun.length - 1] : {};
  const daYunScore = currentDaYun?.score ?? 55;

  const days = config.days;
  const points = generateDayPoints(days, calcResult, daYunScore, birthWuxing);

  const summary = buildSummary(points, days);

  return {
    period: config.period,
    config,
    points,
    summary,
  };
}

export function deriveAllShortCycles(
  calcResult: any,
  activeAspect?: KlineAspect
): Record<string, ShortCycleKlineResult> {
  const cycles: Record<string, ShortCycleKlineResult> = {};
  const priorityOrder = ['day3', 'xun', 'month', 'quarter'];

  for (const key of priorityOrder) {
    const result = deriveShortCycle(calcResult, key, activeAspect);
    if (result) {
      cycles[key] = result;
    }
  }

  return cycles;
}