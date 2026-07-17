import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  getPalaceByName,
  getPalaceByIndex,
  PALACE_NAMES,
  DIZHI,
} from './ziwei-types';

export interface FeigongInput {
  chart: ZiweiChartInput;
  sourcePalace: string;
}

export interface FeigongPath {
  huaType: string;
  fromStar: string;
  toPalace: string;
  toStar: string;
}

export interface FeigongOutput {
  sourcePalace: string;
  paths: FeigongPath[];
  summary: string;
}

const FEIGONG_SIHUA: Record<string, Array<{ star: string; hua: string }>> = {
  '甲': [{ star: '廉贞', hua: '化禄' }, { star: '破军', hua: '化权' }, { star: '武曲', hua: '化科' }, { star: '太阳', hua: '化忌' }],
  '乙': [{ star: '天机', hua: '化禄' }, { star: '天梁', hua: '化权' }, { star: '紫微', hua: '化科' }, { star: '太阴', hua: '化忌' }],
  '丙': [{ star: '天同', hua: '化禄' }, { star: '天机', hua: '化权' }, { star: '文昌', hua: '化科' }, { star: '廉贞', hua: '化忌' }],
  '丁': [{ star: '太阴', hua: '化禄' }, { star: '天同', hua: '化权' }, { star: '天机', hua: '化科' }, { star: '巨门', hua: '化忌' }],
  '戊': [{ star: '贪狼', hua: '化禄' }, { star: '太阴', hua: '化权' }, { star: '右弼', hua: '化科' }, { star: '天机', hua: '化忌' }],
  '己': [{ star: '武曲', hua: '化禄' }, { star: '贪狼', hua: '化权' }, { star: '天梁', hua: '化科' }, { star: '文曲', hua: '化忌' }],
  '庚': [{ star: '太阳', hua: '化禄' }, { star: '武曲', hua: '化权' }, { star: '太阴', hua: '化科' }, { star: '天同', hua: '化忌' }],
  '辛': [{ star: '巨门', hua: '化禄' }, { star: '太阳', hua: '化权' }, { star: '文曲', hua: '化科' }, { star: '文昌', hua: '化忌' }],
  '壬': [{ star: '天梁', hua: '化禄' }, { star: '紫微', hua: '化权' }, { star: '左辅', hua: '化科' }, { star: '武曲', hua: '化忌' }],
  '癸': [{ star: '破军', hua: '化禄' }, { star: '巨门', hua: '化权' }, { star: '太阴', hua: '化科' }, { star: '贪狼', hua: '化忌' }],
};

function findStarPalace(
  palaces: ZiweiPalaceData[],
  starName: string,
): { palace: ZiweiPalaceData; star: string } | null {
  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars];
    for (const star of allStars) {
      if (star.name === starName) {
        return { palace, star: starName };
      }
    }
  }
  return null;
}

function computeFeigong(
  sourcePalaceData: ZiweiPalaceData,
  palaces: ZiweiPalaceData[],
): FeigongPath[] {
  const tianGan = sourcePalaceData.heavenlyStem;
  const sihuaList = FEIGONG_SIHUA[tianGan];
  if (!sihuaList) return [];

  const paths: FeigongPath[] = [];

  for (const item of sihuaList) {
    const target = findStarPalace(palaces, item.star);
    if (target) {
      paths.push({
        huaType: item.hua,
        fromStar: item.star,
        toPalace: target.palace.name,
        toStar: item.star,
      });
    }
  }

  return paths;
}

export const feigongTool: AtomTool<FeigongInput, FeigongOutput> = {
  name: 'feigong-path',
  description: '飞宫路径推演：从起飞宫位按飞宫规则推演化禄/化权/化科/化忌的落宫路径',
  category: 'ziwei',

  async execute(input: FeigongInput): Promise<FeigongOutput> {
    const { chart } = input;
    const sourcePalace = getPalaceByName(chart.palaces, input.sourcePalace);

    if (!sourcePalace) {
      return {
        sourcePalace: input.sourcePalace,
        paths: [],
        summary: `未找到宫位"${input.sourcePalace}"`,
      };
    }

    const paths = computeFeigong(sourcePalace, chart.palaces);

    if (paths.length === 0) {
      return {
        sourcePalace: input.sourcePalace,
        paths: [],
        summary: `从${input.sourcePalace}起飞，天干${sourcePalace.heavenlyStem}无飞宫四化数据`,
      };
    }

    const pathDescs = paths.map(p => `${p.huaType}飞入${p.toPalace}（${p.fromStar}${p.huaType}）`);
    const luPath = paths.find(p => p.huaType === '化禄');
    const jiPath = paths.find(p => p.huaType === '化忌');

    const parts: string[] = [];
    parts.push(`从${input.sourcePalace}起飞（天干${sourcePalace.heavenlyStem}）`);
    parts.push(pathDescs.join('，'));

    if (luPath && jiPath) {
      const luPalace = luPath.toPalace;
      const jiPalace = jiPath.toPalace;
      if (luPalace === jiPalace) {
        parts.push('禄忌同宫，吉凶交织');
      } else {
        const luHint = getPalaceDomainHint(luPalace);
        const jiHint = getPalaceDomainHint(jiPalace);
        parts.push(`${luPalace}${luHint}有助力，${jiPalace}${jiHint}需注意`);
      }
    }

    const summary = parts.join('；');

    return {
      sourcePalace: input.sourcePalace,
      paths,
      summary,
    };
  },

  toPromptOutput(output: FeigongOutput): string {
    return output.summary;
  },
};

function getPalaceDomainHint(palaceName: string): string {
  const map: Record<string, string> = {
    '命宫': '自身', '兄弟宫': '手足', '夫妻宫': '感情', '子女宫': '子嗣',
    '财帛宫': '财运', '疾厄宫': '健康', '迁移宫': '外出', '仆役宫': '人际',
    '官禄宫': '事业', '田宅宫': '家宅', '福德宫': '精神', '父母宫': '长辈',
  };
  return map[palaceName] || '';
}
