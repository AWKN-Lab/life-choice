import type { RouteType } from '@/types/api';
import type { UnifiedResult } from './resultTypes';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function deterministicInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}

export function generateLocalKlineModuleContent(
  calcResult: any,
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'],
  inputData?: { birthDate?: string; birthTime?: string }
): any {
  if (!calcResult) return null;

  const data = calcResult.calcData || calcResult;
  const sourceInput = calcResult.inputData || calcResult.data?.inputData || {};

  const yearPillar = data.yearPillar || '';
  const monthPillar = data.monthPillar || '';
  const dayPillar = data.dayPillar || '';
  const hourPillar = data.hourPillar || '';
  const daYun = data.daYun || [];
  const wuxing = data.wuxing || {};

  const currentYear = new Date().getFullYear();
  const birthDate =
    data.birthDate ||
    data.birth_date ||
    sourceInput.birthDate ||
    sourceInput.birth_date ||
    inputData?.birthDate ||
    '';
  const parsedBirthYear = Number(String(birthDate).slice(0, 4));
  const birthYear = Number.isFinite(parsedBirthYear) && parsedBirthYear > 0 ? parsedBirthYear : currentYear;
  let previousClose = 60;
  const chartData = Array.from({ length: 101 }, (_, age) => {
    const year = birthYear + age;
    const daYunItem = daYun.find((d: any) => age >= (d.startAge || 0) && age <= (d.endAge || 0)) || daYun[0];
    const close = deterministicInt(`${dayPillar}-${year}-close`, 35, 88);
    const open = Math.round(previousClose * 0.6 + close * 0.4);
    previousClose = close;
    return {
      age,
      year,
      ganZhi: `${year}`,
      daYun: daYunItem?.full || `${daYunItem?.gan || ''}${daYunItem?.zhi || ''}`,
      liuNian: `${year}`,
      open,
      close,
      high: Math.min(100, Math.max(open, close) + 8),
      low: Math.max(0, Math.min(open, close) - 8),
      score: close,
      volatility: 16,
      reason: t('resultPage.kline.localReason'),
      evidenceTags: [dayPillar ? `${dayPillar}${t('resultPage.kline.dayPillar')}` : t('resultPage.kline.dayPillar'), daYunItem?.full ? `${t('resultPage.kline.daYun')}${daYunItem.full}` : t('resultPage.kline.daYun')],
      confidence: 60,
      viewMode: 'life',
      granularity: 'year',
      trend: close >= open ? t('resultPage.kline.rising') : t('resultPage.kline.adjusting'),
      advice: close >= 65 ? t('resultPage.kline.proceed') : t('resultPage.kline.reduceRisk'),
      isCurrentYear: year === currentYear,
      isDaYunChange: daYun.some((d: any) => age === d.startAge),
    };
  });
  const yearMonthData = chartData.flatMap((point: any) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const close = deterministicInt(`${dayPillar}-${point.year}-${month}-detail`, 35, 88);
      return {
        ...point,
        age: Math.round((point.age + i / 12) * 100) / 100,
        month,
        monthName: t('fortune.monthLabel', { month }),
        close,
        score: close,
        high: Math.min(100, close + 7),
        low: Math.max(0, close - 7),
        viewMode: 'yearMonth',
        granularity: 'month',
        reason: t('resultPage.kline.localMonthReason', { year: point.year, month }),
      };
    })
  );
  const currentPoint = chartData.find((point: any) => point.isCurrentYear) || chartData[Math.max(0, Math.min(100, currentYear - birthYear))];
  const bestWindow = chartData.reduce((best: any, point: any) => point.score > best.score ? point : best, chartData[0]);
  const riskWindow = chartData.reduce((risk: any, point: any) => point.score < risk.score ? point : risk, chartData[0]);

  const wuxingScores = {
    wood: Number(wuxing.wood || 0),
    fire: Number(wuxing.fire || 0),
    earth: Number(wuxing.earth || 0),
    metal: Number(wuxing.metal || 0),
    water: Number(wuxing.water || 0),
  };
  const total = Object.values(wuxingScores).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) || 5;
  const ratios: Record<string, number> = {};
  ['wood', 'fire', 'earth', 'metal', 'water'].forEach(key => {
    const val = wuxingScores[key as keyof typeof wuxingScores] || 0;
    ratios[key] = Math.round((val / total) * 100);
  });

  return {
    title: t('resultPage.kline.title'),
    subtitle: t('resultPage.kline.subtitle'),
    overview: t('resultPage.kline.overview', { yearPillar, monthPillar, dayPillar, hourPillar }),
    chartData,
    yearData: chartData,
    yearMonthData,
    rangeYears: 100,
    currentAge: currentPoint?.age || 0,
    currentDaYun: currentPoint?.daYun || '',
    confidence: 60,
    bestWindow: { year: bestWindow.year, age: bestWindow.age, score: bestWindow.score },
    riskWindow: { year: riskWindow.year, age: riskWindow.age, score: riskWindow.score },
    meta: {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
      wuxing: wuxingScores,
    },
    trends: daYun.slice(0, 5).map((d: any, i: number) => ({
      period: t('resultPage.kline.ageRange', { startAge: d.startAge, endAge: d.endAge }),
      direction: i % 2 === 0 ? t('resultPage.kline.rising') : t('resultPage.kline.adjusting'),
      probability: deterministicInt(`${d.gan}${d.zhi}-${i}-prob`, 50, 89),
      note: t('resultPage.kline.daYunNote', { gan: d.gan, zhi: d.zhi }),
    })),
    key_nodes: daYun.slice(0, 3).map((d: any, i: number) => ({
      time: t('klineImage.ageLabel', { age: d.startAge }),
      event: t('resultPage.kline.daYunNote', { gan: d.gan, zhi: d.zhi }),
      impact: i === 0 ? 'positive' : 'neutral',
      description: t('resultPage.kline.daYunDesc', { gan: d.gan, zhi: d.zhi, type: i === 0 ? t('resultPage.kline.currentLuck') : t('resultPage.kline.futureDev') }),
    })),
    monthlyData: Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const score = deterministicInt(`${dayPillar}-${currentYear}-${month}-month`, 50, 84);
      const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      return {
        monthName: t('fortune.monthLabel', { month }),
        year: currentYear,
        ganZhi: ganList[i % 10] + zhiList[i % 12],
        element: ['wood', 'fire', 'earth', 'metal', 'water'][i % 5],
        score,
        luckLevel: score >= 70 ? t('resultPage.kline.greatLuck') : score >= 55 ? t('resultPage.kline.averageLuck') : t('resultPage.kline.poorLuck'),
        advice: [t('resultPage.kline.advance'), t('resultPage.kline.holdSteady'), t('resultPage.kline.adjust'), t('resultPage.kline.gatherStrength')][i % 4],
      };
    }),
    wuxing_analysis: {
      dayElementCn: dayPillar[0] || '木',
      balance: ratios.wood === ratios.fire ? t('resultPage.kline.balanced') : t('resultPage.kline.imbalanced'),
      ratios,
      suggestions: [
        t('resultPage.kline.woodRatio', { ratio: ratios.wood || 0, status: ratios.wood > 20 ? t('resultPage.kline.strong') : t('resultPage.kline.weak') }),
        t('resultPage.kline.fireRatio', { ratio: ratios.fire || 0, status: ratios.fire > 20 ? t('resultPage.kline.strong') : t('resultPage.kline.weak') }),
        t('resultPage.kline.wuxingSuggestion'),
      ],
    },
    dayun_analysis: daYun.slice(0, 5).map((d: any, i: number) => ({
      ganZhi: d.gan + d.zhi,
      ageRange: t('resultPage.kline.ageRange', { startAge: d.startAge, endAge: d.endAge }),
      isCurrent: i === 0,
      luckType: i === 0 ? t('resultPage.kline.auspicious') : i % 2 === 0 ? t('resultPage.kline.smooth') : t('resultPage.kline.unfavorable'),
      highlights: [
        t('resultPage.kline.ganHighlight', { gan: d.gan }),
        t('resultPage.kline.zhiHighlight', { zhi: d.zhi }),
      ],
    })),
  };
}

