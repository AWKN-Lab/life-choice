import type { KlineAspect } from './types'

export interface ShiShenEffect {
  aspect: KlineAspect
  baseWeight: number
  direction: 'positive' | 'negative' | 'mixed'
}

const SHISHEN_MAP: Record<string, ShiShenEffect> = {
  '正官': { aspect: 'career', baseWeight: 8, direction: 'positive' },
  '七杀': { aspect: 'career', baseWeight: 12, direction: 'mixed' },
  '正财': { aspect: 'wealth', baseWeight: 10, direction: 'positive' },
  '偏财': { aspect: 'wealth', baseWeight: 12, direction: 'mixed' },
  '正印': { aspect: 'overall', baseWeight: 8, direction: 'positive' },
  '偏印': { aspect: 'overall', baseWeight: 6, direction: 'mixed' },
  '食神': { aspect: 'career', baseWeight: 8, direction: 'positive' },
  '伤官': { aspect: 'career', baseWeight: 10, direction: 'mixed' },
  '比肩': { aspect: 'overall', baseWeight: 5, direction: 'mixed' },
  '劫财': { aspect: 'wealth', baseWeight: 8, direction: 'negative' },
}

export function deriveShiShenMod(
  yearShishen: string,
  monthShishen: string,
  dayShishen: string,
  hourShishen: string,
  aspect: KlineAspect,
): number {
  let total = 0
  const shishens = [yearShishen, monthShishen, dayShishen, hourShishen]

  for (const shishen of shishens) {
    if (!shishen) continue
    const effect = SHISHEN_MAP[shishen]
    if (!effect) continue
    if (effect.aspect === aspect) {
      const modifier = effect.direction === 'mixed' ? 0.5 : 1.0
      total += effect.baseWeight * modifier
    }
  }

  return Math.min(total, 40)
}

export function deriveShiShenModAll(
  yearShishen: string,
  monthShishen: string,
  dayShishen: string,
  hourShishen: string,
): Record<KlineAspect, number> {
  return {
    overall: deriveShiShenMod(yearShishen, monthShishen, dayShishen, hourShishen, 'overall'),
    career: deriveShiShenMod(yearShishen, monthShishen, dayShishen, hourShishen, 'career'),
    wealth: deriveShiShenMod(yearShishen, monthShishen, dayShishen, hourShishen, 'wealth'),
    relationship: deriveShiShenMod(yearShishen, monthShishen, dayShishen, hourShishen, 'relationship'),
  }
}

export { SHISHEN_MAP }