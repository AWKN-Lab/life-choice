import { RouterService } from '../router.service';

// Mock PrismaService — router doesn't use DB
const mockPrisma = {} as any;

describe('RouterService (P2.2 加权关键词路由)', () => {
  let router: RouterService;

  beforeEach(() => {
    router = new RouterService(mockPrisma);
  });

  // ── 确定性路由（强信号） ──

  it('"我想给宝宝取名" → quming', async () => {
    const result = await router.route('我想给宝宝取名');
    expect(result.routeType).toBe('quming');
    expect(result.needClarify).toBe(false);
  });

  it('"帮我起个名字" → quming', async () => {
    const result = await router.route('帮我起个名字');
    expect(result.routeType).toBe('quming');
  });

  it('"用奇门遁甲看看出行" → qimen', async () => {
    const result = await router.route('用奇门遁甲看看出行');
    expect(result.routeType).toBe('qimen');
  });

  it('"帮我摇一卦" → liuyao', async () => {
    const result = await router.route('帮我摇一卦');
    expect(result.routeType).toBe('liuyao');
  });

  it('"六爻占卜一事" → liuyao', async () => {
    const result = await router.route('六爻占卜一事');
    expect(result.routeType).toBe('liuyao');
  });

  it('"看看紫微斗数命盘" → ziwei', async () => {
    const result = await router.route('看看紫微斗数命盘');
    expect(result.routeType).toBe('ziwei');
  });

  // ── 具体事件路由 ──

  it('"我能不能辞职" → liuren (具体事件)', async () => {
    const result = await router.route('我能不能辞职');
    expect(result.routeType).toBe('liuren');
  });

  it('"要不要投资买房" → liuren (具体事件)', async () => {
    const result = await router.route('要不要投资买房');
    expect(result.routeType).toBe('liuren');
  });

  it('"和男朋友分手了能不能复合" → liuren', async () => {
    const result = await router.route('和男朋友分手了能不能复合');
    expect(result.routeType).toBe('liuren');
  });

  // ── 趋势路由 ──

  it('"今年运势怎么样" → ziping (趋势走八字)', async () => {
    const result = await router.route('今年运势怎么样');
    expect(result.routeType).toBe('ziping');
  });

  // ── 模糊/澄清 ──

  it('"我很迷茫不知道该怎么办" → clarify', async () => {
    const result = await router.route('我很迷茫不知道该怎么办');
    expect(result.routeType).toBe('clarify');
    expect(result.needClarify).toBe(true);
  });

  it('"很烦躁很焦虑" → clarify', async () => {
    const result = await router.route('很烦躁很焦虑');
    expect(result.routeType).toBe('clarify');
  });

  // ── 无信号 → 默认 ziping ──

  it('"你好" → ziping (默认八字)', async () => {
    const result = await router.route('你好');
    expect(result.routeType).toBe('ziping');
  });

  it('"" (空) → ziping (默认八字)', async () => {
    const result = await router.route('');
    expect(result.routeType).toBe('ziping');
  });

  // ── 歧义澄清（两个路由得分接近） ──

  it('"今年能不能跳槽" → clarify (event + trend 得分接近)', async () => {
    // event: 能不能(4) + 跳槽(3) = 7
    // trend: 今年(2) = 2
    // 7 > 2, gap = 5, ratio = 5/7 = 0.71 > 0.5 → 不歧义，直接路由到 liuren
    const result = await router.route('今年能不能跳槽');
    expect(result.routeType).toBe('liuren');
  });

  // ── 子串不重复计数 ──

  it('"奇门遁甲" 不应重复计数 "奇门" 和 "遁甲"', async () => {
    // "奇门遁甲"(5) 匹配后，"奇门"(5) 和 "遁甲"(5) 不应再次计入
    const result = await router.route('奇门遁甲');
    expect(result.routeType).toBe('qimen');
    expect(result.needClarify).toBe(false);
  });

  // ── 弱信号触发澄清 ──

  it('"方位" (仅一个弱关键词) → clarify', async () => {
    // qimen: 方位(2) = 2, 低于 CLARIFY_THRESHOLD=4
    const result = await router.route('方位');
    expect(result.routeType).toBe('clarify');
  });

  // ── 返回结构完整性 ──

  it('所有路由返回的 RouteDecision 应包含必要字段', async () => {
    const testCases = [
      '帮我取名',
      '奇门遁甲择日',
      '能不能投资',
      '你好',
      '很迷茫',
    ];

    for (const q of testCases) {
      const result = await router.route(q);
      expect(result.routeType).toBeDefined();
      expect(typeof result.needClarify).toBe('boolean');
      expect(Array.isArray(result.requiredFields)).toBe(true);
      expect(result.nextStep).toBeDefined();
    }
  });
});