export function generateLocalBreakthroughModuleContent(result: any, t: ReturnType<typeof import('react-i18next').useTranslation>['t']): any {
  return {
    title: t('resultPage.breakthrough.unavailable'),
    subtitle: t('resultPage.breakthrough.needBackend'),
    timeout: true,
    retryable: true,
    noCharge: true,
    message: t('resultPage.breakthrough.message'),
  };
}

export function generateLocalMorningModuleContent(result: any, t: ReturnType<typeof import('react-i18next').useTranslation>['t']): any {
  const today = new Date();
  const currentYear = today.getFullYear();

  return {
    title: t('resultPage.morning.title'),
    subtitle: t('resultPage.morning.subtitle', { year: currentYear, month: today.getMonth() + 1, day: today.getDate() }),
    overview: t('resultPage.morning.overview'),
    overall_score: 65 + Math.floor(Math.random() * 20),
    wuxing_today: {
      lucky_direction: [
        t('resultPage.morning.directions.east'),
        t('resultPage.morning.directions.south'),
        t('resultPage.morning.directions.west'),
        t('resultPage.morning.directions.north'),
      ][Math.floor(Math.random() * 4)],
      lucky_color: [
        t('resultPage.morning.colors.red'),
        t('resultPage.morning.colors.yellow'),
        t('resultPage.morning.colors.blue'),
        t('resultPage.morning.colors.green'),
        t('resultPage.morning.colors.white'),
      ][Math.floor(Math.random() * 5)],
      lucky_number: Math.floor(Math.random() * 9) + 1,
      avoid: [t('resultPage.morning.pettyPeople'), t('resultPage.morning.impulse'), t('resultPage.morning.risk')][Math.floor(Math.random() * 3)],
    },
    hourly_fortune: Array.from({ length: 12 }, (_, i) => ({
      hour: `${23 + i - 11}:00`,
      score: 40 + Math.floor(Math.random() * 40),
      tip: [t('resultPage.morning.stayQuiet'), t('resultPage.morning.takeAction'), t('resultPage.morning.average'), t('resultPage.morning.caution')][Math.floor(Math.random() * 4)],
    })),
    recommendations: [
      t('resultPage.morning.recDocWork'),
      t('resultPage.morning.recDelayDecision'),
      t('resultPage.morning.recDigestion'),
    ],
    mingli_tips: [
      t('resultPage.morning.tipTravel'),
      t('resultPage.morning.tipRomance'),
      t('resultPage.morning.tipWealth'),
    ],
  };
}

