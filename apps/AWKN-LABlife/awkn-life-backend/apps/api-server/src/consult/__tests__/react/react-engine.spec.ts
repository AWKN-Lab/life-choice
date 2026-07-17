/**
 * ReAct 引擎测试 — 推理循环验证
 *
 * 验证：
 * - 循环终止条件：conclude / max_iters / error
 * - JSON 解析失败兜底
 * - normalizeAction 校验
 * - observe 占位逻辑
 */

import { ReactEngineService, ReactAction, ReactRunResult } from '../../orchestrator/react-engine.service';
import { createMockLlmGateway } from '../test-helpers';

describe('ReactEngineService — 推理循环验证', () => {
  let engine: ReactEngineService;
  let mockLlm: ReturnType<typeof createMockLlmGateway>;

  beforeEach(() => {
    mockLlm = createMockLlmGateway();
    engine = new ReactEngineService(mockLlm as any);
  });

  describe('单轮 conclude', () => {
    it('THINK → ACT(conclude) → 直接返回', async () => {
      // think 返回"已足够"
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '已收集足够信息，可以下结论' }) // think
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'conclude', finalAnswer: '事业稳中有进', justification: '信息充分' }) }); // act

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
      });

      expect(result.done).toBe(true);
      expect(result.reason).toBe('completed');
      expect(result.finalAnswer).toContain('事业稳中有进');
      expect(result.totalIters).toBe(1);
    });
  });

  describe('多轮循环', () => {
    it('2 轮后 conclude', async () => {
      // iter 1: think → act(tool) → observe → reflect(done=false)
      // iter 2: think → act(conclude)
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '还缺八字排盘信息' }) // iter1 think
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'tool', tool: 'bazi', args: { date: '1990-01-01' }, justification: '需要八字排盘' }) }) // iter1 act
        .mockResolvedValueOnce({ content: JSON.stringify({ done: false, content: '还需更多信息', finalAnswer: '' }) }) // iter1 reflect
        .mockResolvedValueOnce({ content: '现在信息足够了' }) // iter2 think
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'conclude', finalAnswer: '事业秋季较旺', justification: '信息充分' }) }); // iter2 act

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
        availableTools: ['bazi'],
      });

      expect(result.done).toBe(true);
      expect(result.reason).toBe('completed');
      expect(result.totalIters).toBe(2);
      expect(result.steps.length).toBeGreaterThanOrEqual(5); // think+act+observe+reflect + think+act
    });
  });

  describe('max_iters 兜底', () => {
    it('超过 5 轮 → max_iters', async () => {
      // 每轮 reflect 都返回 done=false
      for (let i = 0; i < 5; i++) {
        mockLlm.chatWithFallback
          .mockResolvedValueOnce({ content: `第${i + 1}轮思考` }) // think
          .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: `补充${i}`, justification: '需要更多信息' }) }) // act
          .mockResolvedValueOnce({ content: JSON.stringify({ done: false, content: '仍不够', finalAnswer: '' }) }); // reflect
      }

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
      });

      expect(result.done).toBe(false);
      expect(result.reason).toBe('max_iters');
      expect(result.totalIters).toBe(6); // for 循环 iter 从 1 到 5，退出后 iter=6
    });
  });

  describe('JSON 解析失败兜底', () => {
    it('act 返回非法 JSON → 兜底 ask_user', async () => {
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '需要更多信息' }) // think
        .mockResolvedValueOnce({ content: '这不是JSON' }) // act - 非法
        .mockResolvedValueOnce({ content: JSON.stringify({ done: true, content: '强制收敛', finalAnswer: '兜底答案' }) }); // reflect

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
      });

      // 应该有 ask_user 的 observe 步骤
      const askStep = result.steps.find(s => s.observation && s.observation.includes('应问用户'));
      expect(askStep).toBeTruthy();
    });

    it('reflect 返回非法 JSON → 强制收敛', async () => {
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '需要更多信息' }) // think
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '补充信息', justification: '需要' }) }) // act
        .mockResolvedValueOnce({ content: '非法JSON' }); // reflect - 非法

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
      });

      expect(result.done).toBe(true);
    });
  });

  describe('normalizeAction 校验', () => {
    it('不可用工具 → conclude', async () => {
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '需要排盘' })
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'tool', tool: 'nonexistent', args: {}, justification: '尝试' }) })
        .mockResolvedValueOnce({ content: JSON.stringify({ done: true, content: '工具不可用', finalAnswer: '指定工具不可用' }) });

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
        availableTools: ['bazi'],
      });

      const concludeStep = result.steps.find(s => s.action && s.action.kind === 'conclude');
      expect(concludeStep).toBeTruthy();
    });

    it('不可用子智能体 → conclude', async () => {
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '需要子智能体' })
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'subagent', agent: 'nonexistent', question: 'test', justification: '尝试' }) })
        .mockResolvedValueOnce({ content: JSON.stringify({ done: true, content: '智能体不可用', finalAnswer: '指定子智能体不可用' }) });

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
        availableAgents: ['ziping'],
      });

      const concludeStep = result.steps.find(s => s.action && s.action.kind === 'conclude');
      expect(concludeStep).toBeTruthy();
    });
  });

  describe('observe 占位', () => {
    it('tool action → 占位摘要', async () => {
      mockLlm.chatWithFallback
        .mockResolvedValueOnce({ content: '需要排盘' })
        .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'tool', tool: 'bazi', args: { date: '1990-01-01' }, justification: '需要' }) })
        .mockResolvedValueOnce({ content: JSON.stringify({ done: true, content: '够了', finalAnswer: '结论' }) });

      const result = await engine.run({
        question: '今年事业怎么样',
        systemContext: '你是张半山',
        availableTools: ['bazi'],
      });

      const observeStep = result.steps.find(s => s.phase === 'observe');
      expect(observeStep).toBeTruthy();
      expect(observeStep!.observation).toContain('bazi');
    });
  });
});
