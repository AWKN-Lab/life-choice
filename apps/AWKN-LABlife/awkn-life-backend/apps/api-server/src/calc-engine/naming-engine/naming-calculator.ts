import { Injectable } from '@nestjs/common';
import { getKangxiStroke } from './kangxi-strokes';

const SANCAI_WUXING: Record<string, Record<string, Record<string, { ji: boolean; desc: string }>>> = {
  '金': {
    '金': {
      '金': { ji: true, desc: '三才配置大吉，成功运佳，基础稳固，可获得意外成功发展' },
      '木': { ji: false, desc: '三才配置凶，成功运被压抑，易生神经衰弱等疾病' },
      '水': { ji: true, desc: '三才配置吉，祖上或上级提拔而成功发展，基础稳固' },
      '火': { ji: false, desc: '三才配置凶，基础不稳，易生突发灾祸' },
      '土': { ji: true, desc: '三才配置吉，可获得意外成功发展，但需注意健康' },
    },
    '木': {
      '金': { ji: false, desc: '三才配置凶，成功运被压抑，易生不满' },
      '木': { ji: false, desc: '三才配置凶，易生不和与不满' },
      '水': { ji: false, desc: '三才配置凶，困难重重' },
      '火': { ji: false, desc: '三才配置凶，基础不稳' },
      '土': { ji: false, desc: '三才配置凶，危机四伏' },
    },
    '水': {
      '金': { ji: true, desc: '三才配置吉，祖上提拔成功，基础稳固' },
      '木': { ji: false, desc: '三才配置凶，发展受挫' },
      '水': { ji: true, desc: '三才配置吉，一帆风顺成功发展' },
      '火': { ji: false, desc: '三才配置凶，易陷入困难' },
      '土': { ji: false, desc: '三才配置凶，易招致失败' },
    },
    '火': {
      '金': { ji: false, desc: '三才配置凶，易陷孤独' },
      '木': { ji: true, desc: '三才配置吉，能实现希望，功成名就' },
      '水': { ji: false, desc: '三才配置凶，基础不稳' },
      '火': { ji: true, desc: '三才配置吉，一帆风顺' },
      '土': { ji: true, desc: '三才配置吉，可顺利成功发展' },
    },
    '土': {
      '金': { ji: false, desc: '三才配置凶，易与人不和' },
      '木': { ji: false, desc: '三才配置凶，易被压迫' },
      '水': { ji: false, desc: '三才配置凶，困难不断' },
      '火': { ji: true, desc: '三才配置吉，可平安顺利' },
      '土': { ji: true, desc: '三才配置吉，可顺利发展' },
    },
  },
  '木': {
    '金': {
      '金': { ji: false, desc: '三才配置凶，成功运被压抑，易生精神痛苦' },
      '木': { ji: false, desc: '三才配置凶，困难多，进展慢' },
      '水': { ji: false, desc: '三才配置凶，成功运被压抑' },
      '火': { ji: true, desc: '三才配置吉，虽被压抑但终可成功' },
      '土': { ji: true, desc: '三才配置吉，需努力方可成功' },
    },
    '木': {
      '金': { ji: false, desc: '三才配置凶，易生神经衰弱' },
      '木': { ji: true, desc: '三才配置吉，基础稳固，安然自在' },
      '水': { ji: true, desc: '三才配置吉，安然顺利' },
      '火': { ji: true, desc: '三才配置吉，名利双收' },
      '土': { ji: true, desc: '三才配置吉，顺利成功' },
    },
    '水': {
      '金': { ji: false, desc: '三才配置凶，易陷孤独' },
      '木': { ji: true, desc: '三才配置吉，欣庆成功' },
      '水': { ji: true, desc: '三才配置吉，一帆风顺发展' },
      '火': { ji: true, desc: '三才配置吉，繁荣昌隆' },
      '土': { ji: true, desc: '三才配置吉，一帆风顺' },
    },
    '火': {
      '金': { ji: false, desc: '三才配置凶，易招致伤害' },
      '木': { ji: true, desc: '三才配置吉，顺利发展' },
      '水': { ji: true, desc: '三才配置吉，一帆风顺，成功发展' },
      '火': { ji: true, desc: '三才配置吉，顺调成功' },
      '土': { ji: true, desc: '三才配置吉，顺利成功发展' },
    },
    '土': {
      '金': { ji: false, desc: '三才配置凶，易陷入不安' },
      '木': { ji: true, desc: '三才配置吉，幸福顺利' },
      '水': { ji: true, desc: '三才配置吉，一帆风顺' },
      '火': { ji: true, desc: '三才配置吉，可顺利发展' },
      '土': { ji: true, desc: '三才配置吉，安稳自在' },
    },
  },
  '水': {
    '金': {
      '金': { ji: true, desc: '三才配置吉，得长辈提拔，成功发展' },
      '木': { ji: false, desc: '三才配置凶，成功运被压抑' },
      '水': { ji: true, desc: '三才配置吉，顺风满帆' },
      '火': { ji: false, desc: '三才配置凶，基础不稳' },
      '土': { ji: false, desc: '三才配置凶，易遭失败' },
    },
    '木': {
      '金': { ji: false, desc: '三才配置凶，容易被人陷害' },
      '木': { ji: false, desc: '三才配置凶，易生冲突' },
      '水': { ji: true, desc: '三才配置吉，成功顺利' },
      '火': { ji: false, desc: '三才配置凶，易生失望' },
      '土': { ji: false, desc: '三才配置凶，困难重重' },
    },
    '水': {
      '金': { ji: true, desc: '三才配置吉，平稳发展' },
      '木': { ji: true, desc: '三才配置吉，顺利成就' },
      '水': { ji: true, desc: '三才配置吉，成功发展' },
      '火': { ji: false, desc: '三才配置凶，易生不安' },
      '土': { ji: false, desc: '三才配置凶，易遭失败' },
    },
    '火': {
      '金': { ji: false, desc: '三才配置凶，易受挫折' },
      '木': { ji: true, desc: '三才配置吉，平安发展' },
      '水': { ji: false, desc: '三才配置凶，易受阻碍' },
      '火': { ji: false, desc: '三才配置凶，易生磨难' },
      '土': { ji: false, desc: '三才配置凶，易遭困难' },
    },
    '土': {
      '金': { ji: false, desc: '三才配置凶，易生阻碍' },
      '木': { ji: false, desc: '三才配置凶，困难重重' },
      '水': { ji: false, desc: '三才配置凶，易遭失败' },
      '火': { ji: false, desc: '三才配置凶，易生挫折' },
      '土': { ji: true, desc: '三才配置吉，顺调发展' },
    },
  },
  '火': {
    '金': {
      '金': { ji: false, desc: '三才配置凶，易生冲突伤害' },
      '木': { ji: false, desc: '三才配置凶，孤独无助' },
      '水': { ji: false, desc: '三才配置凶，成功运被压抑' },
      '火': { ji: false, desc: '三才配置凶，易生神经衰弱' },
      '土': { ji: false, desc: '三才配置凶，易陷困境' },
    },
    '木': {
      '金': { ji: false, desc: '三才配置凶，易生冲突' },
      '木': { ji: true, desc: '三才配置吉，静顺发展' },
      '水': { ji: true, desc: '三才配置吉，顺利发展' },
      '火': { ji: true, desc: '三才配置吉，圆满发展' },
      '土': { ji: true, desc: '三才配置吉，繁荣成功' },
    },
    '水': {
      '金': { ji: false, desc: '三才配置凶，易受伤害' },
      '木': { ji: true, desc: '三才配置吉，成功幸运' },
      '水': { ji: true, desc: '三才配置吉，顺风成功' },
      '火': { ji: true, desc: '三才配置吉，发展昌隆' },
      '土': { ji: true, desc: '三才配置吉，巩固发展' },
    },
    '火': {
      '金': { ji: false, desc: '三才配置凶，易生孤独' },
      '木': { ji: true, desc: '三才配置吉，家运隆昌' },
      '水': { ji: true, desc: '三才配置吉，巩固发展' },
      '火': { ji: true, desc: '三才配置吉，成功隆昌' },
      '土': { ji: true, desc: '三才配置吉，稳健成功' },
    },
    '土': {
      '金': { ji: false, desc: '三才配置凶，易招致灾难' },
      '木': { ji: true, desc: '三才配置吉，平安发展' },
      '水': { ji: true, desc: '三才配置吉，繁荣发展' },
      '火': { ji: true, desc: '三才配置吉，身份确立' },
      '土': { ji: true, desc: '三才配置吉，发展成功' },
    },
  },
  '土': {
    '金': {
      '金': { ji: false, desc: '三才配置凶，易生精神痛苦' },
      '木': { ji: false, desc: '三才配置凶，易被压迫' },
      '水': { ji: false, desc: '三才配置凶，易受压迫' },
      '火': { ji: false, desc: '三才配置凶，易遭受害' },
      '土': { ji: false, desc: '三才配置凶，易遭困难' },
    },
    '木': {
      '金': { ji: false, desc: '三才配置凶，易受他人压迫' },
      '木': { ji: true, desc: '三才配置吉，安然发展' },
      '水': { ji: true, desc: '三才配置吉，成功顺利' },
      '火': { ji: true, desc: '三才配置吉，健康成长' },
      '土': { ji: true, desc: '三才配置吉，平稳发展' },
    },
    '水': {
      '金': { ji: false, desc: '三才配置凶，易生不满' },
      '木': { ji: true, desc: '三才配置吉，成功发展' },
      '水': { ji: true, desc: '三才配置吉，发展顺利' },
      '火': { ji: false, desc: '三才配置凶，困难阻碍' },
      '土': { ji: false, desc: '三才配置凶，易陷破坏' },
    },
    '火': {
      '金': { ji: false, desc: '三才配置凶，容易被排斥' },
      '木': { ji: true, desc: '三才配置吉，安稳发展' },
      '水': { ji: false, desc: '三才配置凶，易生不和' },
      '火': { ji: true, desc: '三才配置吉，顺利发展' },
      '土': { ji: true, desc: '三才配置吉，固体发展' },
    },
    '土': {
      '金': { ji: false, desc: '三才配置凶，易受压抑' },
      '木': { ji: true, desc: '三才配置吉，安然自在' },
      '水': { ji: true, desc: '三才配置吉，顺利成功' },
      '火': { ji: true, desc: '三才配置吉，稳步发展' },
      '土': { ji: true, desc: '三才配置吉，基础稳固' },
    },
  },
};

