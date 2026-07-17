/**
 * 潮汐状态判断服务 - Q3 P3-2
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StateSnapshot {
  energy: number;
  recovery: number;
  emotion: number;
  clarity: number;
  liquidity: number;
  momentum: number;
  support: number;
  agency: number;
  order: number;
  growth: number;
  optionality: number;
  buffer: number;
  timeGroup?: number;
  positionGroup?: number;
  mindGroup?: number;
  quadrant: string;
}

export interface TideJudgment {
  timeStatus: GroupJudgment;
  positionStatus: GroupJudgment;
  mindStatus: GroupJudgment;
  phaseJudgment: string;
  shortDirective: string;
  windowTip: string;
  actionAdvice: string;
}

export interface GroupJudgment {
  score: number;
  level: 'high' | 'mid' | 'low';
  label: string;
}

function calcGroup(values: number[]): { avg: number; level: 'high' | 'mid' | 'low' } {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const level: 'high' | 'mid' | 'low' = avg >= 70 ? 'high' : avg >= 40 ? 'mid' : 'low';
  return { avg, level };
}

export class TideJudgmentService {
  static judgeTime(snap: StateSnapshot): GroupJudgment {
    const r = calcGroup([snap.liquidity, snap.momentum, snap.optionality]);
    const labels = { high: '时机充沛，行动窗口开放', mid: '时机中性，可有选择地推进', low: '时机紧锁，宜观察储备' };
    return { score: r.avg, level: r.level, label: labels[r.level] };
  }

  static judgePosition(snap: StateSnapshot): GroupJudgment {
    const r = calcGroup([snap.support, snap.agency, snap.order, snap.growth, snap.buffer]);
    const labels = { high: '根基稳固，可承担新投入', mid: '基础中等，注意风险对冲', low: '根基薄弱，优先稳固现有' };
    return { score: r.avg, level: r.level, label: labels[r.level] };
  }

  static judgeMind(snap: StateSnapshot): GroupJudgment {
    const r = calcGroup([snap.energy, snap.recovery, snap.emotion, snap.clarity]);
    const labels = { high: '心能充沛，决策清晰', mid: '心能平稳，避免过度决策', low: '心能偏低，休息优先' };
    return { score: r.avg, level: r.level, label: labels[r.level] };
  }

  static judgePhase(t: string, p: string, m: string): string {
    if (t === 'high' && p === 'high' && m === 'high') return '三高齐发：黄金行动期';
    if (t === 'low' && p === 'low') return '低位蛰伏：守势为主';
    if (t === 'high' && p === 'low') return '时机有但根基未稳：谨慎试探';
    if (t === 'low' && p === 'high') return '厚积薄发：等待窗口';
    if (m === 'low') return '心能不足：先修内再外求';
    return '中位震荡：按既定节奏推进';
  }

  static generateShortDirective(phase: string): string {
    const map: Record<string, string> = {
      '三高齐发：黄金行动期': '推进关键决策，主动出击',
      '低位蛰伏：守势为主': '收缩战线，保存实力',
      '时机有但根基未稳：谨慎试探': '小步快跑，快速验证',
      '厚积薄发：等待窗口': '修炼内功，准备出击',
      '心能不足：先修内再外求': '暂停重大决策，恢复优先',
      '中位震荡：按既定节奏推进': '保持节奏，不冒进不保守',
    };
    return map[phase] || '保持觉察，伺机而动';
  }

  static generateWindowTip(t: string, m: string): string {
    if (t === 'high' && m === 'high') return '未来 1-2 周为最佳行动窗口';
    if (t === 'low') return '未来 4-6 周宜观察储备';
    return '未来 1 个月按计划推进';
  }

  static generateActionAdvice(p: string, m: string): string {
    if (p === 'low') return '建议：先稳固 1-2 个核心领域';
    if (m === 'low') return '建议：保证 7-8 小时睡眠，暂停重大决定';
    if (p === 'high' && m === 'high') return '建议：可投入新项目，设定明确里程碑';
    return '建议：维持当前推进节奏';
  }

  static buildTideJudgment(snap: StateSnapshot): TideJudgment {
    const timeStatus = this.judgeTime(snap);
    const positionStatus = this.judgePosition(snap);
    const mindStatus = this.judgeMind(snap);
    const phaseJudgment = this.judgePhase(timeStatus.level, positionStatus.level, mindStatus.level);
    return {
      timeStatus,
      positionStatus,
      mindStatus,
      phaseJudgment,
      shortDirective: this.generateShortDirective(phaseJudgment),
      windowTip: this.generateWindowTip(timeStatus.level, mindStatus.level),
      actionAdvice: this.generateActionAdvice(positionStatus.level, mindStatus.level),
    };
  }
}

export default TideJudgmentService;
