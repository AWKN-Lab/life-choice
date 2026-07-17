import type { KlineAspect } from './types'
import type { CelebrityCase, CelebrityScores } from '../../types/lifekline'
import type { WuxingDistribution } from './wuxingUtils'
import { cosineWuxingSimilarity, estimateWuxingFromPillars } from './wuxingUtils'

export interface CelebrityReference {
  topMatches: {
    name: string
    nameCn: string
    wuxingSimilarity: number
    scores: CelebrityScores
    category: string
    tags: string[]
  }[]
  averageAspectScores: Record<KlineAspect, number>
}

const CELEBRITY_SCORE_ASPECT_MAP: Record<string, KlineAspect> = {
  overall: 'overall',
  career: 'career',
  wealth: 'wealth',
  marriage: 'relationship',
}

export function deriveCelebrityMod(
  celebrityCases: CelebrityCase[] | undefined | null,
  userWuxing: WuxingDistribution | null | undefined,
  aspect: KlineAspect,
): { modifier: number; reference: CelebrityReference | null } {
  if (!Array.isArray(celebrityCases) || celebrityCases.length === 0) {
    return { modifier: 0, reference: null }
  }
  if (!userWuxing) {
    return { modifier: 0, reference: null }
  }

  const similarities = celebrityCases
    .map((c) => {
      const celebWuxing = estimateWuxingFromPillars(
        c.year_pillar,
        c.month_pillar,
        c.day_pillar,
        c.hour_pillar,
      )
      const similarity = cosineWuxingSimilarity(userWuxing, celebWuxing)
      return { celebrity: c, similarity, celebWuxing }
    })
    .filter((s) => s.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)

  const top3 = similarities.slice(0, 3)

  let modifier = 0
  for (const { celebrity, similarity } of top3) {
    if (!celebrity.scores) continue

    const scoreKey = CELEBRITY_SCORE_ASPECT_MAP[aspect]
    const celebScore = (celebrity.scores as any)[scoreKey] as number | undefined
    if (typeof celebScore !== 'number') continue

    modifier += celebScore * similarity
  }

  if (top3.length > 0 && top3[0].similarity > 0.8) {
    modifier += 10
  }

  const topMatches = top3.map(({ celebrity, similarity }) => ({
    name: celebrity.name,
    nameCn: celebrity.name_cn,
    wuxingSimilarity: Math.round(similarity * 1000) / 1000,
    scores: celebrity.scores || { overall: 50, personality: 50, career: 50, wealth: 50, marriage: 50, health: 50 },
    category: celebrity.category_cn || celebrity.category,
    tags: celebrity.tags || [],
  }))

  const averageAspectScores: Record<KlineAspect, number> = {
    overall: 0,
    career: 0,
    wealth: 0,
    relationship: 0,
  }

  if (topMatches.length > 0) {
    for (const key of Object.keys(CELEBRITY_SCORE_ASPECT_MAP)) {
      const klineKey = CELEBRITY_SCORE_ASPECT_MAP[key]
      let sum = 0
      let count = 0
      for (const m of topMatches) {
        const score = (m.scores as any)[key] as number | undefined
        if (typeof score === 'number') {
          sum += score
          count++
        }
      }
      averageAspectScores[klineKey] = count > 0 ? Math.round(sum / count) : 0
    }
  }

  const scaledModifier = top3.length > 0
    ? Math.min(modifier / top3.length / 100 * 12, 15)
    : 0

  return {
    modifier: Math.round(scaledModifier * 10) / 10,
    reference: {
      topMatches,
      averageAspectScores,
    },
  }
}

export function deriveCelebrityModSimple(
  celebrityCases: CelebrityCase[] | undefined | null,
  userWuxing: WuxingDistribution | null | undefined,
  aspect: KlineAspect,
): number {
  return deriveCelebrityMod(celebrityCases, userWuxing, aspect).modifier
}

export function deriveCelebrityModAll(
  celebrityCases: CelebrityCase[] | undefined | null,
  userWuxing: WuxingDistribution | null | undefined,
): Record<KlineAspect, number> {
  return {
    overall: deriveCelebrityModSimple(celebrityCases, userWuxing, 'overall'),
    career: deriveCelebrityModSimple(celebrityCases, userWuxing, 'career'),
    wealth: deriveCelebrityModSimple(celebrityCases, userWuxing, 'wealth'),
    relationship: deriveCelebrityModSimple(celebrityCases, userWuxing, 'relationship'),
  }
}

export { CELEBRITY_SCORE_ASPECT_MAP }