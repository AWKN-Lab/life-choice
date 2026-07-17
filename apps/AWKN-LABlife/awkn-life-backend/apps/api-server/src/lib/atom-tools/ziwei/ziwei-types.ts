import { AtomTool } from '../types';

export interface ZiweiPalaceData {
  index: number;
  name: string;
  isBodyPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{ name: string; type: string; brightness?: string; mutagen?: string }>;
  minorStars: Array<{ name: string; type: string; brightness?: string; mutagen?: string }>;
  adjectiveStars: Array<{ name: string; type: string }>;
  decadal?: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  ages?: number[];
}

export interface ZiweiChartInput {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  gender: string;
  time: string;
  timeRange: string;
  sign: string;
  zodiac: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  palaces: ZiweiPalaceData[];
}

export const PALACE_NAMES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '仆役宫', '官禄宫', '田宅宫', '福德宫', '父母宫',
] as const;

export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const STAR_WUXING: Record<string, string> = {
  '紫微': '土', '天机': '木', '太阳': '火', '武曲': '金', '天同': '水',
  '廉贞': '火', '天府': '土', '太阴': '水', '贪狼': '木', '巨门': '土',
  '天相': '水', '天梁': '土', '七杀': '金', '破军': '水',
  '文昌': '金', '文曲': '水', '左辅': '土', '右弼': '水',
  '天魁': '火', '天钺': '火', '禄存': '土', '天马': '火',
  '擎羊': '金', '陀罗': '金', '火星': '火', '铃星': '火',
  '地空': '火', '地劫': '火',
};

export const MIAOWANG_ORDER = ['庙', '旺', '得', '利', '平', '不', '陷'] as const;

export const COMBINATION_PATTERNS: Array<{ stars: string[]; name: string; trait: string }> = [
  { stars: ['紫微', '天府'], name: '紫府同宫', trait: '主贵气，格局宏大，领导力强' },
  { stars: ['紫微', '贪狼'], name: '紫贪同宫', trait: '欲望与权力并存，桃花带贵' },
  { stars: ['紫微', '天相'], name: '紫相同宫', trait: '辅佐之才，衣食丰足' },
  { stars: ['紫微', '七杀'], name: '紫杀同宫', trait: '权威独断，开创力强' },
  { stars: ['紫微', '破军'], name: '紫破同宫', trait: '变动中求发展，破旧立新' },
  { stars: ['太阳', '太阴'], name: '日月同宫', trait: '阴阳调和，文武兼备' },
  { stars: ['武曲', '贪狼'], name: '武贪同宫', trait: '晚发格局，先苦后甜' },
  { stars: ['天机', '太阴'], name: '机阴同宫', trait: '聪慧内敛，善于谋略' },
  { stars: ['天同', '巨门'], name: '同巨同宫', trait: '口福与口舌并存，需防是非' },
  { stars: ['廉贞', '天府'], name: '廉府同宫', trait: '刚柔并济，适合公职' },
  { stars: ['廉贞', '贪狼'], name: '廉贪同宫', trait: '桃花重，多欲多求' },
  { stars: ['廉贞', '七杀'], name: '廉杀同宫', trait: '刚烈果断，适合武职' },
  { stars: ['廉贞', '破军'], name: '廉破同宫', trait: '波折中成长，不安于现状' },
  { stars: ['武曲', '天府'], name: '武府同宫', trait: '理财高手，财星得力' },
  { stars: ['武曲', '天相'], name: '武相同宫', trait: '财印相辅，适合金融' },
  { stars: ['武曲', '七杀'], name: '武杀同宫', trait: '果断刚毅，适合创业' },
  { stars: ['武曲', '破军'], name: '武破同宫', trait: '财路多变，大起大落' },
  { stars: ['太阳', '天梁'], name: '阳梁同宫', trait: '光明磊落，适合教育' },
  { stars: ['天同', '天梁'], name: '同梁同宫', trait: '温和稳健，适合服务' },
  { stars: ['天机', '巨门'], name: '机巨同宫', trait: '口才与智慧并重，宜传播' },
];

export function getSanfangPalaceIndices(palaceIndex: number): number[] {
  return [
    palaceIndex,
    (palaceIndex + 4) % 12,
    (palaceIndex + 8) % 12,
    (palaceIndex + 6) % 12,
  ];
}

export function getMiaowangLevel(brightness: string): number {
  const idx = MIAOWANG_ORDER.indexOf(brightness as any);
  return idx >= 0 ? idx : 5;
}

export function describeMiaowang(brightness: string): string {
  if (!brightness) return '未知';
  const level = getMiaowangLevel(brightness);
  if (level <= 1) return '庙旺';
  if (level <= 3) return '平利';
  if (level <= 5) return '平平';
  return '落陷';
}

export function findCombination(starNames: string[]): { name: string; trait: string } | null {
  for (const pattern of COMBINATION_PATTERNS) {
    if (pattern.stars.every((s) => starNames.includes(s))) {
      return { name: pattern.name, trait: pattern.trait };
    }
  }
  return null;
}

export function getPalaceByIndex(palaces: ZiweiPalaceData[], index: number): ZiweiPalaceData | undefined {
  return palaces.find((p) => p.index === index);
}

export function getPalaceByName(palaces: ZiweiPalaceData[], name: string): ZiweiPalaceData | undefined {
  return palaces.find((p) => p.name === name);
}

export { AtomTool };
