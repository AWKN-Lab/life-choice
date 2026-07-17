export interface BoardMeta {
  type: 'hour' | 'day' | 'month' | 'year' | 'minute';
  datetime: Date;
  yinyang: string;
  juNumber: number;
  xunHead: string;
  xunHeadGan: string;
  ganZhi: string;
  solarTerm: string;
  moveStarOffset: number;
}

export interface StarInfo {
  name: string;
  shortName: string;
  wuxing: string;
  originPalace: number;
}

export interface DoorInfo {
  name: string;
  shortName: string;
  wuxing: string;
  originPalace: number;
}

export interface GodInfo {
  name: string;
  shortName: string;
  wuxing: string;
}

export interface Palace {
  index: number;
  position: number;
  name: string;
  groundGan: string;
  groundExtraGan: string | null;
  skyGan: string;
  skyExtraGan: string | null;
  star: StarInfo | null;
  door: DoorInfo | null;
  god: GodInfo | null;
  outGan: string | null;
  outExtraGan: string | null;
  outerGods: any[];
}

export interface TimeDunjiaBoard {
  meta: BoardMeta;
  palace(index: number): Palace;
  moveStar(steps: number): TimeDunjiaBoard;
  applyOuterGod(plugin: any): TimeDunjiaBoard;
  toJSON(): any;
}

export interface TimeDunjiaOptions {
  datetime: Date;
  type?: 'hour' | 'day' | 'month' | 'year' | 'minute';
}

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const WUXING = ['木', '火', '土', '金', '水'];

const NINE_GONGS = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
const JIU_XING = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
const JIU_XING_SHORT = ['蓬', '芮', '冲', '辅', '禽', '心', '柱', '任', '英'];
const BA_MEN = ['休', '死', '伤', '杜', '中', '开', '惊', '生', '景'];
const BA_SHEN = ['值符', '螣蛇', '太阴', '六合', '勾陈', '青龙', '天乙', '白虎', '玄武'];

function getGanIndex(gan: string): number {
  return TIANGAN.indexOf(gan);
}

function getZhiIndex(zhi: string): number {
  return DIZHI.indexOf(zhi);
}

function combineGanZhi(ganIndex: number, zhiIndex: number): string {
  return TIANGAN[ganIndex % 10] + DIZHI[zhiIndex % 12];
}

function getSolarTermIndex(month: number): number {
  const solarTerms = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
  ];
  const index = (month - 1) * 2;
  return Math.min(index, solarTerms.length - 1);
}

function calculateJuNumber(month: number, hour: number): { yinyang: string; juNumber: number } {
  const jiaziMonth = (month + 1) % 12;
  let baseJu: number;

  if (month >= 1 && month <= 3) {
    baseJu = 9;
  } else if (month >= 4 && month <= 6) {
    baseJu = 3;
  } else if (month >= 7 && month <= 9) {
    baseJu = 6;
  } else {
    baseJu = 1;
  }

  const hourIndex = Math.floor(hour / 2) % 12;
  const xunIndex = (jiaziMonth + hourIndex) % 12;

  const yinYangHours: Record<number, string> = {
    0: '阳', 1: '阳', 2: '阳', 3: '阳', 4: '阳', 5: '阳',
    6: '阴', 7: '阴', 8: '阴', 9: '阴', 10: '阴', 11: '阴'
  };

  return {
    yinyang: yinYangHours[hourIndex],
    juNumber: baseJu
  };
}

function getXunHead(month: number, day: number): { xunHead: string; xunHeadGan: string } {
  const jiaziIndex = (day - 1) % 60;
  const xunIndex = Math.floor(jiaziIndex / 6);
  const xunHeads = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  const ganIndex = xunIndex;
  return {
    xunHead: xunHeads[xunIndex],
    xunHeadGan: TIANGAN[ganIndex]
  };
}

function createPalaceData(
  index: number,
  position: number,
  skyGan: string,
  groundGan: string,
  juNumber: number,
  yinyang: string
): Palace {
  const starIndex = (position + juNumber - 1) % 9;
  const doorIndex = (position + juNumber - 2) % 9;
  const godIndex = (position + juNumber - 1) % 9;

  return {
    index,
    position,
    name: NINE_GONGS[index],
    groundGan,
    groundExtraGan: null,
    skyGan,
    skyExtraGan: null,
    star: {
      name: JIU_XING[starIndex],
      shortName: JIU_XING_SHORT[starIndex],
      wuxing: WUXING[starIndex % 5],
      originPalace: starIndex
    },
    door: {
      name: BA_MEN[doorIndex],
      shortName: BA_MEN[doorIndex],
      wuxing: WUXING[(doorIndex + 2) % 5],
      originPalace: doorIndex
    },
    god: {
      name: BA_SHEN[godIndex],
      shortName: BA_SHEN[godIndex][0],
      wuxing: WUXING[godIndex % 5]
    },
    outGan: skyGan,
    outExtraGan: null,
    outerGods: []
  };
}

export class TimeDunjia {
  static create(options: TimeDunjiaOptions): TimeDunjiaBoard {
    const datetime = options.datetime;
    const month = datetime.getMonth() + 1;
    const day = datetime.getDate();
    const hour = datetime.getHours();

    const { yinyang, juNumber } = calculateJuNumber(month, hour);
    const { xunHead, xunHeadGan } = getXunHead(month, day);

    const solarTerms = [
      '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
      '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
      '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
      '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
    ];
    const solarTerm = solarTerms[getSolarTermIndex(month)];

    const dayOfYear = Math.floor((datetime.getTime() - new Date(datetime.getFullYear(), 0, 0).getTime()) / 86400000);
    const ganIndex = (dayOfYear - 1) % 10;
    const zhiIndex = (dayOfYear - 1) % 12;
    const ganZhi = combineGanZhi(ganIndex, zhiIndex);

    const palacePositions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const groundGans = ['坎一', '坤二', '震三', '巽四', '中五', '乾六', '兑七', '艮八', '离九'].map(g => g[0]);
    const skyGans = TIANGAN[(ganIndex + juNumber) % 10] !== '甲'
      ? [TIANGAN[(ganIndex + juNumber) % 10]]
      : groundGans;

    const palaces: Palace[] = palacePositions.map((pos, idx) =>
      createPalaceData(idx, pos, skyGans[idx % skyGans.length], groundGans[idx], juNumber, yinyang)
    );

    const meta: BoardMeta = {
      type: options.type || 'hour',
      datetime,
      yinyang,
      juNumber,
      xunHead,
      xunHeadGan,
      ganZhi,
      solarTerm,
      moveStarOffset: 0
    };

    return {
      meta,
      palace: (index: number) => palaces[index % 9],
      moveStar: function(steps: number): TimeDunjiaBoard {
        const newOffset = meta.moveStarOffset + steps;
        meta.moveStarOffset = newOffset;

        palaces.forEach((p, idx) => {
          if (p.star) {
            const newStarIdx = (p.star.originPalace + newOffset) % 9;
            p.star = {
              name: JIU_XING[newStarIdx],
              shortName: JIU_XING_SHORT[newStarIdx],
              wuxing: WUXING[newStarIdx % 5],
              originPalace: newStarIdx
            };
          }
        });

        return this;
      },
      applyOuterGod: function(plugin: any): TimeDunjiaBoard {
        return this;
      },
      toJSON: function(): any {
        return {
          meta,
          palaces: palaces.map((p, idx) => ({
            ...p,
            palace: undefined
          }))
        };
      }
    };
  }

  static from(data: any): TimeDunjiaBoard {
    return TimeDunjia.create({ datetime: new Date(data.datetime) });
  }
}