const MOCK_RESULTS: Record<RouteType, Omit<UnifiedResult, 'record_id' | 'route_type'>[]> = {
  liuren: [
    {
      summary_line: '此事可成，但需把握「天时」，不宜强推。',
      summary_body: `课局显示：当前能量场处于"蓄势待发"阶段。四课之中干上有生助之意，支上神见合局之象。三传初传为用事之神，中传见转机，末传归稳。整体格局偏向"先难后易"，前段需耐心布局，后段自然水到渠成。`,
      risks: ['急躁冒进会打乱节奏', '对方可能还在观察期', '信息尚有盲区', '过度承诺易陷被动'],
      actions: ['保持现状，暗中准备', '关键信息再确认一轮', '设定底线，不被带节奏', '等待对方主动释放信号后再推进'],
      time_window: '未来 3-7 天：适合试探与验证，7-14 天可见初步结果',
      evidence_fold: '【断事推演排盘摘要】\n· 起课时间：依问事时刻\n· 月将：依节气区间自动判定\n· 天地盘：月将与占时形成有效位移\n· 四课结构：干上神→支上神\n· 三传：按九宗门贼克法发用',
      paywall_modules: ['breakthrough', 'morning', 'kline'],
    },
    {
      summary_line: '时机正好，速战速决，犹豫反生变数。',
      summary_body: `课局显示：当前处于"进攻窗口"。天地盘排列呈现明显的冲克之势，但这冲克在断事推演中往往代表"破旧立新"的能量爆发点。三传之中初传为发端之神，力量强劲；中传承接有力；末传虽见消耗但可控。`,
      risks: ['拖延会导致机会流失', '竞争对手也在行动', '决策链条过长会影响执行力', '细节处理不周可能翻车'],
      actions: ['本周内完成核心决策', '制定清晰的执行清单', '预留 B 方案应对变化', '同步关键利益方'],
      time_window: '未来 48-72 小时为最佳行动窗',
      evidence_fold: '【断事推演排盘摘要】\n· 课体：元首课，主导权在手\n· 神煞：天乙贵人方位有利，驿马星动\n· 判读：能量指向"果断行动，速战速决"',
      paywall_modules: ['breakthrough', 'kline'],
    },
    {
      summary_line: '宜守不宜攻，当前不是发力点。',
      summary_body: `课局显示：当前能量场偏于"收敛整理"状态。四课之中未见明显克合优势，三传走向偏缓。这不代表事情做不成，而是说：现在投入产出比不高，硬推反而损耗更大。`,
      risks: ['强行推进会遇阻且耗能', '资源分散影响其他布局', '可能错过更好的入场时机', '情绪焦虑导致判断偏差'],
      actions: ['暂停重大决策，转入观察期', '盘点现有资源和筹码', '完善方案细节，等待信号', '关注 7-14 天后的气机变化'],
      time_window: '未来 2-4 周以静制动',
      evidence_fold: '【断事推演排盘摘要】\n· 课体：伏吟/返吟倾向，主反复或停滞\n· 神煞：旬空位需注意\n· 判读："守正待时，不宜妄动"',
      paywall_modules: ['morning', 'breakthrough', 'kline'],
    },
  ],
  ziping: [
    {
      summary_line: '你这段时间整体偏整理，不宜太急着扩张。',
      summary_body: `当前处于能量整合期，适合回顾总结、调整方向，而不是盲目扩张。命盘显示你正处于积累阶段，需要耐心等待时机。`,
      risks: ['过度扩张会分散精力', '基础不牢影响长远发展', '容易忽视细节问题'],
      actions: ['梳理现有资源', '优化内部流程', '为下一阶段做准备'],
      time_window: '近期：适合复盘与校准，不建议硬扩张',
      evidence_fold: '【东方命理命理分析】\n· 四柱：年柱月柱日柱时柱\n· 格局：根据五行生克判定\n· 用神：取其调候通关者\n· 喜忌：依格局配置',
      paywall_modules: ['morning', 'breakthrough', 'kline'],
    },
    {
      summary_line: '近期有贵人运，多出门走动会有收获。',
      summary_body: `人际能量场活跃，适合拓展人脉、寻求合作。外出交流会带来意外机遇，尤其在东方或东南方位。`,
      risks: ['宅在家里错失机会', '过于保守影响发展', '单打独斗效率低'],
      actions: ['多参加社交活动', '主动联系老朋友', '保持开放心态'],
      time_window: '未来 7-14 天：多见面、多验证更容易遇到机会',
      evidence_fold: '【东方命理命理分析】\n· 贵人星：年月日时各有所主\n· 桃花位：依生辰判定\n· 驿马：动中求财之象',
      paywall_modules: ['morning', 'kline'],
    },
  ],
  zhangsheng: [
    {
      summary_line: '当前处于上升期，接下来3个月有重要转折点。',
      summary_body: `人生K线显示：你正处于一个重要的发展阶段。过去的积累正在转化为动能，未来一段时间将是关键的决策窗口期。`,
      risks: ['方向选择比努力更重要', '过度谨慎会错过时机', '资源整合能力待提升'],
      actions: ['明确下一阶段核心目标', '建立关键里程碑', '定期回顾K线走势'],
      time_window: '3个月内有一次重要机会，6个月后进入新阶段',
      evidence_fold: '【人生K线分析】\n· 当前节点：上升期\n· 关键转折：未来90天\n· 能量周期：依八字大运判定',
      paywall_modules: ['breakthrough', 'morning'],
    },
  ],
  quming: [
    {
      summary_line: '喜木火，忌金水，名字宜带「林」「炎」「莹」等。',
      summary_body: `根据八字分析，宝宝五行缺木火，名字中宜加入木火属性的字。推荐使用"林""焱""莹""琪""瑾"等字，搭配得当可补足命局所需。`,
      risks: ['名字与姓氏搭配需综合考虑', '读音意境同样重要', '避免过于生僻的字'],
      actions: ['列出5-10个候选名字', '结合姓氏测试读音', '考虑名字寓意与家族期望'],
      time_window: '取名建议在出生后30天内完成登记',
      evidence_fold: '【八字取名分析】\n· 八字：年柱月柱日柱时柱\n· 五行：木火偏弱，金水偏旺\n· 用神：木火为用，忌金水\n· 推荐部首：木字旁、火字旁',
      paywall_modules: ['morning'],
    },
  ],
  liuyao: [
    {
      summary_line: '卦象显示此事有转机，但需等待时机。',
      summary_body: `六爻卦象显示：当前事态处于酝酿阶段。卦中世应相生，说明事主有能力推动进展，但受于卦气约束，需要等待合适时机。`,
      risks: ['急于求成反生变数', '对方态度尚在观望', '信息不对称需要核实'],
      actions: ['保持现状暗中观察', '收集更多卦象信息', '设定观察期限'],
      time_window: '未来7-14天见分晓',
      evidence_fold: '【六爻卦象分析】\n· 主卦：从初爻至上爻\n· 动爻：依时辰起卦\n· 世应：事主与对方\n· 六亲：生克比和判定',
      paywall_modules: ['breakthrough', 'morning'],
    },
  ],
  qimen: [
    {
      summary_line: '东方为吉位，本月癸卯日宜动土。',
      summary_body: `奇门遁甲显示：东方震宫为吉位，有利于开展新事业。西南坤宫有阻碍，应避免重要决策。本月癸卯日为黄道吉日，适宜动土、搬家、开业等。`,
      risks: ['东北方为凶位，应避免重要活动', '申酉月注意口舌是非', '子午卯酉日为破日'],
      actions: ['重要决策选东方方位', '避免在东北方长时间停留', '本月癸卯日把握时机'],
      time_window: '本月癸卯日为最佳行动日',
      evidence_fold: '【奇门遁甲分析】\n· 阴阳遁：阳遁/阴遁\n· 九宫：依方位判定吉凶\n· 门星神：各有所主',
      paywall_modules: ['breakthrough', 'morning'],
    },
  ],
  ziwei: [
    {
      summary_line: '紫微斗数显示，近期命宫吉星高照，宜把握机会。',
      summary_body: `紫微星曜分布显示：命宫有吉星守护，三方四正见化禄化权。适合规划中长期目标，同时关注兄弟宫与夫妻宫的互动关系。`,
      risks: ['忌过度冲动决策', '需注意财务流动性', '健康作息勿忽视'],
      actions: ['制定12个月目标清单', '优化财务结构', '保持运动与作息规律'],
      time_window: '未来 30-90 天为机会窗口',
      evidence_fold: '【紫微斗数分析】\n· 命宫：紫微星曜定位\n· 三方四正：主星互动\n· 四化：禄权科忌分布\n· 大运/流年：时间维度判定',
      paywall_modules: ['breakthrough', 'kline'],
    },
  ],
  clarify: [],
};

