/**
 * VFM 评估模型
 *
 * 来源：天火智能体技能迁移报告 §1.1
 * V (Value) × 0.3 + F (Feasibility) × 0.3 + M (Match) × 0.4
 */

import { Injectable } from '@nestjs/common';

export interface VFMScore {
  value: number;
  feasibility: number;
  match: number;
}

export interface VFMEvaluation extends VFMScore {
  weightedScore: number;
}

export const VFM_WEIGHTS = {
  value: 0.3,
  feasibility: 0.3,
  match: 0.4,
} as const;

@Injectable()
export class VfmEvaluatorService {
  evaluate(score: VFMScore): VFMEvaluation {
    this.validate(score);
    const weightedScore =
      score.value * VFM_WEIGHTS.value +
      score.feasibility * VFM_WEIGHTS.feasibility +
      score.match * VFM_WEIGHTS.match;
    return { ...score, weightedScore: Number(weightedScore.toFixed(2)) };
  }

  rank(scores: Array<{ id: string; score: VFMScore }>): Array<{ id: string; evaluation: VFMEvaluation }> {
    return scores
      .map((s) => ({ id: s.id, evaluation: this.evaluate(s.score) }))
      .sort((a, b) => b.evaluation.weightedScore - a.evaluation.weightedScore);
  }

  private validate(score: VFMScore): void {
    for (const k of ['value', 'feasibility', 'match'] as const) {
      const v = score[k];
      if (typeof v !== 'number' || v < 0 || v > 10) {
        throw new Error(`VFM ${k} 必须在 0-10 范围内，当前为 ${v}`);
      }
    }
  }
}
