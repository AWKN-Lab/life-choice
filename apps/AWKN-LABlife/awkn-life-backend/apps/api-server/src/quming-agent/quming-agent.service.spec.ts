import { QumingAgentService } from './quming-agent.service';

describe('QumingAgentService scene-aware birth data handling', () => {
  const provider = {
    isConfigured: jest.fn(() => true),
    chatWithUser: jest.fn(async () => ({
      content: JSON.stringify({
        suggestions: [
          { name: '知澜', reason: '兼顾知识感与流动传播感' },
          { name: '明序', reason: '表达清晰秩序与可信赖感' },
        ],
      }),
    })),
  };

  beforeEach(() => jest.clearAllMocks());

  it('does not invent bazi data for brand naming without birth data', async () => {
    const service = new QumingAgentService(provider as any, undefined);
    const result = await service.analyze({
      namingType: 'brand',
      industry: '知识服务',
      targetAudience: '职场决策者',
      stylePreference: ['modern'],
    });

    expect(provider.chatWithUser).toHaveBeenCalledTimes(1);
    expect(result.bazi).toEqual({
      yearPillar: '', monthPillar: '', dayPillar: '', hourPillar: '', dayGan: '', naYin: '',
    });
    expect(result.wuxingAnalysis.recommendation).toContain('不进行五行判断');
    expect(result.risks.join('')).toContain('商标');
  });

  it('requires a birth date for baby naming instead of using fake defaults', async () => {
    const service = new QumingAgentService(provider as any, undefined);
    const result = await service.analyze({ namingType: 'baby', surname: '陈' });

    expect(provider.chatWithUser).not.toHaveBeenCalled();
    expect(result.lowQuality).toBe(true);
    expect(result.qualityWarning).toContain('出生日期');
    expect(result.bazi.yearPillar).toBe('');
  });
});
