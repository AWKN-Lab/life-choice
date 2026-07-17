import { wuxingBalanceTool, WuxingBalanceInput, WuxingBalanceOutput } from '../bazi/wuxing-balance';

describe('wuxing-balance tool', () => {
  it('should return five-element distribution with all 5 elements', async () => {
    const input: WuxingBalanceInput = {
      yearPillar: '甲子',
      monthPillar: '丙寅',
      dayPillar: '戊午',
      hourPillar: '壬子',
    };

    const result: WuxingBalanceOutput = await wuxingBalanceTool.execute(input);

    expect(result.distribution).toBeDefined();
    expect(Object.keys(result.distribution)).toEqual(
      expect.arrayContaining(['金', '木', '水', '火', '土']),
    );
    expect(result.dayMasterElement).toBe('土');
    expect(result.xiYong.length).toBeGreaterThan(0);
    expect(result.jiShen).toBeDefined();
    expect(result.summary).toContain('五行分布');
    expect(result.summary).toContain('日主');
  });

  it('should identify xiYong and jiShen for strong day master', async () => {
    const input: WuxingBalanceInput = {
      yearPillar: '甲寅',
      monthPillar: '甲寅',
      dayPillar: '甲寅',
      hourPillar: '甲寅',
    };

    const result: WuxingBalanceOutput = await wuxingBalanceTool.execute(input);

    expect(result.dayMasterElement).toBe('木');
    expect(result.distribution['木']).toBeGreaterThan(result.distribution['金']);
    expect(result.jiShen).toContain('木');
    expect(result.xiYong.length).toBeGreaterThan(0);
  });

  it('should handle balanced distribution', async () => {
    const input: WuxingBalanceInput = {
      yearPillar: '庚申',
      monthPillar: '戊子',
      dayPillar: '甲寅',
      hourPillar: '丙寅',
    };

    const result: WuxingBalanceOutput = await wuxingBalanceTool.execute(input);

    expect(result.dayMasterElement).toBe('木');
    expect(result.xiYong).toBeDefined();
    expect(result.jiShen).toBeDefined();
    expect(result.summary).toBeTruthy();
  });

  it('should produce prompt output from result', async () => {
    const input: WuxingBalanceInput = {
      yearPillar: '甲子',
      monthPillar: '丙寅',
      dayPillar: '戊午',
      hourPillar: '壬子',
    };

    const result = await wuxingBalanceTool.execute(input);
    const promptOutput = wuxingBalanceTool.toPromptOutput(result);

    expect(typeof promptOutput).toBe('string');
    expect(promptOutput).toContain('五行分布');
    expect(promptOutput).toContain('喜用神');
    expect(promptOutput).toContain('忌神');
  });
});
