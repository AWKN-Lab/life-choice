import type { KlineAspect } from './types'

export interface StarPalace {
  star: string
  palace: string
}

export interface ZiweiSihua {
  lu?: StarPalace[]
  quan?: StarPalace[]
  ke?: StarPalace[]
  ji?: StarPalace[]
}

export interface ZiweiPalaceEntry {
  name: string
  majorStars: string[]
  minorStars?: string[]
}

export interface ZiweiSummary {
  mingGong?: { ganZhi?: string; majorStars?: string[] }
  shenGongName?: string
  sihua?: ZiweiSihua
  palaces?: ZiweiPalaceEntry[]
}

const PALACE_ASPECT_MAP: Record<string, KlineAspect> = {
  '命宫': 'overall',
  '官禄': 'career',
  '财帛': 'wealth',
  '夫妻': 'relationship',
  '迁移': 'career',
  '福德': 'overall',
  '田宅': 'wealth',
  '父母': 'overall',
  '兄弟': 'relationship',
  '子女': 'relationship',
  '交友': 'relationship',
  '疾厄': 'overall',
}

const MAJOR_STAR_WEIGHT: Record<string, number> = {
  '紫微': 12,
  '天府': 12,
  '七杀': 10,
  '破军': 10,
  '贪狼': 10,
  '天机': 6,
  '太阴': 6,
  '天同': 6,
  '天梁': 6,
  '太阳': 5,
  '武曲': 8,
  '天相': 6,
  '巨门': 4,
  '廉贞': 5,
}

const SHENGONG_WEIGHT = 8
const GENERAL_PALACE_STAR_WEIGHT = 3

function deriveMingGongScore(ziwei: ZiweiSummary, aspect: KlineAspect): number {
  const mingStars = ziwei.mingGong?.majorStars
  if (!Array.isArray(mingStars) || mingStars.length === 0) return 0

  if (PALACE_ASPECT_MAP['命宫'] !== aspect) return 0

  let score = 0
  for (const star of mingStars) {
    score += MAJOR_STAR_WEIGHT[star] || 2
  }
  return score
}

function deriveSihuaScore(sihua: ZiweiSihua | undefined, aspect: KlineAspect): number {
  if (!sihua) return 0

  const huaTypes: { key: keyof ZiweiSihua; weight: number }[] = [
    { key: 'lu', weight: 12 },
    { key: 'ji', weight: -8 },
    { key: 'quan', weight: 6 },
    { key: 'ke', weight: 4 },
  ]

  let score = 0
  for (const { key, weight } of huaTypes) {
    const huaList = sihua[key]
    if (!Array.isArray(huaList)) continue

    for (const item of huaList) {
      const palaceAspect = PALACE_ASPECT_MAP[item.palace]
      if (palaceAspect === aspect) {
        score += weight
      }
    }
  }

  return score
}

function deriveShenGongScore(ziwei: ZiweiSummary, aspect: KlineAspect): number {
  const shenGongName = ziwei.shenGongName
  if (!shenGongName) return 0

  if (PALACE_ASPECT_MAP[shenGongName] === aspect) {
    return SHENGONG_WEIGHT
  }
  return 0
}

function derivePalacesScore(palaces: ZiweiPalaceEntry[] | undefined, aspect: KlineAspect): number {
  if (!Array.isArray(palaces)) return 0

  let score = 0
  for (const palace of palaces) {
    const palaceAspect = PALACE_ASPECT_MAP[palace.name]
    if (palaceAspect === aspect && Array.isArray(palace.majorStars)) {
      score += palace.majorStars.length * GENERAL_PALACE_STAR_WEIGHT
    }
  }
  return score
}

export function deriveZiweiMod(ziwei: ZiweiSummary | null | undefined, aspect: KlineAspect): number {
  if (!ziwei) return 0

  const mingGongScore = deriveMingGongScore(ziwei, aspect)
  const sihuaScore = deriveSihuaScore(ziwei.sihua, aspect)
  const shenGongScore = deriveShenGongScore(ziwei, aspect)
  const palacesScore = derivePalacesScore(ziwei.palaces, aspect)

  const total = mingGongScore + sihuaScore + shenGongScore + palacesScore
  return Math.min(Math.max(total, -20), 40)
}

export function deriveZiweiModAll(ziwei: ZiweiSummary | null | undefined): Record<KlineAspect, number> {
  return {
    overall: deriveZiweiMod(ziwei, 'overall'),
    career: deriveZiweiMod(ziwei, 'career'),
    wealth: deriveZiweiMod(ziwei, 'wealth'),
    relationship: deriveZiweiMod(ziwei, 'relationship'),
  }
}

export function hasZiweiData(ziwei: ZiweiSummary | null | undefined): boolean {
  if (!ziwei) return false
  return !!(ziwei.mingGong?.majorStars?.length || ziwei.sihua || ziwei.palaces?.length)
}

export { PALACE_ASPECT_MAP, MAJOR_STAR_WEIGHT }