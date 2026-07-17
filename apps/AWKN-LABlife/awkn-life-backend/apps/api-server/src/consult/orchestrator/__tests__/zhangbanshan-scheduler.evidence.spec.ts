/**
 * P1-B 主链路全场景接入 evidencePackage 测试
 *
 * 验证点：
 * 1. EVIDENCE_PACKAGE_ENABLED=true + chartSnapshot + 3 服务注入 → prompt 含【命中规则】段
 * 2. EVIDENCE_PACKAGE_ENABLED=false → 行为不变（prompt 不含【命中规则】段）
 * 3. chartSnapshot 缺失 → 降级到旧路径
 * 4. RuleMatcher 异常 → 降级到旧路径，不崩溃
 * 5. 构造函数未注入 3 服务（@Optional）→ 降级到旧路径
 *
 * fixture：复用 rule-matcher 的 gc-001-chart-snapshot.json（单命男方）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { jest } from '@jest/globals';

// ─── 在 import service 之前设置环境变量 ───
// 注意：process.env 必须在模块加载前设置，否则 service 内的常量已固化

import { ZhangbanshanSchedulerService } from '../zhangbanshan-scheduler.service';
import { SchedulingDecision } from '../zhangbanshan-scheduler.service';
import { RuleMatcherService } from '../rule-matcher/rule-matcher.service';
import { EvidenceComposerService } from '../evidence-composer/evidence-composer.service';
import { KnowledgeRetrieverService } from '../evidence-composer/knowledge-retriever/knowledge-retriever.service';
import { GatewayOutput } from '../../../llm-gateway/llm-gateway.service';
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';

// ─── fixture 加载 ───

const FIXTURES_DIR = join(__dirname, '../rule-matcher/__tests__/fixtures');

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf-8'));
}

const gc001Fixture = loadFixture('gc-001-chart-snapshot.json');
const maleChart = gc001Fixture.male as BaziFullResult;

// ─── Mock 工厂 ───

function createMockLlmProviders() {
  return {
    chatCheap: jest.fn<any>().mockResolvedValue({
      content: '【我的判断】测试判断\n【前提】测试前提\n【代价】这意味着——测试代价\n【推理轨迹】测试推理',
      model: 'test-model',
      usage: { total_tokens: 100 },
    }),
    chatStream: jest.fn<any>(),
  } as any;
}

function createMockUserMemoryService() {
  return {
    searchRelevantMemory: jest.fn<any>().mockResolvedValue({
      summary: '',
      hits: [],
    }),
    buildMemoryAnchor: jest.fn<any>().mockResolvedValue(undefined),
  } as any;
}

// ─── 通用 SchedulingDecision ───

const baseDecision: SchedulingDecision = {
  primaryAgent: 'ziping',
  secondaryAgent: undefined,
  needClarify: false,
  clarifyingQuestion: undefined,
  scheduleReason: '婚姻场景测试：夫妻宫相冲分析',
  toolCombo: 'marriage_combo',
  toolNames: ['bazi'],
  mode: 'deep_consult',
  confidence: 0.85,
};

const primaryOutput: GatewayOutput = {
  summary_line: '男方壬水日主，夫妻宫子',
  summary_body: '【系统已为你完成八字排盘】男方四柱：年柱己酉 月柱壬申 日柱壬子 时柱癸卯',
  evidence_fold: '',
  actions: [],
} as any;

// ─── 工具函数：从 mock chatCheap 调用中提取 systemPrompt ───

function extractSystemPrompt(mockLlm: any): string {
  const calls = mockLlm.chatCheap.mock.calls;
  if (calls.length === 0) throw new Error('chatCheap was not called');
  const messages = calls[0][0] as Array<{ role: string; content: string }>;
  return messages[0].content;
}

// ────────────────────────────────────────────────────────────────
// 测试主体
// ────────────────────────────────────────────────────────────────

describe('P1-B 主链路全场景接入 evidencePackage', () => {
  let mockLlm: any;
  let mockUserMemory: any;
  let ruleMatcher: RuleMatcherService;
  let retriever: KnowledgeRetrieverService;
  let composer: EvidenceComposerService;

  beforeEach(() => {
    mockLlm = createMockLlmProviders();
    mockUserMemory = createMockUserMemoryService();
    ruleMatcher = new RuleMatcherService();
    retriever = new KnowledgeRetrieverService();
    composer = new EvidenceComposerService(retriever);
    // 清理环境变量
    delete process.env.EVIDENCE_PACKAGE_ENABLED;
  });

  afterEach(() => {
    delete process.env.EVIDENCE_PACKAGE_ENABLED;
  });

  // ─── 1) 灰度开启 + chartSnapshot + 3 服务注入 → evidencePackage 注入成功 ───

  it('EVIDENCE_PACKAGE_ENABLED=true + chartSnapshot + 3 服务注入 → prompt 含【命中规则】段', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined, // classifierService
      ruleMatcher,
      composer,
      retriever,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？夫妻宫相冲，还有必要继续下去吗？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart }, // chartSnapshot
    );

    const systemPrompt = extractSystemPrompt(mockLlm);
    // 证据包已注入 → prompt 含【命中规则】段
    expect(systemPrompt).toContain('【命中规则】');
    expect(systemPrompt).toContain('来自规则引擎');
    expect(systemPrompt).toContain('【规则化评估】');
    expect(systemPrompt).toContain('证据完整度');
  });

  // ─── 2) 灰度关闭 → 行为不变（旧路径） ───

  it('EVIDENCE_PACKAGE_ENABLED=false → prompt 不含【命中规则】段（行为不变）', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'false';
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    const systemPrompt = extractSystemPrompt(mockLlm);
    // 灰度关闭 → 走旧路径，prompt 不含证据包相关段
    expect(systemPrompt).not.toContain('【命中规则】');
    expect(systemPrompt).not.toContain('来自规则引擎');
  });

  // ─── 3) 环境变量未设置 → 行为不变（默认旧路径） ───

  it('EVIDENCE_PACKAGE_ENABLED 未设置 → 默认走旧路径（行为不变）', async () => {
    // 不设置 process.env.EVIDENCE_PACKAGE_ENABLED
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    const systemPrompt = extractSystemPrompt(mockLlm);
    expect(systemPrompt).not.toContain('【命中规则】');
  });

  // ─── 4) chartSnapshot 缺失 → 降级到旧路径 ───

  it('chartSnapshot=undefined → 降级到旧路径，prompt 不含【命中规则】段', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      undefined, // chartSnapshot 缺失
    );

    const systemPrompt = extractSystemPrompt(mockLlm);
    expect(systemPrompt).not.toContain('【命中规则】');
  });

  // ─── 5) 构造函数未注入 3 服务（@Optional）→ 降级到旧路径 ───

  it('构造函数未注入 RuleMatcher/EvidenceComposer → 降级到旧路径，不崩溃', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    // 只注入 llm + userMemory，不注入后 3 个服务（模拟旧调用方）
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      // ruleMatcher / composer / retriever 全部 undefined
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    const systemPrompt = extractSystemPrompt(mockLlm);
    // 服务未注入 → 走旧路径
    expect(systemPrompt).not.toContain('【命中规则】');
  });

  // ─── 6) RuleMatcher 异常 → 降级到旧路径，不崩溃 ───

  it('RuleMatcher.match 抛异常 → 降级到旧路径，synthesizeThreeStage 不抛出', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    // 用一个坏掉的 RuleMatcher（match 抛异常）
    const badRuleMatcher = {
      match: jest.fn<any>().mockImplementation(() => {
        throw new Error('模拟 RuleMatcher 内部错误');
      }),
    } as unknown as RuleMatcherService;

    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      badRuleMatcher,
      composer,
      retriever,
    );

    // 不应抛出异常
    const output = await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    // 降级到旧路径，仍能返回正常输出
    expect(output).toBeDefined();
    expect(output.judgment).toBeDefined();
    const systemPrompt = extractSystemPrompt(mockLlm);
    expect(systemPrompt).not.toContain('【命中规则】');
  });

  // ─── 7) 灰度开启 + 事业场景 questionType 映射 ───

  it('EVIDENCE_PACKAGE_ENABLED=true + 事业场景 scheduleReason → questionType 映射为 career_decision', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
    );

    const careerDecision: SchedulingDecision = {
      ...baseDecision,
      scheduleReason: '事业场景测试：当前工作是否适合跳槽',
    };

    await service.synthesizeThreeStage(
      '我现在的工作要不要跳槽？',
      careerDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    // 事业场景也能注入 evidencePackage（全场景接入）
    const systemPrompt = extractSystemPrompt(mockLlm);
    expect(systemPrompt).toContain('【命中规则】');
  });
});

// ────────────────────────────────────────────────────────────────
// P2-B: AgentRun 调用点埋点测试
// ────────────────────────────────────────────────────────────────

describe('P2-B AgentRun 调用点埋点', () => {
  let mockLlm: any;
  let mockUserMemory: any;
  let ruleMatcher: RuleMatcherService;
  let retriever: KnowledgeRetrieverService;
  let composer: EvidenceComposerService;

  beforeEach(() => {
    mockLlm = createMockLlmProviders();
    mockUserMemory = createMockUserMemoryService();
    ruleMatcher = new RuleMatcherService();
    retriever = new KnowledgeRetrieverService();
    composer = new EvidenceComposerService(retriever);
    delete process.env.EVIDENCE_PACKAGE_ENABLED;
  });

  afterEach(() => {
    delete process.env.EVIDENCE_PACKAGE_ENABLED;
  });

  // ─── 1) 灰度开启 + AgentRunLogger 注入 → 3 处埋点都被调用 ───

  it('EVIDENCE_PACKAGE_ENABLED=true + AgentRunLogger 注入 → RuleMatcher/EvidenceComposer/LLM 三处埋点', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const mockAgentRunLogger = { log: jest.fn<any>() };
    const { AgentRunLogger } = await import('../agent-run/agent-run-logger');
    const realLogger = new AgentRunLogger();

    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
      realLogger,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？夫妻宫相冲',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user-p2b',
      undefined,
      false,
      { male: maleChart },
    );

    // 验证 AgentRunLogger.log 被调用了至少 3 次（RuleMatcher + EvidenceComposer + LLM）
    // 注意：realLogger.log 是真实写文件，这里只验证不抛异常即可
    // 用 spy 验证
    const logSpy = jest.spyOn(realLogger, 'log');
    // 重新跑一次以触发 spy
    await service.synthesizeThreeStage(
      '我和女方八字合不合？夫妻宫相冲',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user-p2b-2',
      undefined,
      false,
      { male: maleChart },
    );
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

    // 验证埋点内容：第一次是 RuleMatcher
    const ruleMatcherCall = logSpy.mock.calls.find(
      (call: any[]) => call[0]?.agentName === 'RuleMatcher',
    );
    expect(ruleMatcherCall).toBeDefined();
    expect(ruleMatcherCall[0].status).toBe('success');
    expect(ruleMatcherCall[0].matchedRules).toBeDefined();

    // 验证埋点内容：EvidenceComposer
    const composerCall = logSpy.mock.calls.find(
      (call: any[]) => call[0]?.agentName === 'EvidenceComposer',
    );
    expect(composerCall).toBeDefined();
    expect((composerCall[0].outputJson as any).evidenceCompleteness).toBeDefined();

    // 验证埋点内容：LLM（agentName = primaryAgent = 'ziping'）
    const llmCall = logSpy.mock.calls.find(
      (call: any[]) => call[0]?.agentName === 'ziping',
    );
    expect(llmCall).toBeDefined();
    expect(llmCall[0].status).toBe('success');
    expect(llmCall[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  // ─── 2) AgentRunLogger 未注入 → 不崩溃，主链路正常 ───

  it('AgentRunLogger 未注入 → synthesizeThreeStage 正常返回，不崩溃', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
      // agentRunLogger 不传
    );

    const output = await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    expect(output).toBeDefined();
    expect(output.judgment).toBeDefined();
  });

  // ─── 3) AgentRunLogger.log 抛异常 → 不阻断主链路 ───

  it('AgentRunLogger.log 抛异常 → synthesizeThreeStage 仍正常返回', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'true';
    const badLogger = {
      log: jest.fn<any>().mockImplementation(() => {
        throw new Error('模拟日志写入失败');
      }),
    } as any;

    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
      badLogger,
    );

    // 不应抛出异常
    const output = await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    // 主链路仍正常返回
    expect(output).toBeDefined();
    expect(output.judgment).toBeDefined();
    // badLogger.log 被调用过（尝试埋点）
    expect(badLogger.log.mock.calls.length).toBeGreaterThan(0);
  });

  // ─── 4) 灰度关闭时 LLM 埋点仍触发（LLM 埋点不依赖 evidencePackage） ───

  it('EVIDENCE_PACKAGE_ENABLED=false → LLM 埋点仍触发（不依赖 evidencePackage）', async () => {
    process.env.EVIDENCE_PACKAGE_ENABLED = 'false';
    const { AgentRunLogger } = await import('../agent-run/agent-run-logger');
    const realLogger = new AgentRunLogger();
    const logSpy = jest.spyOn(realLogger, 'log');

    const service = new ZhangbanshanSchedulerService(
      mockLlm,
      mockUserMemory,
      undefined,
      ruleMatcher,
      composer,
      retriever,
      realLogger,
    );

    await service.synthesizeThreeStage(
      '我和女方八字合不合？',
      baseDecision,
      primaryOutput,
      undefined,
      'test-user',
      undefined,
      false,
      { male: maleChart },
    );

    // 灰度关闭时 RuleMatcher/EvidenceComposer 不触发，但 LLM 埋点仍触发
    const llmCall = logSpy.mock.calls.find(
      (call: any[]) => call[0]?.agentName === 'ziping',
    );
    expect(llmCall).toBeDefined();
    expect(llmCall[0].status).toBe('success');
    expect((llmCall[0].inputJson as any).evidenceInjected).toBe(false);
  });
});
