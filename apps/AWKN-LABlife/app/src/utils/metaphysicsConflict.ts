/**
 * 命理副证冲突降级规则
 * 命理副证不能跟主状态硬冲。
 * 比如命理说"事业机会"，但状态图显示 capacity低 + entropy高，
 * 前台要自动降级表达。
 */

import type { PhasePoint } from '../types/lifekline';

export interface MetaphysicsHint {
  show: boolean;
  confidence: number;
  hintText: string;
  source?: string;
}

/**
 * 当主状态处于高风险相位时，自动降级命理副证的置信度和文案
 * @param hint      命理副证提示
 * @param phasePoint 当前相位点（来自状态空间）
 * @returns 降级后的提示（或直接返回原提示）
 */
export function downgradeMetaphysicsIfConflict(
  hint: MetaphysicsHint | undefined,
  phasePoint?: PhasePoint,
): MetaphysicsHint | undefined {
  if (!hint?.show || !phasePoint) return hint;

  const highRiskPhase = phasePoint.quadrant === 'recovery' || phasePoint.quadrant === 'risk';

  if (!highRiskPhase) return hint;

  return {
    ...hint,
    confidence: Math.min(hint.confidence, 60),
    hintText: `命理副线仅作观察提示。当前现实状态处于调整区，主建议以降负荷和修复底盘为先。`,
  };
}
