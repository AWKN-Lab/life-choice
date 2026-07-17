const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
}

const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
}

export type WuxingElement = '木' | '火' | '土' | '金' | '水'

export function wuxingOfGan(gan: string): string {
  return GAN_WUXING[gan] || ''
}

export function wuxingOfZhi(zhi: string): string {
  return ZHI_WUXING[zhi] || ''
}

export function wuxingOfGanZhi(ganZhi: string): { gan: string; zhi: string; ganWuxing: string; zhiWuxing: string } {
  const gan = ganZhi[0]
  const zhi = ganZhi[1]
  return { gan, zhi, ganWuxing: wuxingOfGan(gan), zhiWuxing: wuxingOfZhi(zhi) }
}

export function wuxingMatch(ganZhiWuxing: string, targetWuxingList: string[]): boolean {
  if (!ganZhiWuxing) return false
  return targetWuxingList.includes(ganZhiWuxing)
}

export interface WuxingDistribution {
  wood: number
  fire: number
  earth: number
  metal: number
  water: number
}

export function cosineWuxingSimilarity(a: WuxingDistribution, b: WuxingDistribution): number {
  const keys: (keyof WuxingDistribution)[] = ['wood', 'fire', 'earth', 'metal', 'water']
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (const k of keys) {
    dotProduct += a[k] * b[k]
    normA += a[k] * a[k]
    normB += b[k] * b[k]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function estimateWuxingFromPillars(
  yearGanZhi: string,
  monthGanZhi: string,
  dayGanZhi: string,
  hourGanZhi: string,
): WuxingDistribution {
  const counter: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  for (const gz of [yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi]) {
    if (!gz || gz.length < 2) continue
    counter[wuxingOfGan(gz[0])] = (counter[wuxingOfGan(gz[0])] || 0) + 1
    counter[wuxingOfZhi(gz[1])] = (counter[wuxingOfZhi(gz[1])] || 0) + 1
  }
  const total = Object.values(counter).reduce((a, b) => a + b, 0) || 1
  return {
    wood: counter['木'] / total,
    fire: counter['火'] / total,
    earth: counter['土'] / total,
    metal: counter['金'] / total,
    water: counter['水'] / total,
  }
}

export function determineQiyunStartEnd(
  qiYunAge: number,
  daYunList: { startAge: number; endAge: number }[],
): { startAge: number; endAge: number } {
  if (daYunList.length === 0) return { startAge: qiYunAge, endAge: qiYunAge + 120 }
  return {
    startAge: daYunList[0].startAge,
    endAge: daYunList[daYunList.length - 1].endAge,
  }
}