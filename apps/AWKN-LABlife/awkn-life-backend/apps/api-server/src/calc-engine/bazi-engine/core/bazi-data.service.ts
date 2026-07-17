import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR_CANDIDATES = [
  join(__dirname, '..', '..', 'data'),
  join(process.cwd(), 'src', 'calc-engine', 'data'),
  join(process.cwd(), 'dist', 'calc-engine', 'data'),
];

let cache: Record<string, any> = {};
let resolvedDataDir: string | null = null;

function resolveDataDir(): string {
  if (resolvedDataDir) return resolvedDataDir;

  const found = DATA_DIR_CANDIDATES.find((dir) => existsSync(dir));
  if (!found) {
    throw new Error(`Bazi data directory not found. Tried: ${DATA_DIR_CANDIDATES.join(' | ')}`);
  }

  resolvedDataDir = found;
  return found;
}

function loadData(filename: string): any {
  if (cache[filename]) return cache[filename];
  const dataPath = join(resolveDataDir(), filename);
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  cache[filename] = data;
  return data;
}

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const WUXING = ['木', '火', '土', '金', '水'];

export const WUXING_TIANGAN: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

export const WUXING_DIZHI: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
  '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

export const WUXING_TO_EN: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
};

// P0-4 修复: 五行基础分统一源（原 kline.generator.ts 和 wuxing.generator.ts 各自硬编码且不一致）
export const WUXING_BASE_SCORE: Record<string, number> = {
  '木': 82, '火': 88, '土': 75, '金': 72, '水': 85,
};

export function getNayin(ganZhi: string): string {
  const data = loadData('nayin.json');
  const entry = data.nayin.find((item: any) => item.ganzhi === ganZhi);
  return entry?.nayin || '未知';
}

export function getNayinElement(ganZhi: string): string {
  const data = loadData('nayin.json');
  const entry = data.nayin.find((item: any) => item.ganzhi === ganZhi);
  return entry?.element || '未知';
}

export function getZanggan(zhi: string): { main: string; middle?: string; residual?: string } {
  const data = loadData('zanggan.json');
  const entry = data.zanggan.find((item: any) => item.di_zhi === zhi);
  if (!entry) return { main: '' };
  return {
    main: entry.main,
    middle: entry.middle || undefined,
    residual: entry.residual || undefined,
  };
}

export function getKongWang(dayGanZhi: string): string[] {
  const data = loadData('kongwang.json');
  const xun = data.kongwang.find((x: any) => x.range.includes(dayGanZhi));
  return xun?.kongwang || [];
}

export function getChangshengStage(gan: string, zhi: string): string {
  const data = loadData('changsheng.json');
  const stages = data.stages;
  const table = data.table[gan];
  if (!table) return '未知';
  for (const stage of stages) {
    if (table[stage] === zhi) return stage;
  }
  return '未知';
}

export function getChangshengZhi(gan: string, stage: string): string {
  const data = loadData('changsheng.json');
  return data.table[gan]?.[stage] || '';
}

export function getShishen(dayGan: string, targetGan: string): string {
  const data = loadData('shishen.json');
  const dayWuxing = WUXING_TIANGAN[dayGan];
  const targetWuxing = WUXING_TIANGAN[targetGan];
  if (!dayWuxing || !targetWuxing) return '未知';
  const dayYinYang = GAN.indexOf(dayGan) % 2 === 0 ? '阳' : '阴';
  const targetYinYang = GAN.indexOf(targetGan) % 2 === 0 ? '阳' : '阴';
  const sameYinYang = dayYinYang === targetYinYang;
  const mapping = data.lookup_table[dayGan];
  if (!mapping) return '未知';
  const pair = mapping[targetWuxing];
  if (!pair) return '未知';
  return sameYinYang ? pair[0] : pair[1];
}

export function getWuHuDunStartGan(yearGan: string): number {
  const data = loadData('wuhudun.json');
  const rule = data.rules.find((r: any) => r.year_gan === yearGan);
  return rule ? GAN.indexOf(rule.sequence[0]) : 0;
}

export function getMonthGan(yearGan: string, monthZhiIndex: number): string {
  const data = loadData('wuhudun.json');
  const rule = data.rules.find((r: any) => r.year_gan === yearGan);
  if (!rule) return GAN[0];
  return rule.sequence[monthZhiIndex];
}

export function getWuShuDunStartGan(dayGan: string): number {
  const data = loadData('wushudun.json');
  const rule = data.rules.find((r: any) => r.day_gan === dayGan);
  return rule ? GAN.indexOf(rule.sequence[0]) : 0;
}

export function getHourGan(dayGan: string, hourZhiIndex: number): string {
  const data = loadData('wushudun.json');
  const rule = data.rules.find((r: any) => r.day_gan === dayGan);
  if (!rule) return GAN[0];
  return rule.sequence[hourZhiIndex];
}

export function getShensha(name: string, lookupKey: string): string[] {
  const data = loadData('shensha.json');
  const shensha = data.shensha.find((s: any) => s.name === name);
  if (!shensha) return [];
  return shensha.detail[lookupKey] || [];
}

export function getDiHeRelations(): any {
  const data = loadData('dihe_relation.json');
  return data;
}

