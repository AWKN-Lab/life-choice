import type { KlineAspect } from './types'
import type { ShiShenEffect } from './shiShenModulator'
import { wuxingOfGanZhi } from './wuxingUtils'

const NAYIN_MAP: Record<string, { aspect: KlineAspect; weight: number }> = {
  '海中金': { aspect: 'wealth', weight: 4 },
  '剑锋金': { aspect: 'career', weight: 4 },
  '钗钏金': { aspect: 'career', weight: 3 },
  '沙中金': { aspect: 'wealth', weight: 3 },
  '白蜡金': { aspect: 'career', weight: 3 },
  '金箔金': { aspect: 'wealth', weight: 2 },
  '大林木': { aspect: 'overall', weight: 3 },
  '杨柳木': { aspect: 'overall', weight: 2 },
  '松柏木': { aspect: 'overall', weight: 4 },
  '平地木': { aspect: 'overall', weight: 2 },
  '桑柘木': { aspect: 'career', weight: 3 },
  '石榴木': { aspect: 'wealth', weight: 3 },
  '涧下水': { aspect: 'relationship', weight: 3 },
  '大溪水': { aspect: 'career', weight: 4 },
  '长流水': { aspect: 'overall', weight: 3 },
  '天河水': { aspect: 'overall', weight: 5 },
  '泉中水': { aspect: 'relationship', weight: 2 },
  '大海水': { aspect: 'career', weight: 5 },
  '炉中火': { aspect: 'career', weight: 4 },
  '山头火': { aspect: 'career', weight: 3 },
  '霹雳火': { aspect: 'career', weight: 5 },
  '覆灯火': { aspect: 'overall', weight: 3 },
  '天上火': { aspect: 'career', weight: 4 },
  '山下火': { aspect: 'wealth', weight: 3 },
  '路旁土': { aspect: 'overall', weight: 3 },
  '城头土': { aspect: 'wealth', weight: 4 },
  '屋上土': { aspect: 'wealth', weight: 4 },
  '壁上土': { aspect: 'overall', weight: 2 },
  '大驿土': { aspect: 'career', weight: 3 },
  '沙中土': { aspect: 'wealth', weight: 2 },
}

export interface NaYinData {
  year?: string
  month?: string
  day?: string
  hour?: string
}

export interface ZangganEntry {
  gan: string
  shishen: string
}

export interface ZangganShishenData {
  year?: ZangganEntry[]
  month?: ZangganEntry[]
  day?: ZangganEntry[]
  hour?: ZangganEntry[]
}

export function deriveNaYinMod(naYin: NaYinData | null | undefined, aspect: KlineAspect): number {
  if (!naYin) return 0

  const pillars = [naYin.year, naYin.month, naYin.day, naYin.hour]
  let score = 0

  for (const name of pillars) {
    if (!name) continue
    const mapping = NAYIN_MAP[name]
    if (mapping && mapping.aspect === aspect) {
      score += mapping.weight
    }
  }

  return Math.min(score, 20)
}

export function deriveNaYinModAll(naYin: NaYinData | null | undefined): Record<KlineAspect, number> {
  return {
    overall: deriveNaYinMod(naYin, 'overall'),
    career: deriveNaYinMod(naYin, 'career'),
    wealth: deriveNaYinMod(naYin, 'wealth'),
    relationship: deriveNaYinMod(naYin, 'relationship'),
  }
}

export function normalizeZangganEntries(entries: any[] | undefined): ZangganEntry[] {
  if (!Array.isArray(entries)) return []
  return entries.map((item: any) => {
    if (typeof item === 'string') {
      return { gan: item, shishen: '' }
    }
    return { gan: item.gan || '', shishen: item.shishen || '' }
  })
}

export function deriveZangganMod(
  zangganShishen: ZangganShishenData | null | undefined,
  shishenMap: Record<string, ShiShenEffect>,
  aspect: KlineAspect,
): number {
  if (!zangganShishen) return 0

  const pillars: (keyof ZangganShishenData)[] = ['year', 'month', 'day', 'hour']
  let score = 0

  for (const pillar of pillars) {
    const entries = normalizeZangganEntries(zangganShishen[pillar] as any[])
    for (const entry of entries) {
      if (!entry.shishen) continue
      const effect = shishenMap[entry.shishen]
      if (effect && effect.aspect === aspect) {
        const modifier = effect.direction === 'mixed' ? 0.3 : (effect.direction === 'negative' ? -0.4 : 0.6)
        score += effect.baseWeight * modifier
      }
    }

    if (pillar === 'day' && aspect === 'relationship') {
      const hasGuanKill = entries.some(e => e.shishen === '正官' || e.shishen === '七杀')
      if (hasGuanKill) score += 5
    }
  }

  return Math.min(Math.max(score, -10), 15)
}

export function deriveZangganModAll(
  zangganShishen: ZangganShishenData | null | undefined,
  shishenMap: Record<string, ShiShenEffect>,
): Record<KlineAspect, number> {
  return {
    overall: deriveZangganMod(zangganShishen, shishenMap, 'overall'),
    career: deriveZangganMod(zangganShishen, shishenMap, 'career'),
    wealth: deriveZangganMod(zangganShishen, shishenMap, 'wealth'),
    relationship: deriveZangganMod(zangganShishen, shishenMap, 'relationship'),
  }
}

export function deriveNaYinWuxingCategory(naYin: NaYinData | null | undefined): string {
  if (!naYin) return ''
  const name = naYin.day || naYin.year || naYin.month || naYin.hour || ''
  for (const char of ['金', '木', '水', '火', '土']) {
    if (name.includes(char)) return char
  }
  return ''
}

export { NAYIN_MAP }