export function generateUnifiedResult(routeType: RouteType, seed?: string): UnifiedResult {
  const mocks = MOCK_RESULTS[routeType] || MOCK_RESULTS.liuren;
  if (mocks.length === 0) {
    return generateUnifiedResult('liuren', seed);
  }

  const dateSeed = seed || new Date().toISOString().slice(0, 10);
  const index = parseInt(dateSeed.replace(/-/g, ''), 10) % mocks.length;
  const mock = mocks[index];

  return {
    route_type: routeType,
    ...mock,
    record_id: `${routeType.toUpperCase()}_${Date.now().toString(36).slice(2, 10)}`,
  };
}

export const WUXING_LABELS: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
export const WUXING_COLORS: Record<string, string> = {
  wood: 'bg-emerald-400 text-emerald-950',
  fire: 'bg-rose-400 text-rose-950',
  earth: 'bg-amber-300 text-amber-950',
  metal: 'bg-slate-200 text-slate-900',
  water: 'bg-indigo-300 text-indigo-950',
};

export function getWuxingCounts(calcResult: any): Record<string, number> {
  const normalized = normalizeCalcResult(calcResult);
  const wuxing = normalized?.wuxing || {};
  const scores = wuxing.scores || wuxing;
  return {
    wood: Number(scores.wood || 0),
    fire: Number(scores.fire || 0),
    earth: Number(scores.earth || 0),
    metal: Number(scores.metal || 0),
    water: Number(scores.water || 0),
  };
}

