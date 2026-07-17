/**
 * P0-3 FactLedger 追问阻断验证测试
 *
 * 验证点：
 * 1. FactLedger 中已存在 birthInfo → ask_user 追问出生信息被阻断
 * 2. FactLedger 中已存在 chartSnapshot → ask_user 追问排盘结果被阻断
 * 3. FactLedger 中已存在 currentDaYun → ask_user 追问大运被阻断
 * 4. FactLedger 为空 → ask_user 不被阻断（正常追问）
 * 5. conclude action 不受 FactLedger 影响
 * 6. 阻断后返回 blockedClarifications 记录
 * 7. FactLedger 注入 think/reflect prompt（通过 mock 调用参数验证）
 */

import { ReactEngineService, FactLedger } from '../../orchestrator/react-engine.service';
import { createMockLlmGateway } from '../test-helpers';

describe('P0-3 FactLedger 追问阻断', () => {
  let engine: ReactEngineService;
  let mockLlm: ReturnType<typeof createMockLlmGateway>;

  beforeEach(() => {
    mockLlm = createMockLlmGateway();
    engine = new ReactEngineService(mockLlm as any);
  });

  // ─── 1) birthInfo 已存在 → 追问出生信息被阻断 ───

  it('FactLedger.birthInfo 已存在 → ask_user 追问"出生日期"被阻断，强制收敛', async () => {
    const factLedger: FactLedger = {
      birthInfo: {
        year: 1990, month: 1, day: 1, hour: 8, gender: 'male',
        formatted: '1990年1月1日 8时 男',
      },
    };

    // think → act(ask_user 追问出生日期)
    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '需要追问用户出生信息' }) // think
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '请问你的出生日期和时间是什么？', justification: '缺出生信息' }) }); // act

    const result = await engine.run({
      question: '我今年事业怎么样',
      systemContext: '你是张半山',
      factLedger,
    });

    expect(result.done).toBe(true);
    expect(result.blockedClarifications).toBeDefined();
    expect(result.blockedClarifications!.length).toBe(1);
    expect(result.blockedClarifications![0]).toContain('阻断');
    expect(result.blockedClarifications![0]).toContain('出生信息');
    expect(result.finalAnswer).toContain('1990年1月1日');
  });

  // ─── 2) chartSnapshot 已存在 → 追问排盘结果被阻断 ───

  it('FactLedger.chartSnapshot 已存在 → ask_user 追问"四柱"被阻断', async () => {
    const factLedger: FactLedger = {
      chartSnapshot: {
        yearPillar: '己酉', monthPillar: '壬申', dayPillar: '壬子', hourPillar: '癸卯',
        dayGan: '壬', formatted: '年柱己酉 月柱壬申 日柱壬子 时柱癸卯',
      },
    };

    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '需要追问排盘信息' })
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '请提供你的四柱八字排盘', justification: '缺排盘' }) });

    const result = await engine.run({
      question: '我的八字格局如何',
      systemContext: '你是张半山',
      factLedger,
    });

    expect(result.done).toBe(true);
    expect(result.blockedClarifications!.length).toBe(1);
    expect(result.blockedClarifications![0]).toContain('排盘结果');
  });

  // ─── 3) currentDaYun 已存在 → 追问大运被阻断 ───

  it('FactLedger.currentDaYun 已存在 → ask_user 追问"大运"被阻断', async () => {
    const factLedger: FactLedger = {
      currentDaYun: {
        startAge: 30, endAge: 39, gan: '壬', zhi: '寅',
        formatted: '壬寅运 (30-39岁)',
      },
    };

    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '需要追问大运信息' })
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '你目前走什么大运？', justification: '缺大运' }) });

    const result = await engine.run({
      question: '我未来十年运势',
      systemContext: '你是张半山',
      factLedger,
    });

    expect(result.done).toBe(true);
    expect(result.blockedClarifications!.length).toBe(1);
    expect(result.blockedClarifications![0]).toContain('当前大运');
  });

  // ─── 4) FactLedger 为空 → ask_user 不被阻断 ───

  it('FactLedger 为空 → ask_user 正常执行，不被阻断', async () => {
    // think → act(ask_user) → observe → reflect(done=true)
    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '需要追问用户' }) // think
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '请补充你的具体处境', justification: '缺背景' }) }) // act
      .mockResolvedValueOnce({ content: JSON.stringify({ done: true, content: '已有信息足够', finalAnswer: '基于现有信息回答' }) }); // reflect

    const result = await engine.run({
      question: '我的事业怎么样',
      systemContext: '你是张半山',
      factLedger: {},
    });

    expect(result.done).toBe(true);
    expect(result.blockedClarifications).toBeDefined();
    expect(result.blockedClarifications!.length).toBe(0);
  });

  // ─── 5) conclude action 不受 FactLedger 影响 ───

  it('FactLedger 已存在 → act(conclude) 正常执行，不阻断', async () => {
    const factLedger: FactLedger = {
      birthInfo: { year: 1990, month: 1, day: 1, hour: 8, gender: 'male', formatted: '1990年1月1日 8时 男' },
    };

    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '信息足够，可以下结论' })
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'conclude', finalAnswer: '事业稳中有进', justification: '信息充分' }) });

    const result = await engine.run({
      question: '今年事业怎么样',
      systemContext: '你是张半山',
      factLedger,
    });

    expect(result.done).toBe(true);
    expect(result.finalAnswer).toContain('事业稳中有进');
    expect(result.blockedClarifications!.length).toBe(0);
  });

  // ─── 6) 阻断后 blockedClarifications 记录完整 ───

  it('阻断后 blockedClarifications 包含 iter 编号和追问内容', async () => {
    const factLedger: FactLedger = {
      birthInfo: { year: 1990, month: 1, day: 1, hour: 8, gender: 'male', formatted: '1990年1月1日 8时 男' },
    };

    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '需要追问' })
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'ask_user', question: '请问你的八字出生日期', justification: '缺出生' }) });

    const result = await engine.run({
      question: '事业运势',
      systemContext: '你是张半山',
      factLedger,
    });

    expect(result.blockedClarifications!.length).toBe(1);
    const entry = result.blockedClarifications![0];
    expect(entry).toContain('iter1');
    expect(entry).toContain('出生日期');
    expect(entry).toContain('出生信息');
  });

  // ─── 7) FactLedger 注入 think prompt ───

  it('FactLedger 注入 think prompt — 验证 chatWithFallback 调用参数含 FactLedger 文本', async () => {
    const factLedger: FactLedger = {
      birthInfo: { year: 1990, month: 1, day: 1, hour: 8, gender: 'male', formatted: '1990年1月1日 8时 男' },
      chartSnapshot: { yearPillar: '己酉', formatted: '年柱己酉' },
    };

    mockLlm.chatWithFallback
      .mockResolvedValueOnce({ content: '信息足够' })
      .mockResolvedValueOnce({ content: JSON.stringify({ kind: 'conclude', finalAnswer: '结论', justification: '充分' }) });

    await engine.run({
      question: '事业运势',
      systemContext: '你是张半山',
      factLedger,
    });

    // 验证 think 阶段的 chatWithFallback 调用
    const thinkCall = mockLlm.chatWithFallback.mock.calls[0];
    const messages = thinkCall[0] as Array<{ role: string; content: string }>;
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('1990年1月1日');
    expect(userMessage!.content).toContain('年柱己酉');
    expect(userMessage!.content).toContain('FactLedger');
  });
});
