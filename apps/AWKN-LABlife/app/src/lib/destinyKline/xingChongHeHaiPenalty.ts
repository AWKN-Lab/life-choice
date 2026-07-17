import type { KlineAspect } from './types'

export interface XCHHEntry {
  pillars: string[]
  relation: string
}

export interface XCHHData {
  he?: XCHHEntry[]
  chong?: XCHHEntry[]
  hai?: XCHHEntry[]
  xing?: XCHHEntry[]
}

export interface XCHHRiskBundle {
  riskPenalty: number
  opportunityBonus: number
  volumeBoost: number
}

const RELATION_RULES: Record<string, { risk: number; opp: number; vol: number }> = {
  he:    { risk: 0,  opp: 5, vol: 3 },
  chong: { risk: 8,  opp: 0, vol: 5 },
  hai:   { risk: 4,  opp: 0, vol: 0 },
  xing:  { risk: 6,  opp: 0, vol: 0 },
}

const LIUNIAN_OVERLAP_BONUS: Record<string, { risk: number; opp: number; vol: number }> = {
  he:    { risk: 0,  opp: 5, vol: 0 },
  chong: { risk: 10, opp: 0, vol: 0 },
  hai:   { risk: 0,  opp: 0, vol: 0 },
  xing:  { risk: 0,  opp: 0, vol: 0 },
}

function countEntries(entries: XCHHEntry[] | undefined): number {
  return Array.isArray(entries) ? entries.length : 0
}

export function deriveXCHHRisk(
  xchh: XCHHData | null | undefined,
  liuNianGanZhi?: string,
): XCHHRiskBundle {
  if (!xchh) return { riskPenalty: 0, opportunityBonus: 0, volumeBoost: 0 }

  let riskPenalty = 0
  let opportunityBonus = 0
  let volumeBoost = 0

  for (const [relationType, rule] of Object.entries(RELATION_RULES)) {
    const entries = (xchh as Record<string, XCHHEntry[]>)[relationType]
    const count = countEntries(entries)

    riskPenalty += rule.risk * count
    opportunityBonus += rule.opp * count
    volumeBoost += rule.vol * count
  }

  if (liuNianGanZhi) {
    for (const [relationType, rule] of Object.entries(LIUNIAN_OVERLAP_BONUS)) {
      const entries = (xchh as Record<string, XCHHEntry[]>)[relationType]
      if (!Array.isArray(entries)) continue

      for (const entry of entries) {
        if (entry.pillars && entry.pillars.includes(liuNianGanZhi)) {
          riskPenalty += rule.risk
          opportunityBonus += rule.opp
          volumeBoost += rule.vol
        }
      }
    }
  }

  return {
    riskPenalty: Math.min(riskPenalty, 30),
    opportunityBonus: Math.min(opportunityBonus, 20),
    volumeBoost: Math.min(volumeBoost, 15),
  }
}

export function deriveXCHHRiskForAspect(
  xchh: XCHHData | null | undefined,
  liuNianGanZhi: string | undefined,
  aspect: KlineAspect,
): number {
  const { riskPenalty } = deriveXCHHRisk(xchh, liuNianGanZhi)
  const aspectModifier: Record<KlineAspect, number> = {
    relationship: 1.2,
    career: 1.0,
    wealth: 0.8,
    overall: 0.9,
  }
  return Math.round(riskPenalty * (aspectModifier[aspect] || 1.0) * 10) / 10
}