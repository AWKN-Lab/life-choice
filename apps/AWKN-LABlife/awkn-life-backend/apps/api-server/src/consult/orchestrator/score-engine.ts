/**
 * 分值规则引擎（可证伪输出层）
 *
 * 根据格局成败 + 忌神冲击 + 救应有无可程序化打分（1-100）
 * 案例基准：61/100（婚姻咨询，案例.docx；早期文档误记为 66，2026-06-27 修正）
 *
 * 打分维度：
 * 1. 格局成败（顺用/逆用是否成立）— 30 分
 * 2. 忌神冲击强度（七杀/伤官/羊刃是否无制）— 25 分
 * 3. 救应有无（逢冲破有无合解或印化）— 20 分
 * 4. 用神有力（用神是否透干得地）— 15 分
 * 5. 五行中和度（是否严重偏枯）— 10 分
 */

export interface ScoreInput {
  /** 格局名称（如"正官格""偏财格"） */
  geJuName?: string;
  /** 格局成败：true=成格，false=破格 */
  geJuSuccess?: boolean;
  /** 逢冲破无救：true=无救应 */
  brokenWithoutRescue?: boolean;
  /** 忌神冲击信号列表（如['七杀无制','伤官见官']） */
  jiShenSignals?: string[];
  /** 救应信号列表（如['印星化杀','合解']） */
  rescueSignals?: string[];
  /** 用神是否透干得地 */
  yongShenStrong?: boolean;
  /** 五行严重偏枯 */
  wuXingExtreme?: boolean;
  /** 场景类型：婚姻/事业/财运/子女 */
  scenario?: string;
}

export interface ScoreOutput {
  /** 综合分值 1-100 */
  score: number;
  /** 得分依据（3 条） */
  evidence: string[];
  /** 分维度分值 */
  breakdown: {
    geJu: number;
    jiShen: number;
    rescue: number;
    yongShen: number;
    wuXing: number;
  };
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
}

const HIGH_RISK_SIGNALS = ['七杀无制', '羊刃逢冲', '三刑', '伤官见官', '财坏印'];
const MEDIUM_RISK_SIGNALS = ['子午冲', '卯酉冲', '子未害', '伏吟', '比劫夺财'];

/**
 * 计算命局分值
 */
export function calculateScore(input: ScoreInput): ScoreOutput {
  const evidence: string[] = [];
  let geJu = 15; // 基础 15 分
  let jiShen = 15; // 基础 15 分
  let rescue = 10; // 基础 10 分
  let yongShen = 8; // 基础 8 分
  let wuXing = 5; // 基础 5 分

  // 1. 格局成败（30 分）
  if (input.geJuSuccess === true) {
    geJu = 25;
    evidence.push(`格局${input.geJuName || ''}成立，顺用/逆用得当，结构稳固`);
  } else if (input.geJuSuccess === false) {
    geJu = 8;
    evidence.push(`格局${input.geJuName || ''}破格，结构不稳，需救应`);
  } else {
    geJu = 18;
    evidence.push('格局未明确判定，按中等处理');
  }

  // 2. 忌神冲击（25 分）
  const signals = input.jiShenSignals || [];
  const highRisks = signals.filter(s => HIGH_RISK_SIGNALS.includes(s));
  const mediumRisks = signals.filter(s => MEDIUM_RISK_SIGNALS.includes(s));

  if (highRisks.length > 0) {
    jiShen = 5;
    evidence.push(`高风险信号：${highRisks.join('、')}，系统性风险，需重点防范`);
  } else if (mediumRisks.length > 0) {
    jiShen = 12;
    evidence.push(`中等风险信号：${mediumRisks.join('、')}，局部冲突，可化解`);
  } else if (signals.length > 0) {
    jiShen = 18;
    evidence.push(`低风险信号：${signals.join('、')}，影响有限`);
  } else {
    jiShen = 22;
    evidence.push('无显著忌神冲击，命局相对平和');
  }

  // 3. 救应有无（20 分）
  const rescues = input.rescueSignals || [];
  if (input.brokenWithoutRescue === true) {
    rescue = 3;
    evidence.push('逢冲破无救应，判定为格低，需大器晚成');
  } else if (rescues.length > 0) {
    rescue = 16;
    evidence.push(`有救应：${rescues.join('、')}，虽暂破但能成`);
  } else {
    rescue = 12;
    evidence.push('救应未明确，按中等处理');
  }

  // 4. 用神有力（15 分）
  if (input.yongShenStrong === true) {
    yongShen = 13;
    evidence.push('用神透干得地，有力可用');
  } else if (input.yongShenStrong === false) {
    yongShen = 5;
    evidence.push('用神无力或受制，杠杆失灵');
  } else {
    yongShen = 9;
  }

  // 5. 五行中和度（10 分）
  if (input.wuXingExtreme === true) {
    wuXing = 2;
    evidence.push('五行严重偏枯，性格偏激，需注意对应脏腑健康');
  } else if (input.wuXingExtreme === false) {
    wuXing = 8;
    evidence.push('五行相对中和，性格平衡');
  } else {
    wuXing = 6;
  }

  const total = geJu + jiShen + rescue + yongShen + wuXing;
  const score = Math.max(1, Math.min(100, total));

  // 风险等级
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (highRisks.length > 0 || score < 40) {
    riskLevel = 'high';
  } else if (mediumRisks.length > 0 || score < 65) {
    riskLevel = 'medium';
  }

  return {
    score,
    evidence: evidence.slice(0, 3),
    breakdown: { geJu, jiShen, rescue, yongShen, wuXing },
    riskLevel,
  };
}

