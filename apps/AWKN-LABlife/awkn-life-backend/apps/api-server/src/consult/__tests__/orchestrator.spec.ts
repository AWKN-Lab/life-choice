/**
 * L2 Pipeline 测试基础设施验证 — 最简 spec
 *
 * 验证 mock 工厂可正常创建，Jest 配置正确
 */

import { createMockPrismaService, createMockLlmGateway, createMockQueue, createMockWebsocketGateway, createMockIntentRouter, createMockHighRiskDetector, createMockUserMemoryService, createMockClassifierService, createMockScheduler, createMockEvidenceBuilder, createMockKnowledgeRetriever, createMockGenerationComposer, createMockQualityGate, createMockMemoryExtractor, createMockReactEngine, FIXTURES } from './test-helpers';

describe('L2 Pipeline 测试基础设施', () => {
  it('mock PrismaService 可正常创建', () => {
    const prisma = createMockPrismaService();
    expect(prisma.consultRecord.update).toBeDefined();
    expect(prisma.consultRecord.findUnique).toBeDefined();
    expect(prisma.interactionEvent.create).toBeDefined();
    expect(prisma.userMemory.findUnique).toBeDefined();
  });

  it('mock LlmGatewayService 可正常创建', () => {
    const gateway = createMockLlmGateway();
    expect(gateway.generateParallel).toBeDefined();
    expect(gateway.chatWithFallback).toBeDefined();
    expect(gateway.chatCheap).toBeDefined();
  });

  it('mock BullMQ Queue 可正常创建', () => {
    const queue = createMockQueue();
    expect(queue.add).toBeDefined();
    expect(queue.close).toBeDefined();
  });

  it('mock WebsocketGateway 可正常创建', () => {
    const ws = createMockWebsocketGateway();
    expect(ws.sendLLMToken).toBeDefined();
    expect(ws.sendProgressUpdate).toBeDefined();
  });

  it('mock IntentRouterService 可正常创建并指定路由', () => {
    const router = createMockIntentRouter('liuren');
    expect(router.route).toBeDefined();
    expect(router.route()).toBe('liuren');
  });

  it('mock HighRiskDetectorService 默认返回 null（无高风险）', () => {
    const detector = createMockHighRiskDetector();
    expect(detector.detect).toBeDefined();
    expect(detector.detect('测试问题')).toBeNull();
  });

  it('mock UserMemoryService 可正常创建', () => {
    const memory = createMockUserMemoryService();
    expect(memory.getMemorySummary).toBeDefined();
    expect(memory.appendConsultHistory).toBeDefined();
  });

  it('mock ClassifierService 可正常创建', () => {
    const classifier = createMockClassifierService();
    expect(classifier.classify).toBeDefined();
  });

  it('mock ZhangbanshanSchedulerService 可正常创建', () => {
    const scheduler = createMockScheduler();
    expect(scheduler.schedule).toBeDefined();
    expect(scheduler.synthesizeThreeStage).toBeDefined();
    expect(scheduler.arbitrate).toBeDefined();
  });

  it('mock QualityGateService 默认通过', () => {
    const gate = createMockQualityGate();
    const result = gate.evaluate('测试文本') as any;
    expect(result.passed).toBe(true);
    expect(result.score).toBe(90);
  });

  it('所有 mock 工厂创建无异常', () => {
    expect(() => {
      createMockPrismaService();
      createMockLlmGateway();
      createMockQueue();
      createMockWebsocketGateway();
      createMockIntentRouter();
      createMockHighRiskDetector();
      createMockUserMemoryService();
      createMockClassifierService();
      createMockScheduler();
      createMockEvidenceBuilder();
      createMockKnowledgeRetriever();
      createMockGenerationComposer();
      createMockQualityGate();
      createMockMemoryExtractor();
      createMockReactEngine();
    }).not.toThrow();
  });

  it('FIXTURES 包含 4 种路由输入', () => {
    expect(FIXTURES.zipingInput).toBeDefined();
    expect(FIXTURES.liurenInput).toBeDefined();
    expect(FIXTURES.mixedInput).toBeDefined();
    expect(FIXTURES.clarifyInput).toBeDefined();
  });

  it('FIXTURES 包含高风险测试输入', () => {
    expect(FIXTURES.highRiskInputs.medical).toBeDefined();
    expect(FIXTURES.highRiskInputs.legal).toBeDefined();
    expect(FIXTURES.highRiskInputs.financial).toBeDefined();
    expect(FIXTURES.highRiskInputs.crisis).toBeDefined();
  });
});
