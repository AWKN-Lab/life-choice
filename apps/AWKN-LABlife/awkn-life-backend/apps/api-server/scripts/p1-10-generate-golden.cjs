/**
 * P1-10 黄金样例生成器
 *
 * 来源：TECHNICAL-REFERENCE-P01 §5.4
 *
 * 覆盖场景：
 *   1. 节气交接（立春、春分、夏至、立秋、冬至）
 *   2. 大运交接（10/20/30/40/50/60 岁）
 *   3. 流年交接（年初、年末）
 *   4. 出生时辰不确定（早子、晚子、夏令时）
 *   5. 资料缺失（仅年、仅年月）
 *
 * 共 20 例，输出 JSON 文件供测试比对。
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ============================================================
// 测试夹具构造
// ============================================================

function makeBaziFixture(opts = {}) {
  return {
    yearPillar: opts.yearPillar || '甲子',
    monthPillar: opts.monthPillar || '丙寅',
    dayPillar: opts.dayPillar || '戊午',
    hourPillar: opts.hourPillar || '庚申',
    yearShishen: '七杀',
    monthShishen: '偏印',
    dayShishen: '日主',
    hourShishen: '食神',
    wuxing: opts.wuxing || { wood: 2, fire: 2, earth: 1, metal: 2, water: 1 },
    daYun: opts.daYun || [
      { index: 0, gan: '丁', zhi: '卯', full: '丁卯', startAge: 5, endAge: 14 },
      { index: 1, gan: '戊', zhi: '辰', full: '戊辰', startAge: 15, endAge: 24 },
      { index: 2, gan: '己', zhi: '巳', full: '己巳', startAge: 25, endAge: 34 },
      { index: 3, gan: '庚', zhi: '午', full: '庚午', startAge: 35, endAge: 44 },
      { index: 4, gan: '辛', zhi: '未', full: '辛未', startAge: 45, endAge: 54 },
      { index: 5, gan: '壬', zhi: '申', full: '壬申', startAge: 55, endAge: 64 },
      { index: 6, gan: '癸', zhi: '酉', full: '癸酉', startAge: 65, endAge: 74 },
    ],
    qiYunAge: { year: 5, month: 0, day: 0, totalDays: 1825 },
    liuNian: opts.liuNian || [
      { year: 1984, ganZhi: '甲子', shishen: '七杀' },
      { year: 1985, ganZhi: '乙丑', shishen: '正官' },
      { year: 1986, ganZhi: '丙寅', shishen: '偏印' },
    ],
    liuNianDetail: [],
    shenSha: opts.shenSha || { tianYi: ['子'], wenChang: ['寅'], taiJi: [], yangRen: [] },
    naYin: { year: '海中金', month: '炉中火', day: '天上火', hour: '石榴木' },
    kongWang: [],
    taiYuan: '丁卯',
    mingGong: '己巳',
    shenGong: '辛未',
    zangganShishen: { year: [], month: [], day: [], hour: [] },
    changsheng: { year: '沐浴', month: '长生', day: '帝旺', hour: '临官' },
    xingChongHeHai: { year: [], month: [], day: [], hour: [] },
  };
}

// ============================================================
// 20 个黄金样例
// ============================================================

const GOLDEN_CASES = [
  // === 1. 节气交接 ===
  // 1.1 立春（2 月 4 日附近）
  {
    id: 'G001-jieqi-lichun',
    description: '立春节气交接',
    category: 'jieqi',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '12:30',
      baziResult: makeBaziFixture({}),
    },
  },
  // 1.2 春分（3 月 20 日附近）
  {
    id: 'G002-jieqi-chunfen',
    description: '春分节气交接',
    category: 'jieqi',
    input: {
      birthYear: 1985,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '06:00',
      baziResult: makeBaziFixture({ yearPillar: '乙丑' }),
    },
  },
  // 1.3 夏至（6 月 21 日附近）
  {
    id: 'G003-jieqi-xiazhi',
    description: '夏至节气交接',
    category: 'jieqi',
    input: {
      birthYear: 1986,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '18:00',
      baziResult: makeBaziFixture({ yearPillar: '丙寅' }),
    },
  },
  // 1.4 立秋（8 月 7 日附近）
  {
    id: 'G004-jieqi-liqiu',
    description: '立秋节气交接',
    category: 'jieqi',
    input: {
      birthYear: 1987,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '15:00',
      baziResult: makeBaziFixture({ yearPillar: '丁卯' }),
    },
  },
  // 1.5 冬至（12 月 22 日附近）
  {
    id: 'G005-jieqi-dongzhi',
    description: '冬至节气交接',
    category: 'jieqi',
    input: {
      birthYear: 1988,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '23:00',
      baziResult: makeBaziFixture({ yearPillar: '戊辰' }),
    },
  },

  // === 2. 大运交接（10/20/30/40/50/60 岁） ===
  // 2.1 10 岁大运交接
  {
    id: 'G006-dayun-10',
    description: '10 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 2016,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '08:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 2.2 20 岁大运交接
  {
    id: 'G007-dayun-20',
    description: '20 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 2006,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '10:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 2.3 30 岁大运交接
  {
    id: 'G008-dayun-30',
    description: '30 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 1996,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '14:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 2.4 40 岁大运交接
  {
    id: 'G009-dayun-40',
    description: '40 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 1986,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '16:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 2.5 50 岁大运交接
  {
    id: 'G010-dayun-50',
    description: '50 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 1976,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '18:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 2.6 60 岁大运交接
  {
    id: 'G011-dayun-60',
    description: '60 岁大运交接',
    category: 'dayun-change',
    input: {
      birthYear: 1966,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '20:00',
      baziResult: makeBaziFixture({}),
    },
  },

  // === 3. 流年交接（年初、年末） ===
  // 3.1 年初（1 月）
  {
    id: 'G012-liunian-year-start',
    description: '流年年初（1 月）',
    category: 'liunian-transition',
    input: {
      birthYear: 1984,
      viewMode: 'yearMonth',
      currentYear: 2026,
      rangeYears: 2,
      birthTime: '12:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 3.2 年末（12 月）
  {
    id: 'G013-liunian-year-end',
    description: '流年年末（12 月）',
    category: 'liunian-transition',
    input: {
      birthYear: 1984,
      viewMode: 'yearMonth',
      currentYear: 2025,
      rangeYears: 2,
      birthTime: '12:00',
      baziResult: makeBaziFixture({}),
    },
  },
  // 3.3 跨年点（12 月→1 月）
  {
    id: 'G014-liunian-cross-year',
    description: '流年跨年点',
    category: 'liunian-transition',
    input: {
      birthYear: 1990,
      viewMode: 'yearMonth',
      currentYear: 2026,
      rangeYears: 1,
      birthTime: '00:00',
      baziResult: makeBaziFixture({ yearPillar: '庚午' }),
    },
  },

  // === 4. 出生时辰不确定 ===
  // 4.1 早子时（00:00-00:59）
  {
    id: 'G015-shichen-early-zi',
    description: '早子时（00:30）',
    category: 'shichen-uncertain',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '00:30',
      baziResult: makeBaziFixture({ hourPillar: '甲子' }),
    },
  },
  // 4.2 晚子时（23:00-23:59）
  {
    id: 'G016-shichen-late-zi',
    description: '晚子时（23:30）',
    category: 'shichen-uncertain',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '23:30',
      baziResult: makeBaziFixture({ hourPillar: '丙子' }),
    },
  },
  // 4.3 夏令时（UTC+9 假数据）
  {
    id: 'G017-shichen-dst',
    description: '夏令时（影响时辰判定）',
    category: 'shichen-uncertain',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: '14:30', // 夏令时 14:30 实际为 13:30
      baziResult: makeBaziFixture({ hourPillar: '辛未' }),
    },
  },

  // === 5. 资料缺失 ===
  // 5.1 仅年（无月日时）
  {
    id: 'G018-missing-month-day',
    description: '资料缺失：仅年',
    category: 'missing-data',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: undefined,
      baziResult: makeBaziFixture({ shenSha: undefined }),
    },
  },
  // 5.2 仅年月（无日时）
  {
    id: 'G019-missing-day-hour',
    description: '资料缺失：仅年月',
    category: 'missing-data',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: undefined,
      baziResult: makeBaziFixture({
        daYun: [],
        shenSha: undefined,
      }),
    },
  },
  // 5.3 大运缺失 + shenSha 缺失
  {
    id: 'G020-missing-dayun-shensha',
    description: '资料缺失：大运+神煞',
    category: 'missing-data',
    input: {
      birthYear: 1984,
      viewMode: 'life',
      currentYear: 2026,
      rangeYears: 80,
      birthTime: undefined,
      baziResult: makeBaziFixture({
        daYun: [],
        shenSha: undefined,
      }),
    },
  },
];

// ============================================================
// 输出
// ============================================================

function main() {
  const outputDir = path.join(__dirname, '..', 'src', 'kline-tide', '__tests__', 'golden');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'golden-cases-v2.json');
  const output = {
    version: 'v2.0.0',
    generatedAt: new Date().toISOString(),
    count: GOLDEN_CASES.length,
    categories: ['jieqi', 'dayun-change', 'liunian-transition', 'shichen-uncertain', 'missing-data'],
    cases: GOLDEN_CASES,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`已生成 ${GOLDEN_CASES.length} 个黄金样例 → ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { GOLDEN_CASES, makeBaziFixture };