const SHULI_JIXIONG: Record<number, { ji: boolean; desc: string }> = {
  1:  { ji: true,  desc: '太极之数，万物开泰，生发无穷，利禄亨通' },
  2:  { ji: false, desc: '两仪之数，混沌未开，进退保守，志望难达' },
  3:  { ji: true,  desc: '三才之数，天地人和，大事大业，繁荣昌隆' },
  4:  { ji: false, desc: '四象之数，待于生发，万事慎重，不具营谋' },
  5:  { ji: true,  desc: '五行之数，阴阳和合，兴家立业，名利双收' },
  6:  { ji: true,  desc: '六爻之数，发展变化，天赋美德，吉祥安泰' },
  7:  { ji: true,  desc: '七政之数，精悍严谨，天赋之力，进取必成' },
  8:  { ji: true,  desc: '八卦之数，铁镜重磨，志向坚定，勤修必成' },
  9:  { ji: false, desc: '大成之数，蕴凶暗含，有亏有成，需自把握' },
  10: { ji: false, desc: '终结之数，雪飘暗零，万事不如意，破家亡身' },
  11: { ji: true,  desc: '旱苗逢雨，万物更新，稳健着实，必有成功' },
  12: { ji: false, desc: '掘井无泉，无理伸张，脆弱孤独，易陷失败' },
  13: { ji: true,  desc: '春日牡丹，才艺多能，智谋奇略，奏功成就' },
  14: { ji: false, desc: '破兆之数，浮沉不安，骨肉分离，失意烦闷' },
  15: { ji: true,  desc: '福寿之数，温和平安，德望日隆，融洽安泰' },
  16: { ji: true,  desc: '厚重之数，德望双全，安荣上达，家门昌隆' },
  17: { ji: true,  desc: '刚健之数，权威刚强，突破万难，但有刚情之虑' },
  18: { ji: true,  desc: '铁镜重磨，有志竟成，博得名利，且养柔德' },
  19: { ji: false, desc: '多难之数，风云蔽日，辛苦重来，虽有智谋，万事挫折' },
  20: { ji: false, desc: '屋下藏金，非业破运，灾祸繁兴，一生不安' },
  21: { ji: true,  desc: '明月中天，成大事业，功名显达，首领之格' },
  22: { ji: false, desc: '秋草逢霜，怀才不遇，忧愁怨苦，事不如意' },
  23: { ji: true,  desc: '旭日东升，名显四方，渐次进展，终成大业' },
  24: { ji: true,  desc: '家门余庆，金钱丰盈，白手成家，财源广进' },
  25: { ji: true,  desc: '资性英敏，刚毅果断，聪慧绝伦，四方不忌' },
  26: { ji: false, desc: '变怪之数，英雄豪杰，波澜重叠，奏功万难' },
  27: { ji: false, desc: '增长之数，迎新去旧，中途挫折，过刚招厄' },
  28: { ji: false, desc: '阔水浮萍，遭难之数，一时豪杰，中道崩阻' },
  29: { ji: true,  desc: '智谋优秀，财力归集，名闻海内，成就大业' },
  30: { ji: false, desc: '非运之数，吉凶相伴，浮沉多难，绝不可用' },
  31: { ji: true,  desc: '春日花开，智勇得志，博得名利，统领众人' },
  32: { ji: true,  desc: '宝马金鞍，侥幸多望，贵人得助，财帛丰盈' },
  33: { ji: true,  desc: '旭日升天，鸾凤相会，名闻天下，隆昌至极' },
  34: { ji: false, desc: '破家之数，灾难不绝，难望成功，此数最凶' },
  35: { ji: true,  desc: '高楼望月，温和平安，智达通畅，文昌技艺' },
  36: { ji: false, desc: '波澜重叠，常陷穷苦，动不如静，有才无命' },
  37: { ji: true,  desc: '猛虎出林，权威显达，发展基业，但宜养雅量' },
  38: { ji: false, desc: '磨铁成针，意志薄弱，难酬志向，决难贯彻' },
  39: { ji: true,  desc: '富贵荣华，云间之月，德望隆昌，泽及远方' },
  40: { ji: false, desc: '退安之数，智谋胆力，一时侥幸，浮沉不安' },
  41: { ji: true,  desc: '德望高远，事事如意，才艺双全，富寿至极' },
};