export function getCurrentDaYun(calcResult: any, birthDate?: string) {
  const normalized = normalizeCalcResult(calcResult);
  const daYun = Array.isArray(normalized?.daYun) ? normalized.daYun : [];
  if (daYun.length === 0) return null;
  const birthYear = Number(String(birthDate || '').slice(0, 4));
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : undefined;
  return daYun.find((d: any) => typeof currentAge === 'number' && currentAge >= Number(d.startAge ?? d.age ?? 0) && currentAge <= Number(d.endAge ?? d.year ?? 0)) || daYun[0];
}

export function normalizeCalcResult(calcResult: any): any {
  if (!calcResult) return null;
  if (calcResult.calcData) return calcResult.calcData;
  if (calcResult.data?.calcData) return calcResult.data.calcData;
  return calcResult;
}

export function cleanDisplayText(value: any): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map(cleanDisplayText).filter(Boolean).join('；');
  }
  if (typeof value === 'object') {
    const parts = [
      value.title,
      value.description,
      value.coreAction,
      value.timeline,
      ...(Array.isArray(value.steps) ? value.steps : []),
    ];
    return parts.map(cleanDisplayText).filter(Boolean).join('；');
  }
  let text = String(value).trim();
  if (!text) return '';
  if (/^\s*[{[]/.test(text)) {
    try {
      return cleanDisplayText(JSON.parse(text));
    } catch {
      return '';
    }
  }
  text = text
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!text || /"coreAction"|"steps"|^\s*coreAction\s*:|^\s*steps\s*:/.test(text)) return '';
  return text;
}