export function getDaYunRules(): any {
  const data = loadData('dayun.json');
  return data;
}

export function clearCache(): void {
  cache = {};
}

export function getAllShenshaDefs(): any[] {
  const data = loadData('shensha.json');
  return data.shensha || [];
}

export function computeBaziShensha(
  yearGan: string, yearZhi: string,
  monthGan: string, monthZhi: string,
  dayGan: string, dayZhi: string,
  hourGan: string, hourZhi: string,
): Record<string, Array<{ name: string; type: string; pillar: string }>> {
  const allDefs = getAllShenshaDefs();
  const yearPillar = yearGan + yearZhi;
  const monthPillar = monthGan + monthZhi;
  const dayPillar = dayGan + dayZhi;
  const hourPillar = hourGan + hourZhi;
  const monthZhiLabel = ZHI.indexOf(monthZhi);

  const result: Record<string, Array<{ name: string; type: string; pillar: string }>> = {
    year: [], month: [], day: [], hour: [],
  };

  const monthNameByZhi = ['子月', '丑月', '寅月', '卯月', '辰月', '巳月', '午月', '未月', '申月', '酉月', '戌月', '亥月'];

  for (const def of allDefs) {
    const lookup = def.lookup_by;
    const detail = def.detail;

    if (lookup === '日干查四柱地支') {
      const targets = detail[dayGan];
      if (!targets) continue;
      const zhiList = Array.isArray(targets) ? targets : [targets];
      if (zhiList.includes(yearZhi)) result.year.push({ name: def.name, type: def.type, pillar: 'year' });
      if (zhiList.includes(monthZhi)) result.month.push({ name: def.name, type: def.type, pillar: 'month' });
      if (zhiList.includes(dayZhi)) result.day.push({ name: def.name, type: def.type, pillar: 'day' });
      if (zhiList.includes(hourZhi)) result.hour.push({ name: def.name, type: def.type, pillar: 'hour' });
    } else if (lookup === '年支或日支查') {
      const yearTarget = detail[yearZhi];
      const dayTarget = detail[dayZhi];
      const yearZhiList = yearTarget ? (Array.isArray(yearTarget) ? yearTarget : [yearTarget]) : [];
      const dayZhiList = dayTarget ? (Array.isArray(dayTarget) ? dayTarget : [dayTarget]) : [];
      const allTargets = [...new Set([...yearZhiList, ...dayZhiList])];
      if (allTargets.includes(yearZhi)) result.year.push({ name: def.name, type: def.type, pillar: 'year' });
      if (allTargets.includes(monthZhi)) result.month.push({ name: def.name, type: def.type, pillar: 'month' });
      if (allTargets.includes(dayZhi)) result.day.push({ name: def.name, type: def.type, pillar: 'day' });
      if (allTargets.includes(hourZhi)) result.hour.push({ name: def.name, type: def.type, pillar: 'hour' });
    } else if (lookup === '年支查') {
      const entry = detail[yearZhi];
      if (!entry) continue;
      if (typeof entry === 'object' && 'gu' in entry) {
        const { gu, gua } = entry as any;
        ([['year', yearZhi], ['month', monthZhi], ['day', dayZhi], ['hour', hourZhi]] as const).forEach(([p, z]) => {
          if (z === gu) result[p].push({ name: '孤辰', type: def.type, pillar: p });
          if (z === gua) result[p].push({ name: '寡宿', type: def.type, pillar: p });
        });
      } else {
        const target = typeof entry === 'string' ? entry : '';
        if (target === yearZhi) result.year.push({ name: def.name, type: def.type, pillar: 'year' });
        if (target === monthZhi) result.month.push({ name: def.name, type: def.type, pillar: 'month' });
        if (target === dayZhi) result.day.push({ name: def.name, type: def.type, pillar: 'day' });
        if (target === hourZhi) result.hour.push({ name: def.name, type: def.type, pillar: 'hour' });
      }
    } else if (lookup === '月令查') {
      const monthKey = monthNameByZhi[monthZhiLabel];
      const targetGan = detail[monthKey];
      if (!targetGan) continue;
      const ganMap: Record<string, string> = { '坤(申)': '申', '乾(亥)': '亥', '巽(巳)': '巳' };
      const resolved = ganMap[targetGan] || targetGan;
      if (resolved === yearGan) result.year.push({ name: def.name, type: def.type, pillar: 'year' });
      if (resolved === monthGan) result.month.push({ name: def.name, type: def.type, pillar: 'month' });
      if (resolved === dayGan) result.day.push({ name: def.name, type: def.type, pillar: 'day' });
      if (resolved === hourGan) result.hour.push({ name: def.name, type: def.type, pillar: 'hour' });
    } else if (lookup === '月支查天干') {
      const targetGan = detail[monthZhi];
      if (!targetGan) continue;
      ([['year', yearGan], ['month', monthGan], ['day', dayGan], ['hour', hourGan]] as const).forEach(([p, g]) => {
        if (g === targetGan) result[p].push({ name: def.name, type: def.type, pillar: p });
      });
    } else if (lookup === '日柱查') {
      if (Array.isArray(detail) && detail.includes(dayPillar)) {
        result.day.push({ name: def.name, type: def.type, pillar: 'day' });
      }
    }
  }

  return result;
}
