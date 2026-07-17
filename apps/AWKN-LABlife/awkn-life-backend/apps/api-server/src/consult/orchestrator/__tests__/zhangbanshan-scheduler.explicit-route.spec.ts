/**
 * P0-2 回归测试: 显式路由优先级
 *
 * 验证点：
 * 1. 用户传入 explicitRouteType=ziping → primaryAgent 必须为 ziping，不被关键词覆盖
 * 2. 用户传入 explicitRouteType=liuren → primaryAgent 必须为 liuren
 * 3. 用户传入 explicitRouteType=ziwei → primaryAgent 必须为 ziwei
 * 4. 不传 explicitRouteType → 走原有关键词匹配逻辑（向后兼容）
 * 5. 显式路由 + 事业财运问题（原本会匹配 liuyao）→ 仍走显式路由
 *
 * 复现场景：生产日志显示用户传入 routeType=ziping + 事业财运问题，
 * 调度器却记录 "defaulting to liuyao" + "parallel generation: liuyao + qimen"
 */
import { jest } from '@jest/globals';
import { ZhangbanshanSchedulerService } from '../zhangbanshan-scheduler.service';

// ─── Mock 工厂（复用 evidence.spec.ts 的模式） ───

function createMockLlmProviders() {
  return {
    chatCheap: jest.fn<any>().mockResolvedValue({
      content: '【我的判断】测试\n【前提】测试\n【代价】测试\n【推理轨迹】测试',
      model: 'test-model',
      usage: { total_tokens: 100 },
    }),
    chatStream: jest.fn<any>(),
  } as any;
}

function createMockUserMemoryService() {
  return {
    searchRelevantMemory: jest.fn<any>().mockResolvedValue({ summary: '', hits: [] }),
    buildMemoryAnchor: jest.fn<any>().mockResolvedValue(undefined),
  } as any;
}

function createService(): ZhangbanshanSchedulerService {
  return new ZhangbanshanSchedulerService(
    createMockLlmProviders(),
    createMockUserMemoryService(),
    undefined, // classifierService
    undefined, // ruleMatcherService
    undefined, // evidenceComposerService
    undefined, // knowledgeRetrieverService
    undefined, // agentRunLogger
  );
}

describe('P0-2: 显式路由优先级', () => {
  let service: ZhangbanshanSchedulerService;

  beforeEach(() => {
    service = createService();
  });

  describe('显式路由覆盖关键词匹配', () => {
    it('explicitRouteType=ziping + 事业财运问题 → primaryAgent=ziping', () => {
      // 复现生产 bug：用户选 ziping，问题含"事业""财运"关键词
      // 原本会匹配 liuyao（无关键词命中时 defaulting to liuyao）
      const decision = service.schedule({
        question: '我最近事业不太顺，想看看今年财运怎么样',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'ziping',
      });

      expect(decision.primaryAgent).toBe('ziping');
      expect(decision.scheduleReason).toContain('用户显式选择');
      expect(decision.confidence).toBe(1.0);
    });

    it('explicitRouteType=liuren → primaryAgent=liuren', () => {
      const decision = service.schedule({
        question: '我面临一个人生大事，要不要辞职创业',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'liuren',
      });

      expect(decision.primaryAgent).toBe('liuren');
      expect(decision.scheduleReason).toContain('liuren');
    });

    it('explicitRouteType=ziwei → primaryAgent=ziwei', () => {
      const decision = service.schedule({
        question: '帮我看看紫微盘',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'ziwei',
      });

      expect(decision.primaryAgent).toBe('ziwei');
    });

    it('explicitRouteType=liuyao → primaryAgent=liuyao', () => {
      const decision = service.schedule({
        question: '问一件事',
        hasBirthInfo: false,
        hasAskTime: true,
        explicitRouteType: 'liuyao',
      });

      expect(decision.primaryAgent).toBe('liuyao');
    });

    it('explicitRouteType=qumen → primaryAgent=qumen', () => {
      const decision = service.schedule({
        question: '取名咨询',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'quming',
      });

      expect(decision.primaryAgent).toBe('quming');
    });
  });

  describe('不传 explicitRouteType 时向后兼容', () => {
    it('无 explicitRouteType → 走关键词匹配（原逻辑）', () => {
      const decision = service.schedule({
        question: '我最近事业不太顺，想看看今年财运怎么样',
        hasBirthInfo: true,
        hasAskTime: false,
        // 不传 explicitRouteType
      });

      // 原逻辑：无关键词命中 → defaulting to liuyao
      expect(decision.primaryAgent).toBe('liuyao');
      expect(decision.scheduleReason).not.toContain('用户显式选择');
    });

    it('无 explicitRouteType + 重大决策关键词 → 走 scenario 8', () => {
      const decision = service.schedule({
        question: '我面临一个人生大事，要不要辞职创业，这是改变人生的一辈子的事',
        hasBirthInfo: true,
        hasAskTime: false,
      });

      // 原逻辑：命中 scenario 8
      expect(decision.primaryAgent).toBe('liuren');
      expect(decision.mode).toBe('deep_consult');
    });
  });

  describe('显式路由的 secondaryAgent 配置', () => {
    it('explicitRouteType=ziping → secondaryAgent=undefined（八字独立）', () => {
      const decision = service.schedule({
        question: '看八字',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'ziping',
      });

      expect(decision.primaryAgent).toBe('ziping');
      expect(decision.secondaryAgent).toBeUndefined();
    });

    it('explicitRouteType=liuren → secondaryAgent=qimen', () => {
      const decision = service.schedule({
        question: '问事',
        hasBirthInfo: true,
        hasAskTime: false,
        explicitRouteType: 'liuren',
      });

      expect(decision.primaryAgent).toBe('liuren');
      expect(decision.secondaryAgent).toBe('qimen');
    });
  });
});