export function cleanDisplayList(value: any): string[] {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return source.map(cleanDisplayText).filter(Boolean);
}

export function normalizeModuleContentForDisplay(content: any, moduleId?: string): any {
  if (!content || typeof content !== 'object') return content;
  const next = { ...content };

  if (moduleId === 'breakthrough' && next.subtitle === '基于算法证据包的案例级推演') {
    next.subtitle = '';
  }

  ['overview', 'subtitle', 'title'].forEach((key) => {
    if (next[key]) next[key] = cleanDisplayText(next[key]);
  });

  ['key_points', 'risk_alerts', 'recommendations', 'next_steps', 'stopDoingList', 'evidenceTags'].forEach((key) => {
    if (next[key]) next[key] = cleanDisplayList(next[key]);
  });

  if (Array.isArray(next.breakthrough_path)) {
    next.breakthrough_path = next.breakthrough_path
      .map((phase: any) => ({
        ...phase,
        phase: cleanDisplayText(phase?.phase),
        title: cleanDisplayText(phase?.title),
        description: cleanDisplayText(phase?.description),
        actions: cleanDisplayList(phase?.actions),
      }))
      .filter((phase: any) => phase.phase || phase.title || phase.description || phase.actions.length > 0);
  }

  if (next.mvpPlan && typeof next.mvpPlan === 'object') {
    next.mvpPlan = {
      ...next.mvpPlan,
      coreAction: cleanDisplayText(next.mvpPlan.coreAction),
      timeline: cleanDisplayText(next.mvpPlan.timeline),
      steps: cleanDisplayList(next.mvpPlan.steps),
    };
  }

  return next;
}

export function estimateClientBaziProfile(calcResult: any) {
  const normalized = normalizeCalcResult(calcResult);
  const counts = getWuxingCounts(normalized);
  const dayGan = normalized?.dayPillar?.[0] || '-';
  const ganElement: Record<string, string> = {
    甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
    己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
  };
  const dayElement = ganElement[dayGan] || 'earth';
  const supportMap: Record<string, string> = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' };
  const drainMap: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  const controlMap: Record<string, string> = { wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth' };
  const wealthMap: Record<string, string> = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
  const score = Math.round(50 + counts[dayElement] * 9 + counts[supportMap[dayElement]] * 6 - counts[drainMap[dayElement]] * 4 - counts[controlMap[dayElement]] * 5);
  const bodyStrength = normalized?.bodyStrength || (score >= 68 ? '偏旺' : score <= 42 ? '偏弱' : '中和');
  const isStrong = score >= 58;
  const yong = normalized?.yongShen || (isStrong ? [drainMap[dayElement], controlMap[dayElement], wealthMap[dayElement]] : [supportMap[dayElement], dayElement]).map(key => WUXING_LABELS[key]);
  const ji = normalized?.jiShen || (isStrong ? [dayElement, supportMap[dayElement]] : [controlMap[dayElement], drainMap[dayElement], wealthMap[dayElement]]).map(key => WUXING_LABELS[key]);
  return {
    counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0) || 1,
    dayGan,
    dayElement,
    bodyStrength,
    score: normalized?.bodyStrengthScore || score,
    yong,
    ji,
  };
}