/**
 * 强制风险等级判定（v0.2 新增）
 *
 * 用于主链在 LLM 输出 riskLevel 后做规则强制覆盖：
 * - 主链拿到 LLM 输出的 jiShenSignals 后，调用本函数重判 riskLevel
 * - 若本函数返回与 LLM 输出不一致，以本函数结果为准（规则 > LLM 自评）
 *
 * 规则与 prompt-layers Layer 2 【强制规则】完全一致：
 * - 含七杀无制/羊刃逢冲/三刑/伤官见官/财坏印任一→high
 * - 含子午冲/卯酉冲/子未害/伏吟/比劫夺财任一→medium
 * - 其余→low
 */
export function enforceRiskLevel(jiShenSignals: string[]): 'low' | 'medium' | 'high' {
  const signals = jiShenSignals || [];
  const hasHigh = signals.some(s => HIGH_RISK_SIGNALS.includes(s));
  if (hasHigh) return 'high';
  const hasMedium = signals.some(s => MEDIUM_RISK_SIGNALS.includes(s));
  if (hasMedium) return 'medium';
  return 'low';
}

/**
 * 场景观察期模板
 */
export function getObservationPeriod(scenario: string): { months: number; conditions: string[] } {
  switch (scenario) {
    case '婚姻':
    case '感情':
      return {
        months: 3,
        conditions: [
          '言语带刺改为表达需求（伤官见官者）',
          '共同生活无重大冲突（夫妻宫逢冲者）',
          '财务透明且无隐瞒（财星受克者）',
        ],
      };
    case '事业':
      return {
        months: 6,
        conditions: [
          '新职位/新项目 3 个月内有正向反馈',
          '关键 KPI 达成 60% 以上',
          '与上级/合作方无重大冲突',
        ],
      };
    case '财运':
      return {
        months: 12,
        conditions: [
          '现金流为正且持续 6 个月',
          '无新增重大负债',
          '投资回报率达到预期',
        ],
      };
    case '子女':
      return {
        months: 9,
        conditions: [
          '子女健康无异常',
          '子女教育按计划推进',
          '亲子关系无重大冲突',
        ],
      };
    default:
      return {
        months: 6,
        conditions: [
          '目标指标达成 60% 以上',
          '无重大负面事件',
          '关键关系稳定',
        ],
      };
  }
}

/**
 * 场景红线模板
 */
export function getRedLines(scenario: string): string[] {
  switch (scenario) {
    case '婚姻':
    case '感情':
      return [
        '不共同贷款（财星受克年份）',
        '不冲动领证（夫妻宫逢冲年份）',
        '不仓促买房（大运凶时）',
      ];
    case '事业':
      return [
        '不与上级正面冲突（正官格）',
        '不在伤官见官年份换工作',
        '不在官杀混杂时同时押注体制内外',
      ];
    case '财运':
      return [
        '不替人担保（比劫夺财年份）',
        '不做高杠杆投资（财多身弱）',
        '不与朋友合伙大项目（偏财格）',
      ];
    case '子女':
      return [
        '不在子女宫逢冲年份强行推进子女重大决策',
        '不忽视子女星受克的信号',
        '不在孩子面前展现教育理念冲突',
      ];
    default:
      return [
        '不做超出能力边界的决策',
        '不在忌神年份做重大承诺',
      ];
  }
}

/**
 * 三窗口预测模板
 */
export function getThreeWindows(scenario: string): { near: string; mid: string; far: string } {
  const now = new Date();
  const year = now.getFullYear();

  switch (scenario) {
    case '婚姻':
    case '感情':
      return {
        near: `${year}-${year + 1}年：姻缘被引动，适合确认关系方向、见家长、谈规则`,
        mid: `${year + 2}-${year + 4}年：婚姻议题更重，前期规则没立好后期被动`,
        far: `${year + 5}-${year + 11}年：大运转换期，水火冲突可能更明显，需提前规划`,
      };
    case '事业':
      return {
        near: `${year}-${year + 1}年：当前岗位/项目的关键验证期`,
        mid: `${year + 2}-${year + 4}年：大运转换期，可能面临方向调整`,
        far: `${year + 5}-${year + 11}年：长期大运决定事业天花板`,
      };
    case '财运':
      return {
        near: `${year}-${year + 1}年：现金流压力期，重点在收款控成本`,
        mid: `${year + 2}-${year + 4}年：财气转折期，可能有旧资源再启动`,
        far: `${year + 5}-${year + 11}年：长期财运取决于格局成败`,
      };
    case '子女':
      return {
        near: `${year}-${year + 1}年：子女议题被推到台前`,
        mid: `${year + 2}-${year + 4}年：子女教育关键期`,
        far: `${year + 5}-${year + 11}年：子女独立发展期`,
      };
    default:
      return {
        near: `${year}-${year + 1}年：近期验证期`,
        mid: `${year + 2}-${year + 4}年：中期调整期`,
        far: `${year + 5}-${year + 11}年：长期定型期`,
      };
  }
}