function shuliScore(num: number): number {
  if (num <= 0) return 0;
  const normalized = num > 41 ? ((num - 41) % 10) + 41 : num;
  const info = SHULI_JIXIONG[normalized];
  if (!info) return 50;
  return info.ji ? 80 + ((normalized % 10) * 2) : 20 + ((normalized % 5) * 4);
}

function digitSum(num: number): number {
  while (num > 81) {
    num = Math.floor(num / 10) + (num % 10);
  }
  return num;
}

const TIANGAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

function strokeWuxing(stroke: number): string {
  const lastDigit = stroke % 10;
  if (lastDigit === 1 || lastDigit === 2) return '木';
  if (lastDigit === 3 || lastDigit === 4) return '火';
  if (lastDigit === 5 || lastDigit === 6) return '土';
  if (lastDigit === 7 || lastDigit === 8) return '金';
  return '水';
}

export interface WugeResult {
  tiange: number;
  renge: number;
  dige: number;
  waige: number;
  zongge: number;
  tiangeWuxing: string;
  rengeWuxing: string;
  digeWuxing: string;
  waigeWuxing: string;
  zonggeWuxing: string;
  sancai: { tian: string; ren: string; di: string };
  sancaiJi: boolean;
  sancaiDesc: string;
  scores: {
    tiange: number;
    renge: number;
    dige: number;
    waige: number;
    zongge: number;
    sancai: number;
    total: number;
  };
  details: {
    tiange: { num: number; wuxing: string; ji: boolean; desc: string };
    renge: { num: number; wuxing: string; ji: boolean; desc: string };
    dige: { num: number; wuxing: string; ji: boolean; desc: string };
    waige: { num: number; wuxing: string; ji: boolean; desc: string };
    zongge: { num: number; wuxing: string; ji: boolean; desc: string };
  };
}

