import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  getPalaceByName,
  describeMiaowang,
  findCombination,
  DIZHI,
} from './ziwei-types';

export interface MinggongMasterInput {
  chart: ZiweiChartInput;
}

export interface MinggongMasterOutput {
  mainStars: string[];
  palacePosition: number;
  earthlyBranch: string;
  miaowang: Record<string, string>;
  combinationFeature: string;
  summary: string;
}

export const minggongMaster: AtomTool<MinggongMasterInput, MinggongMasterOutput> = {
  name: 'minggong-master',
  description: '命宫主星+庙旺分析：提取命宫主星、庙旺利陷状态、主星组合特征',
  category: 'ziwei',

  async execute(input: MinggongMasterInput): Promise<MinggongMasterOutput> {
    const { chart } = input;
    const mingGong = getPalaceByName(chart.palaces, '命宫');

    if (!mingGong) {
      return {
        mainStars: [],
        palacePosition: -1,
        earthlyBranch: '',
        miaowang: {},
        combinationFeature: '命宫数据缺失',
        summary: '命宫数据缺失，无法分析',
      };
    }

    const mainStars = mingGong.majorStars.map((s) => s.name);
    const palacePosition = mingGong.index;
    const earthlyBranch = mingGong.earthlyBranch;

    const miaowang: Record<string, string> = {};
    for (const star of mingGong.majorStars) {
      miaowang[star.name] = star.brightness || '未知';
    }
    for (const star of mingGong.minorStars) {
      if (star.brightness) {
        miaowang[star.name] = star.brightness;
      }
    }

    const combination = findCombination(mainStars);
    const combinationFeature = combination
      ? `${combination.name}，${combination.trait}`
      : mainStars.length === 0
        ? '空宫，需借对宫星曜'
        : mainStars.length === 1
          ? `${mainStars[0]}独坐，性格鲜明`
          : `${mainStars.join('+')}同宫`;

    const starDescs = mingGong.majorStars.map((s) => {
      const mw = s.brightness ? describeMiaowang(s.brightness) : '未知';
      return `${s.name}${mw}`;
    });

    const summaryParts: string[] = [];
    summaryParts.push(`命宫在${earthlyBranch}位`);
    if (starDescs.length > 0) {
      summaryParts.push(`主星${starDescs.join('、')}`);
    } else {
      summaryParts.push('空宫');
    }
    if (combination) {
      summaryParts.push(`格局为${combination.name}，${combination.trait}`);
    }
    if (mingGong.isBodyPalace) {
      summaryParts.push('命身同宫');
    }

    const summary = summaryParts.join('，');

    return {
      mainStars,
      palacePosition,
      earthlyBranch,
      miaowang,
      combinationFeature,
      summary,
    };
  },

  toPromptOutput(output: MinggongMasterOutput): string {
    if (output.palacePosition < 0) {
      return '命宫数据缺失，无法分析';
    }

    const mwDescs = Object.entries(output.miaowang).map(
      ([star, brightness]) => `${star}${describeMiaowang(brightness)}`,
    );
    const mwText = mwDescs.length > 0 ? mwDescs.join('、') : '无主星';

    return `命宫在${output.earthlyBranch}，主星${mwText}，${output.combinationFeature}`;
  },
};
