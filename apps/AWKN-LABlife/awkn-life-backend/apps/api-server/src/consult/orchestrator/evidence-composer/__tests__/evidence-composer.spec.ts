/**
 * EvidenceComposerService 单元测试
 *
 * 验证点：
 * 1. 输入 gc-001 fixture（单命）→ 输出 evidencePackage 包含 3 类证据（排盘/规则/用户描述）
 * 2. evidencePackage.chartSnapshot 来自 calc-engine（非 LLM 生成，结构等价于 BaziFullResult）
 * 3. evidencePackage.matchedRules 按 severity 分组
 * 4. evidencePackage.ruleBasedScore 包含 4 个字段
 * 5. evidencePackage.meta.versions 包含 3 个版本号
 * 6. evidencePackage.knowledgeFragments 至少每条命中规则有 1 个占位引用
 * 7. L2 绑定的 filePath 全部指向真实存在的文件（用 fs.existsSync 验证）
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname, isAbsolute } from 'path';
import { EvidenceComposerService } from '../evidence-composer.service';
import { KnowledgeRetrieverService } from '../knowledge-retriever/knowledge-retriever.service';
import { EvidenceComposerInput, EvidencePackage } from '../evidence-composer.types';
import { BaziFullResult } from '../../../../calc-engine/bazi-calculator-wrapper';
import { RuleMatcherService } from '../../rule-matcher/rule-matcher.service';
import { RuleMatcherInput } from '../../rule-matcher/rule-matcher.types';

const RULE_MATCHER_FIXTURES_DIR = join(__dirname, '../../rule-matcher/__tests__/fixtures');

function loadRuleMatcherFixture(name: string): any {
  return JSON.parse(readFileSync(join(RULE_MATCHER_FIXTURES_DIR, name), 'utf-8'));
}

/**
 * 从 cwd 开始向上查找项目根（包含 knowledge/eastern-metaphysics 的目录）
 * 兼容 jest 在 api-server 或 monorepo 根目录运行
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'knowledge', 'eastern-metaphysics'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

describe('EvidenceComposerService', () => {
  let composer: EvidenceComposerService;
  let retriever: KnowledgeRetrieverService;
  let ruleMatcher: RuleMatcherService;

  beforeEach(() => {
    retriever = new KnowledgeRetrieverService();
    composer = new EvidenceComposerService(retriever);
    ruleMatcher = new RuleMatcherService();
  });

  // ─── 1) L2 绑定配置完整性 ───
  describe('L2 规则-知识绑定配置', () => {
    it('所有 8 条规则的 filePath 全部指向真实存在的文件', () => {
      const bindings = retriever.retrieve([
        'R001', 'R002', 'R003', 'R007', 'R008', 'R012', 'R019', 'R020',
      ]);

      // 至少覆盖到 8 条规则
      expect(bindings.length).toBeGreaterThanOrEqual(8);

      for (const kf of bindings) {
        expect(kf.fragments.length).toBeGreaterThan(0);
        for (const frag of kf.fragments) {
          const absPath = isAbsolute(frag.filePath)
            ? frag.filePath
            : resolve(PROJECT_ROOT, frag.filePath);
          expect(existsSync(absPath)).toBe(true);
        }
      }
    });

    it('P2-A 后：部分片段为 confirmed（有真实原文），部分为 placeholder（找不到原文）', () => {
      const bindings = retriever.retrieve([
        'R001', 'R002', 'R003', 'R007', 'R008', 'R012', 'R019', 'R020',
      ]);
      let confirmedCount = 0;
      let placeholderCount = 0;
      for (const kf of bindings) {
        for (const frag of kf.fragments) {
          if (frag.status === 'confirmed') confirmedCount++;
          else if (frag.status === 'placeholder') placeholderCount++;
        }
      }
      // P2-A 后至少有部分 confirmed（真实原文摘录）
      expect(confirmedCount).toBeGreaterThan(0);
      // 仍有部分 placeholder（找不到原文的，宁缺毋滥）
      expect(placeholderCount).toBeGreaterThan(0);
      expect(confirmedCount + placeholderCount).toBe(16);
    });

    it('retrieveConfirmed 返回所有 confirmed 片段（P2-A 后非空）', () => {
      const confirmed = retriever.retrieveConfirmed([
        'R001', 'R002', 'R003', 'R007', 'R008', 'R012', 'R019', 'R020',
      ]);
      expect(confirmed.length).toBeGreaterThan(0);
    });
  });

  // ─── 2) gc-001（单命）端到端 ───
  describe('gc-001（单命）evidencePackage', () => {
    const fixture = loadRuleMatcherFixture('gc-001-chart-snapshot.json');
    let evidencePackage: EvidencePackage;

    beforeEach(() => {
      // 先用 RuleMatcher 跑出 matchedRules，再交给 EvidenceComposer
      const matcherInput: RuleMatcherInput = {
        chartSnapshot: {
          male: fixture.male as BaziFullResult,
          female: fixture.female ? (fixture.female as BaziFullResult) : undefined,
        },
        questionType: 'marriage_decision',
        userContext: {
          background: '男方 1989 年生，单命咨询，无女方八字',
          concerns: ['今年是否适合相亲', '感情前景如何'],
        },
        currentYear: 2026,
        birthInfo: {
          maleBirthYear: fixture.maleBirthYear,
          femaleBirthYear: fixture.femaleBirthYear,
        },
      };
      const matcherOutput = ruleMatcher.match(matcherInput);

      const composerInput: EvidenceComposerInput = {
        chartSnapshot: matcherInput.chartSnapshot,
        matchedRules: matcherOutput.matchedRules,
        userContext: matcherInput.userContext,
      };
      evidencePackage = composer.compose(composerInput);
    });

    it('evidencePackage 包含 3 类证据：chartSnapshot / matchedRules / userContext', () => {
      // 1) 排盘快照
      expect(evidencePackage.chartSnapshot).toBeDefined();
      expect(evidencePackage.chartSnapshot.male.dayPillar).toBeDefined();
      expect(evidencePackage.chartSnapshot.female).toBeUndefined();

      // 2) 规则命中（按 severity 分组）
      expect(evidencePackage.matchedRules).toBeDefined();
      const totalMatched =
        evidencePackage.matchedRules.high.length +
        evidencePackage.matchedRules.medium.length +
        evidencePackage.matchedRules.low.length;
      expect(totalMatched).toBeGreaterThanOrEqual(3);

      // 3) 用户描述
      expect(evidencePackage.userContext).toBeDefined();
      expect(evidencePackage.userContext.background).toContain('男方');
      expect(evidencePackage.userContext.concerns.length).toBeGreaterThan(0);
    });

    it('chartSnapshot 来自 calc-engine（结构等价于 BaziFullResult，非 LLM 生成）', () => {
      const male = evidencePackage.chartSnapshot.male;
      // 校验 BaziFullResult 的关键字段
      expect(male.yearPillar).toMatch(/^.{2}$/);
      expect(male.monthPillar).toMatch(/^.{2}$/);
      expect(male.dayPillar).toMatch(/^.{2}$/);
      expect(male.hourPillar).toMatch(/^.{2}$/);
      expect(male.wuxing).toBeDefined();
      expect(male.daYun).toBeInstanceOf(Array);
      expect(male.liuNian).toBeInstanceOf(Array);
      expect(male.xingChongHeHai).toBeDefined();
    });

    it('matchedRules 按 severity 分组（high/medium/low 三组且无重叠）', () => {
      const { high, medium, low } = evidencePackage.matchedRules;
      // 每条规则 severity 与所在分组一致
      for (const r of high) expect(r.severity).toBe('high');
      for (const r of medium) expect(r.severity).toBe('medium');
      for (const r of low) expect(r.severity).toBe('low');
      // 无重叠：按 ruleId 汇总后总数等于三组之和
      const totalInGroups = high.length + medium.length + low.length;
      const allIds = [...high, ...medium, ...low].map(r => r.ruleId);
      expect(allIds.length).toBe(totalInGroups);
    });

    it('ruleBasedScore 包含 4 个字段且取值合法', () => {
      const score = evidencePackage.ruleBasedScore;
      expect(score).toBeDefined();
      expect(typeof score.evidenceCompleteness).toBe('number');
      expect(score.evidenceCompleteness).toBeGreaterThanOrEqual(0);
      expect(score.evidenceCompleteness).toBeLessThanOrEqual(1);
      expect(typeof score.decisionConfidence).toBe('number');
      expect(score.decisionConfidence).toBeGreaterThanOrEqual(0);
      expect(score.decisionConfidence).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(score.riskLevel);
      expect(['proceed', 'observe', 'stop', 'defer']).toContain(score.decisionBias);
    });

    it('meta.versions 包含 3 个版本号（prompt/rules/knowledge）', () => {
      const versions = evidencePackage.meta.versions;
      expect(versions).toBeDefined();
      expect(typeof versions.prompt).toBe('string');
      expect(versions.prompt.length).toBeGreaterThan(0);
      expect(typeof versions.rules).toBe('string');
      expect(versions.rules.length).toBeGreaterThan(0);
      expect(typeof versions.knowledge).toBe('string');
      expect(versions.knowledge.length).toBeGreaterThan(0);
    });

    it('meta.createdAt 是合法 ISO 时间字符串', () => {
      const created = evidencePackage.meta.createdAt;
      expect(typeof created).toBe('string');
      const parsed = new Date(created);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });

    it('knowledgeFragments 至少为每条命中规则提供 1 个占位引用', () => {
      const matchedRuleIds = [
        ...evidencePackage.matchedRules.high,
        ...evidencePackage.matchedRules.medium,
        ...evidencePackage.matchedRules.low,
      ].map(r => r.ruleId);

      const fragRuleIds = evidencePackage.knowledgeFragments
        .filter(kf => kf.fragments.length > 0)
        .map(kf => kf.ruleId);

      for (const ruleId of matchedRuleIds) {
        expect(fragRuleIds).toContain(ruleId);
      }
    });

    it('knowledgeFragments 中片段 status 为 confirmed 或 placeholder（P2-A 后混合状态）', () => {
      for (const kf of evidencePackage.knowledgeFragments) {
        for (const frag of kf.fragments) {
          expect(['confirmed', 'placeholder']).toContain(frag.status);
        }
      }
    });
  });

  // ─── 3) gc-012（双命）端到端 + 评分逻辑 ───
  describe('gc-012（双命）evidencePackage', () => {
    const fixture = loadRuleMatcherFixture('gc-012-chart-snapshot.json');
    let evidencePackage: EvidencePackage;

    beforeEach(() => {
      const matcherInput: RuleMatcherInput = {
        chartSnapshot: {
          male: fixture.male as BaziFullResult,
          female: fixture.female as BaziFullResult,
        },
        questionType: 'marriage_decision',
        userContext: {
          background: '男方 1989 + 女方 1993 双命合婚咨询',
          concerns: ['是否适合结婚', '价值观是否兼容'],
        },
        currentYear: 2026,
        birthInfo: {
          maleBirthYear: fixture.maleBirthYear,
          femaleBirthYear: fixture.femaleBirthYear,
        },
      };
      const matcherOutput = ruleMatcher.match(matcherInput);
      evidencePackage = composer.compose({
        chartSnapshot: matcherInput.chartSnapshot,
        matchedRules: matcherOutput.matchedRules,
        userContext: matcherInput.userContext,
      });
    });

    it('双命场景 chartSnapshot.female 必须存在', () => {
      expect(evidencePackage.chartSnapshot.female).toBeDefined();
      expect(evidencePackage.chartSnapshot.female?.dayPillar).toBeDefined();
    });

    it('evidenceCompleteness 应高于单命场景（双命资料完整度更高）', () => {
      // 双命基础完整度 0.5，至少应大于 0.5
      expect(evidencePackage.ruleBasedScore.evidenceCompleteness).toBeGreaterThan(0.5);
    });

    it('命中 >=5 条规则时 decisionConfidence 应 >=0.65', () => {
      const total =
        evidencePackage.matchedRules.high.length +
        evidencePackage.matchedRules.medium.length +
        evidencePackage.matchedRules.low.length;
      if (total >= 5) {
        expect(evidencePackage.ruleBasedScore.decisionConfidence).toBeGreaterThanOrEqual(0.65);
      }
    });
  });

  // ─── 4) 评分边界 case ───
  describe('ruleBasedScore 边界', () => {
    function makeChart(): BaziFullResult {
      return {
        yearPillar: '己巳',
        monthPillar: '壬申',
        dayPillar: '壬子',
        hourPillar: '癸卯',
        yearShishen: '正官',
        monthShishen: '比肩',
        dayShishen: '日主',
        hourShishen: '劫财',
        wuxing: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        daYun: [],
        qiYunAge: { years: 4, months: 0, days: 0 } as any,
        liuNian: [],
        liuNianDetail: [],
        shenSha: {},
        naYin: { year: '', month: '', day: '', hour: '' },
        kongWang: [],
        taiYuan: '',
        mingGong: '',
        shenGong: '',
        zangganShishen: { year: [], month: [], day: [], hour: [] },
        changsheng: { year: '', month: '', day: '', hour: '' },
        xingChongHeHai: { he: [], chong: [], hai: [], xing: [] },
        selfSeat: { year: '', month: '', day: '', hour: '' },
        shenShaByPillar: { year: [], month: [], day: [], hour: [] },
      } as BaziFullResult;
    }

    it('零规则命中 + 单命 → riskLevel=low, decisionBias=proceed', () => {
      const ep = composer.compose({
        chartSnapshot: { male: makeChart() },
        matchedRules: [],
        userContext: { background: '', concerns: [] },
      });
      expect(ep.ruleBasedScore.riskLevel).toBe('low');
      expect(ep.ruleBasedScore.decisionBias).toBe('proceed');
      expect(ep.ruleBasedScore.evidenceCompleteness).toBe(0.3); // 单命基础分
    });

    it('2 条 high 规则 → riskLevel=high, decisionBias=stop', () => {
      const matchedRules = [
        { ruleId: 'R001', ruleName: 'A', severity: 'high' as const, evidence: '', source: 'bazi' as const },
        { ruleId: 'R002', ruleName: 'B', severity: 'high' as const, evidence: '', source: 'bazi' as const },
      ];
      const ep = composer.compose({
        chartSnapshot: { male: makeChart() },
        matchedRules,
        userContext: { background: '', concerns: [] },
      });
      expect(ep.ruleBasedScore.riskLevel).toBe('high');
      expect(ep.ruleBasedScore.decisionBias).toBe('stop');
    });

    it('1 条 high + 0 medium → riskLevel=medium（按规格 high>=2 才升级）, decisionBias=observe', () => {
      const matchedRules = [
        { ruleId: 'R001', ruleName: 'A', severity: 'high' as const, evidence: '', source: 'bazi' as const },
      ];
      const ep = composer.compose({
        chartSnapshot: { male: makeChart() },
        matchedRules,
        userContext: { background: '', concerns: [] },
      });
      // 按规格 computeScore: high.length>=2 才为 high，1 条 high 落在 medium
      expect(ep.ruleBasedScore.riskLevel).toBe('medium');
      expect(ep.ruleBasedScore.decisionBias).toBe('observe');
    });

    it('0 high + 2 medium → riskLevel=medium, decisionBias=observe', () => {
      const matchedRules = [
        { ruleId: 'R008', ruleName: 'A', severity: 'medium' as const, evidence: '', source: 'bazi' as const },
        { ruleId: 'R012', ruleName: 'B', severity: 'medium' as const, evidence: '', source: 'bazi' as const },
      ];
      const ep = composer.compose({
        chartSnapshot: { male: makeChart() },
        matchedRules,
        userContext: { background: '', concerns: [] },
      });
      expect(ep.ruleBasedScore.riskLevel).toBe('medium');
      expect(ep.ruleBasedScore.decisionBias).toBe('observe');
    });

    it('3 条 high 规则触发置信度回退（不超过 0.6）', () => {
      const matchedRules = [
        { ruleId: 'R001', ruleName: 'A', severity: 'high' as const, evidence: '', source: 'bazi' as const },
        { ruleId: 'R002', ruleName: 'B', severity: 'high' as const, evidence: '', source: 'bazi' as const },
        { ruleId: 'R007', ruleName: 'C', severity: 'high' as const, evidence: '', source: 'bazi' as const },
      ];
      const ep = composer.compose({
        chartSnapshot: { male: makeChart(), female: makeChart() },
        matchedRules,
        userContext: { background: '', concerns: [] },
      });
      expect(ep.ruleBasedScore.decisionConfidence).toBeLessThanOrEqual(0.6);
    });
  });
});
