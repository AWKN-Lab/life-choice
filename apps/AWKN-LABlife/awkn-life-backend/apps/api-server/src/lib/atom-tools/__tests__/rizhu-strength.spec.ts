import { rizhuStrengthTool, RizhuStrengthInput, RizhuStrengthOutput } from '../bazi/rizhu-strength';

describe('rizhu-strength tool', () => {
  it('should classify 甲木日主生于寅月为偏强', async () => {
    const input: RizhuStrengthInput = {
      yearPillar: '庚申',
      monthPillar: '戊寅',
      dayPillar: '甲寅',
      hourPillar: '丙寅',
    };

    const result: RizhuStrengthOutput = await rizhuStrengthTool.execute(input);

    expect(result.strength).toBeDefined();
    expect(['强', '偏强', '中和', '偏弱', '弱']).toContain(result.strength);
    expect(result.deling).toContain('得令');
    expect(result.summary).toContain('甲');
    expect(result.summary).toContain('木');
  });

  it('should classify 戊土日主生于寅月为偏弱', async () => {
    const input: RizhuStrengthInput = {
      yearPillar: '甲子',
      monthPillar: '丙寅',
      dayPillar: '戊午',
      hourPillar: '壬子',
    };

    const result: RizhuStrengthOutput = await rizhuStrengthTool.execute(input);

    expect(result.strength).toBeDefined();
    expect(['强', '偏强', '中和', '偏弱', '弱']).toContain(result.strength);
    expect(result.summary).toContain('戊');
    expect(result.summary).toContain('土');
  });

  it('should return valid structure for extreme strong case', async () => {
    const input: RizhuStrengthInput = {
      yearPillar: '甲寅',
      monthPillar: '甲寅',
      dayPillar: '甲寅',
      hourPillar: '甲寅',
    };

    const result: RizhuStrengthOutput = await rizhuStrengthTool.execute(input);

    expect(result.strength).toBe('强');
    expect(result.deling).toContain('得令');
    expect(result.dedi).toContain('得地');
    expect(result.deshi).toContain('得势');
    expect(result.summary).toBeTruthy();
  });

  it('should return valid structure for extreme weak case', async () => {
    const input: RizhuStrengthInput = {
      yearPillar: '庚申',
      monthPillar: '庚申',
      dayPillar: '甲申',
      hourPillar: '庚申',
    };

    const result: RizhuStrengthOutput = await rizhuStrengthTool.execute(input);

    expect(result.strength).toBeDefined();
    expect(['偏弱', '弱']).toContain(result.strength);
    expect(result.summary).toContain('甲');
  });

  it('should produce prompt output from result', async () => {
    const input: RizhuStrengthInput = {
      yearPillar: '甲子',
      monthPillar: '丙寅',
      dayPillar: '戊午',
      hourPillar: '壬子',
    };

    const result = await rizhuStrengthTool.execute(input);
    const promptOutput = rizhuStrengthTool.toPromptOutput(result);

    expect(typeof promptOutput).toBe('string');
    expect(promptOutput.length).toBeGreaterThan(0);
    expect(promptOutput).toContain('日主');
  });
});