export interface NamingInput {
  surname: string;
  givenName: string;
  isCompoundSurname?: boolean;
}

@Injectable()
export class NamingCalculator {
  computeWuge(input: NamingInput): WugeResult {
    const surnameChars = [...input.surname.trim()];
    const givenChars = [...input.givenName.trim()];

    const surnameNum = surnameChars.length === 2 && input.isCompoundSurname !== false
      ? 2
      : 1;

    const surnameStrokes = surnameChars.map((c) => getKangxiStroke(c));
    const givenStrokes = givenChars.map((c) => getKangxiStroke(c));

    const surnameTotal = surnameStrokes.reduce((a, b) => a + b, 0);
    const givenTotal = givenStrokes.reduce((a, b) => a + b, 0);

    let tiange: number;
    let renge: number;
    let dige: number;
    let waige: number;
    const zongge = surnameTotal + givenTotal;

    if (surnameNum === 1) {
      tiange = surnameStrokes[0] + 1;
      renge = surnameStrokes[0] + givenStrokes[0];
      if (givenChars.length === 1) {
        dige = givenStrokes[0] + 1;
        waige = 2;
      } else {
        dige = givenStrokes[0] + (givenStrokes[1] || 0);
        const tiangeDigit = digitSum(tiange);
        const digeDigit = digitSum(dige);
        waige = (tiangeDigit + digeDigit - renge + 1);
        if (waige <= 0) waige = 1;
      }
    } else {
      tiange = surnameStrokes[0] + (surnameStrokes[1] || 0);
      renge = (surnameStrokes[1] || 0) + givenStrokes[0];
      if (givenChars.length === 1) {
        dige = givenStrokes[0] + 1;
        waige = surnameStrokes[0] + 1;
      } else {
        dige = givenStrokes[0] + (givenStrokes[1] || 0);
        const tiangeDigit = digitSum(tiange);
        waige = tiangeDigit + givenStrokes[0] - renge + 1;
        if (waige <= 0) waige = 1;
      }
    }

    const tiangeWx = strokeWuxing(digitSum(tiange));
    const rengeWx = strokeWuxing(digitSum(renge));
    const digeWx = strokeWuxing(digitSum(dige));
    const waigeWx = strokeWuxing(digitSum(waige));
    const zonggeWx = strokeWuxing(digitSum(zongge));

    const tiangeJi = digitSum(tiange) <= 41
      ? (SHULI_JIXIONG[digitSum(tiange)]?.ji ?? false)
      : true;
    const rengeJi = digitSum(renge) <= 41
      ? (SHULI_JIXIONG[digitSum(renge)]?.ji ?? false)
      : true;
    const digeJi = digitSum(dige) <= 41
      ? (SHULI_JIXIONG[digitSum(dige)]?.ji ?? false)
      : true;
    const waigeJi = digitSum(waige) <= 41
      ? (SHULI_JIXIONG[digitSum(waige)]?.ji ?? false)
      : true;
    const zonggeJi = digitSum(zongge) <= 41
      ? (SHULI_JIXIONG[digitSum(zongge)]?.ji ?? false)
      : true;

    const sancaiTian = tiangeWx;
    const sancaiRen = rengeWx;
    const sancaiDi = digeWx;

    const sancaiCfg = SANCAI_WUXING[sancaiTian]?.[sancaiRen]?.[sancaiDi]
      ?? SANCAI_WUXING[sancaiTian]?.[sancaiRen]?.['木']
      ?? { ji: false, desc: '三才配置需确认' };
    const sancaiJi = sancaiCfg.ji;

    const tiangeScore = shuliScore(digitSum(tiange));
    const rengeScore = shuliScore(digitSum(renge));
    const digeScore = shuliScore(digitSum(dige));
    const waigeScore = shuliScore(digitSum(waige));
    const zonggeScore = shuliScore(digitSum(zongge));
    const sancaiScore = sancaiJi ? 90 : 30;
    const totalScore = Math.round(
      (tiangeScore * 0.1 + rengeScore * 0.4 + digeScore * 0.2 + waigeScore * 0.1 + zonggeScore * 0.1 + sancaiScore * 0.1)
    );

    return {
      tiange,
      renge,
      dige,
      waige,
      zongge,
      tiangeWuxing: tiangeWx,
      rengeWuxing: rengeWx,
      digeWuxing: digeWx,
      waigeWuxing: waigeWx,
      zonggeWuxing: zonggeWx,
      sancai: { tian: sancaiTian, ren: sancaiRen, di: sancaiDi },
      sancaiJi,
      sancaiDesc: sancaiCfg.desc,
      scores: {
        tiange: tiangeScore,
        renge: rengeScore,
        dige: digeScore,
        waige: waigeScore,
        zongge: zonggeScore,
        sancai: sancaiScore,
        total: totalScore,
      },
      details: {
        tiange: { num: digitSum(tiange), wuxing: tiangeWx, ji: tiangeJi, desc: SHULI_JIXIONG[digitSum(tiange)]?.desc || '大数超过81格，暂不判定' },
        renge: { num: digitSum(renge), wuxing: rengeWx, ji: rengeJi, desc: SHULI_JIXIONG[digitSum(renge)]?.desc || '大数超过81格，暂不判定' },
        dige: { num: digitSum(dige), wuxing: digeWx, ji: digeJi, desc: SHULI_JIXIONG[digitSum(dige)]?.desc || '大数超过81格，暂不判定' },
        waige: { num: digitSum(waige), wuxing: waigeWx, ji: waigeJi, desc: SHULI_JIXIONG[digitSum(waige)]?.desc || '大数超过81格，暂不判定' },
        zongge: { num: digitSum(zongge), wuxing: zonggeWx, ji: zonggeJi, desc: SHULI_JIXIONG[digitSum(zongge)]?.desc || '大数超过81格，暂不判定' },
      },
    };
  }
}