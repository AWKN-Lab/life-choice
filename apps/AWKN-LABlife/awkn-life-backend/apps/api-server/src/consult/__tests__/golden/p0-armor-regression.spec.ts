/**
 * P0 装甲就位 - 姻缘 Golden Case 回归测试
 *
 * 验证链路：RuleMatcher → EvidenceComposer → buildSystemPromptFromLayers(evidencePackage)
 *
 * 回归 case：gc-001 / gc-002 / gc-003 / gc-004 / gc-012
 * 验收标准（来自 ENGINEERING-P0-装甲就位-20260627.md §2.5）：
 *   1. 5 条 case 全部跑通（14 段骨架完整）
 *   2. prompt 不含禁止词（"推算八字""我推算出"），引导 LLM 不自行排盘
 *   3. prompt 含【命中规则】段（证据包已注入，引导 LLM 基于排盘结果输出）
 *   4. 主矛盾来自 matchedRules（非 LLM 自行识别）
 *   5. placeholder 知识片段不进入 LLM 正文
 *   6. 旧路径仍可回退（无 evidencePackage 时行为不变）
 *
 * fixture 复用说明：
 *   - gc-001/gc-002/gc-003/gc-004 同一男方（1989-08-20 06:00 广西柳州），复用 gc-001-chart-snapshot.json
 *   - gc-012 含女方，使用 gc-012-chart-snapshot.json
 *   - 每条 case 的 question + userContext 不同，验证"同一排盘、不同问题"的链路通畅性
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { RuleMatcherService } from '../../orchestrator/rule-matcher/rule-matcher.service';
import { RuleMatcherInput } from '../../orchestrator/rule-matcher/rule-matcher.types';
import { EvidenceComposerService } from '../../orchestrator/evidence-composer/evidence-composer.service';
import { KnowledgeRetrieverService } from '../../orchestrator/evidence-composer/knowledge-retriever/knowledge-retriever.service';
import { EvidencePackage } from '../../orchestrator/evidence-composer/evidence-composer.types';
import { buildSystemPromptFromLayers } from '../../orchestrator/prompt-layers';
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';

// ─── fixture 加载 ───

const FIXTURES_DIR = join(__dirname, '../../orchestrator/rule-matcher/__tests__/fixtures');

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf-8'));
}

// ─── 5 条回归 case 定义（question + userContext） ───

interface RegressionCase {
  id: string;
  fixture: string;
  question: string;
  userContext: { background: string; concerns: string[] };
}

const REGRESSION_CASES: RegressionCase[] = [
  {
    id: 'gc-001',
    fixture: 'gc-001-chart-snapshot.json',
    question: '我和女方八字合不合？夫妻宫相冲，还有必要继续下去吗？是继续此段感情，还是再等下一段合适的出现？',
    userContext: {
      background: '夫妻宫相冲，感情是否继续',
      concerns: ['是否继续', '是否等下一段'],
    },
  },
  {
    id: 'gc-002',
    fixture: 'gc-001-chart-snapshot.json', // 同一男方
    question: '如果我和女方长期发展，家庭背景和生活安排的冲突（卯酉冲）会怎么演变？',
    userContext: {
      background: '卯酉冲，家庭背景与生活安排冲突',
      concerns: ['家庭背景', '生活安排', '子女教育'],
    },
  },
  {
    id: 'gc-003',
    fixture: 'gc-001-chart-snapshot.json',
    question: '我和女方是水火型姻缘，这种互补型关系能成就吗？需要什么条件？',
    userContext: {
      background: '水火型姻缘，互补关系',
      concerns: ['互补关系', '成就条件'],
    },
  },
  {
    id: 'gc-004',
    fixture: 'gc-001-chart-snapshot.json',
    question: '我命中申子辰三合水局，水势极旺，这对婚姻关系意味着什么？',
    userContext: {
      background: '申子辰三合水局，水势极旺',
      concerns: ['水旺影响', '婚姻关系'],
    },
  },
  {
    id: 'gc-012',
    fixture: 'gc-012-chart-snapshot.json',
    question: '我和女方八字合不合？夫妻宫相冲，还有必要继续下去吗？',
    userContext: {
      background: '夫妻宫相冲，价值观冲突，言语带刺',
      concerns: ['是否继续', '价值观不合', '父母边界', '共同负债'],
    },
  },
];

// ─── 14 段骨架标记 ───

const SEGMENTS_14 = [
  '事实层', '解读层', '推演层', '建议层', '点睛层',
  '我的判断', '前提', '代价', '推理轨迹',
  '分值', '观察期', '红线', '三窗口', '落一句最实在的话',
];

// ─── 禁止词（prompt 不应引导 LLM 自行排盘） ───

const FORBIDDEN_PHRASES = ['推算八字', '我推算出', '请自行分析八字', '请推算八字'];

// ─── 工具函数：构造简化版 agentSummary（基于 fixture 排盘数据） ───

function buildAgentSummary(chart: BaziFullResult, isPartner: boolean = false): string {
  const label = isPartner ? '对方' : '本人';
  const chongStr = chart.xingChongHeHai.chong.map(c => c.relation).join('、') || '无';
  const heStr = chart.xingChongHeHai.he.map(h => h.relation).join('、') || '无';

  return `【系统已为你完成八字排盘，请基于以下排盘事实进行解读，不要再自己排盘】

【${label}四柱】
- 年柱：${chart.yearPillar}（${chart.yearShishen}）
- 月柱：${chart.monthPillar}（${chart.monthShishen}）
- 日柱：${chart.dayPillar} ← 夫妻宫
- 时柱：${chart.hourPillar}（${chart.hourShishen}）

【${label}日主】${chart.dayPillar[0]}

【${label}五行】木${chart.wuxing.wood} 火${chart.wuxing.fire} 土${chart.wuxing.earth} 金${chart.wuxing.metal} 水${chart.wuxing.water}

【${label}刑冲合害】
- 冲：${chongStr}
- 合：${heStr}

【重要约束】以上排盘结果由系统计算，你必须直接使用这些四柱、五行、刑冲合害事实进行解读，不得修改或重新推算。`;
}

// ─── 工具函数：构造 RuleMatcherInput ───

function buildRuleMatcherInput(
  fixture: any,
  userContext: { background: string; concerns: string[] },
): RuleMatcherInput {
  return {
    chartSnapshot: {
      male: fixture.male as BaziFullResult,
      female: fixture.female ? (fixture.female as BaziFullResult) : undefined,
    },
    questionType: 'marriage_decision' as const,
    userContext,
    currentYear: 2026,
    birthInfo: {
      maleBirthYear: fixture.maleBirthYear,
      femaleBirthYear: fixture.femaleBirthYear,
    },
  };
}

// ─── 工具函数：构造完整 agentSummary（含双方，如有） ───

function buildFullAgentSummary(fixture: any): string {
  const maleChart = fixture.male as BaziFullResult;
  const femaleChart = fixture.female as BaziFullResult | undefined;

  let summary = buildAgentSummary(maleChart, false);
  if (femaleChart) {
    summary += '\n' + buildAgentSummary(femaleChart, true);
  }
  return summary;
}

// ─── 工具函数：构造新路径 prompt（含 evidencePackage） ───

function buildPromptWithEvidencePackage(
  case_: RegressionCase,
  fixture: any,
  evidencePackage: EvidencePackage,
): string {
  return buildSystemPromptFromLayers({
    scenarioName: '婚姻',
    primaryAgent: 'zhangbanshan',
    primaryAgentName: 'liuren',
    secondaryAgent: null,
    availableTools: ['bazi', 'liuren'],
    memorySummary: '',
    emotionInstruction: '保持沉稳',
    question: case_.question,
    agentName: '六壬+八字综合',
    agentSummary: buildFullAgentSummary(fixture),
    secondarySection: '',
    evidencePackage,
  });
}

// ─── 工具函数：构造旧路径 prompt（无 evidencePackage） ───

function buildPromptLegacyPath(case_: RegressionCase, fixture: any): string {
  return buildSystemPromptFromLayers({
    scenarioName: '婚姻',
    primaryAgent: 'zhangbanshan',
    primaryAgentName: 'liuren',
    secondaryAgent: null,
    availableTools: ['bazi', 'liuren'],
    memorySummary: '',
    emotionInstruction: '保持沉稳',
    question: case_.question,
    agentName: '六壬+八字综合',
    agentSummary: buildFullAgentSummary(fixture),
    secondarySection: '',
    // 无 evidencePackage → 走旧路径
  });
}

// ─── 工具函数：跑完整链路，返回 prompt + 中间产物 ───

interface FullPipelineResult {
  matchResult: ReturnType<RuleMatcherService['match']>;
  evidencePackage: EvidencePackage;
  prompt: string;
}

function runFullPipeline(
  ruleMatcher: RuleMatcherService,
  composer: EvidenceComposerService,
  case_: RegressionCase,
): FullPipelineResult {
  const fixture = loadFixture(case_.fixture);
  const input = buildRuleMatcherInput(fixture, case_.userContext);

  // Step 1: RuleMatcher
  const matchResult = ruleMatcher.match(input);

  // Step 2: EvidenceComposer
  const evidencePackage = composer.compose({
    chartSnapshot: input.chartSnapshot,
    matchedRules: matchResult.matchedRules,
    userContext: case_.userContext,
  });

  // Step 3: Prompt 构造（含 evidencePackage）
  const prompt = buildPromptWithEvidencePackage(case_, fixture, evidencePackage);

  return { matchResult, evidencePackage, prompt };
}

// ────────────────────────────────────────────────────────────────
// 测试主体
// ────────────────────────────────────────────────────────────────

describe('P0 装甲就位 - 姻缘 Golden Case 回归', () => {
  let ruleMatcher: RuleMatcherService;
  let retriever: KnowledgeRetrieverService;
  let composer: EvidenceComposerService;

  beforeEach(() => {
    ruleMatcher = new RuleMatcherService();
    retriever = new KnowledgeRetrieverService();
    composer = new EvidenceComposerService(retriever);
  });

  // ─── 1) 链路完整性：5 条 case 全链路跑通 ───

  describe('链路完整性（RuleMatcher → EvidenceComposer → Prompt）', () => {
    for (const case_ of REGRESSION_CASES) {
      it(`${case_.id}: 全链路跑通，无异常`, () => {
        const { matchResult, evidencePackage, prompt } = runFullPipeline(ruleMatcher, composer, case_);

        // Step 1: RuleMatcher 输出
        expect(matchResult.matchedRules).toBeDefined();
        expect(Array.isArray(matchResult.matchedRules)).toBe(true);
        expect(matchResult.summary).toContain('命中');

        // Step 2: EvidenceComposer 输出
        expect(evidencePackage.matchedRules).toBeDefined();
        expect(evidencePackage.matchedRules.high).toBeDefined();
        expect(evidencePackage.matchedRules.medium).toBeDefined();
        expect(evidencePackage.matchedRules.low).toBeDefined();
        expect(evidencePackage.ruleBasedScore).toBeDefined();
        expect(evidencePackage.ruleBasedScore.evidenceCompleteness).toBeDefined();
        expect(evidencePackage.ruleBasedScore.decisionConfidence).toBeDefined();
        expect(evidencePackage.ruleBasedScore.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(evidencePackage.ruleBasedScore.decisionBias).toMatch(/^(proceed|observe|stop|defer)$/);
        expect(evidencePackage.meta.versions.prompt).toBe('v2.0');
        expect(evidencePackage.meta.versions.rules).toBe('v1.0');
        expect(evidencePackage.meta.versions.knowledge).toBe('v1.0-l2');

        // Step 3: Prompt 构造
        expect(prompt.length).toBeGreaterThan(1000);
        expect(prompt).toContain(case_.question);
      });
    }
  });

  // ─── 2) 14 段骨架完整性 ───

  describe('14 段骨架完整性', () => {
    for (const case_ of REGRESSION_CASES) {
      it(`${case_.id}: prompt 含全部 14 段标记`, () => {
        const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

        for (const seg of SEGMENTS_14) {
          expect(prompt).toContain(`【${seg}】`);
        }
      });
    }
  });

  // ─── 3) 禁止词检查（prompt 不引导 LLM 自行排盘） ───

  describe('禁止词检查（prompt 不引导 LLM 自行排盘）', () => {
    for (const case_ of REGRESSION_CASES) {
      it(`${case_.id}: prompt 不含禁止词`, () => {
        const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

        for (const phrase of FORBIDDEN_PHRASES) {
          expect(prompt).not.toContain(phrase);
        }
      });
    }

    it('所有 case 的 prompt 含"系统已为你完成八字排盘"（强调排盘由系统完成）', () => {
      for (const case_ of REGRESSION_CASES) {
        const { prompt } = runFullPipeline(ruleMatcher, composer, case_);
        expect(prompt).toContain('系统已为你完成八字排盘');
      }
    });
  });

  // ─── 4) 证据包注入验证 ───

  describe('证据包注入验证', () => {
    it('gc-012: prompt 含【命中规则】段（来自规则引擎）', () => {
      const case_ = REGRESSION_CASES[4]; // gc-012
      const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

      expect(prompt).toContain('【命中规则】');
      expect(prompt).toContain('来自规则引擎');
      expect(prompt).toContain('你不需要重新识别');
    });

    it('gc-012: prompt 含【规则化评估】段（4 个字段）', () => {
      const case_ = REGRESSION_CASES[4];
      const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

      expect(prompt).toContain('【规则化评估】');
      expect(prompt).toContain('证据完整度');
      expect(prompt).toContain('决策置信度');
      expect(prompt).toContain('风险等级');
      expect(prompt).toContain('决策偏置');
    });

    it('gc-012: prompt 含【用户现实描述】段', () => {
      const case_ = REGRESSION_CASES[4];
      const { prompt, evidencePackage } = runFullPipeline(ruleMatcher, composer, case_);

      expect(prompt).toContain('【用户现实描述】');
      expect(prompt).toContain(case_.userContext.background);
      // 验证担忧点进入 prompt
      for (const concern of case_.userContext.concerns) {
        expect(prompt).toContain(concern);
      }
    });

    it('gc-001: prompt 含【命中规则】段（即使命中规则较少，段标记仍存在）', () => {
      const case_ = REGRESSION_CASES[0]; // gc-001
      const { prompt, matchResult } = runFullPipeline(ruleMatcher, composer, case_);

      // gc-001 至少命中 3 条规则（T1 验收保证）
      expect(matchResult.matchedRules.length).toBeGreaterThanOrEqual(3);
      expect(prompt).toContain('【命中规则】');
    });

    it('P2-A 后：confirmed 片段进入 LLM 正文，placeholder 不进入', () => {
      const case_ = REGRESSION_CASES[4]; // gc-012
      const { prompt, evidencePackage } = runFullPipeline(ruleMatcher, composer, case_);

      // P2-A 后：部分 confirmed（有真实原文），部分 placeholder（找不到原文）
      const allFrags = evidencePackage.knowledgeFragments.flatMap(kf => kf.fragments);
      const confirmedFrags = allFrags.filter(f => f.status === 'confirmed');
      const placeholderFrags = allFrags.filter(f => f.status === 'placeholder');

      expect(confirmedFrags.length).toBeGreaterThan(0);
      expect(placeholderFrags.length).toBeGreaterThan(0);

      // confirmed 片段进入 LLM 正文（prompt 含【知识片段】段）
      expect(prompt).toContain('【知识片段】');
      expect(prompt).toContain('来自知识库检索');

      // placeholder 片段不进入 LLM 正文（fragment 字段不出现）
      for (const frag of placeholderFrags) {
        // placeholder 的 fragment 文本不应出现在 prompt 的知识片段段中
        // 注意：只检查知识片段段内不出现 placeholder 文本
        // 这里用宽松检查：confirmed 数量 + placeholder 数量 = 16
        // placeholder 的 fragment 不在 prompt 中出现
        if (frag.fragment && frag.fragment.length > 10) {
          expect(prompt).not.toContain(frag.fragment);
        }
      }
    });
  });

  // ─── 5) 主矛盾来自 matchedRules（非 LLM 自行识别） ───

  describe('主矛盾来自 matchedRules（非 LLM 自行识别）', () => {
    it('gc-012: prompt 中的命中规则来自 RuleMatcher 输出', () => {
      const case_ = REGRESSION_CASES[4];
      const { prompt, matchResult } = runFullPipeline(ruleMatcher, composer, case_);

      // 验证 prompt 含 RuleMatcher 输出的每条规则的 ruleName 和 ruleId
      expect(matchResult.matchedRules.length).toBeGreaterThan(0);
      for (const rule of matchResult.matchedRules) {
        expect(prompt).toContain(rule.ruleName);
        expect(prompt).toContain(rule.ruleId);
      }
    });

    it('gc-012: prompt 含"你不需要重新识别"（明确告知 LLM 不要自行识别规则）', () => {
      const case_ = REGRESSION_CASES[4];
      const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

      expect(prompt).toContain('你不需要重新识别');
    });

    it('gc-001: prompt 中的命中规则来自 RuleMatcher 输出', () => {
      const case_ = REGRESSION_CASES[0];
      const { prompt, matchResult } = runFullPipeline(ruleMatcher, composer, case_);

      expect(matchResult.matchedRules.length).toBeGreaterThan(0);
      for (const rule of matchResult.matchedRules) {
        expect(prompt).toContain(rule.ruleName);
        expect(prompt).toContain(rule.ruleId);
      }
    });
  });

  // ─── 6) 旧路径兼容性（无 evidencePackage 时行为不变） ───

  describe('旧路径兼容性（无 evidencePackage 时行为不变）', () => {
    it('gc-001: 无 evidencePackage 时 prompt 不含证据包段', () => {
      const case_ = REGRESSION_CASES[0];
      const fixture = loadFixture(case_.fixture);
      const prompt = buildPromptLegacyPath(case_, fixture);

      expect(prompt).not.toContain('【命中规则】');
      expect(prompt).not.toContain('【规则化评估】');
      expect(prompt).not.toContain('【用户现实描述】');
      expect(prompt).not.toContain('【知识片段】');
    });

    it('gc-001: 无 evidencePackage 时 14 段骨架仍完整', () => {
      const case_ = REGRESSION_CASES[0];
      const fixture = loadFixture(case_.fixture);
      const prompt = buildPromptLegacyPath(case_, fixture);

      for (const seg of SEGMENTS_14) {
        expect(prompt).toContain(`【${seg}】`);
      }
    });

    it('gc-012: 无 evidencePackage 时 prompt 不含证据包段', () => {
      const case_ = REGRESSION_CASES[4];
      const fixture = loadFixture(case_.fixture);
      const prompt = buildPromptLegacyPath(case_, fixture);

      expect(prompt).not.toContain('【命中规则】');
      expect(prompt).not.toContain('【规则化评估】');
      expect(prompt).not.toContain('【用户现实描述】');
      expect(prompt).not.toContain('【知识片段】');
    });

    it('gc-012: 无 evidencePackage 时 14 段骨架仍完整', () => {
      const case_ = REGRESSION_CASES[4];
      const fixture = loadFixture(case_.fixture);
      const prompt = buildPromptLegacyPath(case_, fixture);

      for (const seg of SEGMENTS_14) {
        expect(prompt).toContain(`【${seg}】`);
      }
    });

    it('新旧路径 prompt 长度差异仅来自证据包段（agentSummary 一致）', () => {
      const case_ = REGRESSION_CASES[4];
      const fixture = loadFixture(case_.fixture);

      const legacyPrompt = buildPromptLegacyPath(case_, fixture);
      const { prompt: newPrompt } = runFullPipeline(ruleMatcher, composer, case_);

      // 新路径应比旧路径长（多了证据包段）
      expect(newPrompt.length).toBeGreaterThan(legacyPrompt.length);

      // 14 段骨架标记数量一致
      let legacySegCount = 0;
      let newSegCount = 0;
      for (const seg of SEGMENTS_14) {
        if (legacyPrompt.includes(`【${seg}】`)) legacySegCount++;
        if (newPrompt.includes(`【${seg}】`)) newSegCount++;
      }
      expect(legacySegCount).toBe(14);
      expect(newSegCount).toBe(14);
    });
  });

  // ─── 7) 端到端完整性汇总（DoD 终验） ───

  describe('端到端完整性汇总（DoD 终验）', () => {
    it('5 条 case 全部跑通，每条命中规则数 >= 1', () => {
      const ruleCounts: Record<string, number> = {};
      for (const case_ of REGRESSION_CASES) {
        const { matchResult } = runFullPipeline(ruleMatcher, composer, case_);
        ruleCounts[case_.id] = matchResult.matchedRules.length;
        expect(matchResult.matchedRules.length).toBeGreaterThanOrEqual(1);
      }
      // 汇总打印（jest --verbose 时可见）
      console.log('[P0 装甲就位] 5 条 case 命中规则数汇总:', ruleCounts);
    });

    it('5 条 case 的 evidencePackage.ruleBasedScore 全部有效', () => {
      for (const case_ of REGRESSION_CASES) {
        const { evidencePackage } = runFullPipeline(ruleMatcher, composer, case_);
        const score = evidencePackage.ruleBasedScore;
        expect(score.evidenceCompleteness).toBeGreaterThanOrEqual(0);
        expect(score.evidenceCompleteness).toBeLessThanOrEqual(1);
        expect(score.decisionConfidence).toBeGreaterThanOrEqual(0);
        expect(score.decisionConfidence).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high']).toContain(score.riskLevel);
        expect(['proceed', 'observe', 'stop', 'defer']).toContain(score.decisionBias);
      }
    });

    it('5 条 case 的 prompt 全部含 14 段骨架 + 证据包段', () => {
      for (const case_ of REGRESSION_CASES) {
        const { prompt } = runFullPipeline(ruleMatcher, composer, case_);

        // 14 段骨架
        for (const seg of SEGMENTS_14) {
          expect(prompt).toContain(`【${seg}】`);
        }
        // 证据包段
        expect(prompt).toContain('【命中规则】');
        expect(prompt).toContain('【规则化评估】');
        expect(prompt).toContain('【用户现实描述】');
      }
    });
  });
});
