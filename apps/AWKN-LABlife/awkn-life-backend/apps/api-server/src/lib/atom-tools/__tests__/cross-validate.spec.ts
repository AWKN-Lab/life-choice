import {
  crossValidateTool,
  CrossValidateInput,
  CrossValidateOutput,
  BaziJudgment,
  ZiweiJudgment,
  QimenJudgment,
} from '../decision/cross-validate';

const makeBaziJudgment = (
  trend: BaziJudgment['trend'],
  confidence: BaziJudgment['confidence'] = 'medium',
  keyFactors: string[] = [],
): BaziJudgment => ({
  domain: 'career',
  trend,
  confidence,
  keyFactors,
  summary: `八字判断事业${trend}`,
});

const makeZiweiJudgment = (
  trend: ZiweiJudgment['trend'],
  confidence: ZiweiJudgment['confidence'] = 'medium',
  keyFactors: string[] = [],
): ZiweiJudgment => ({
  domain: 'career',
  trend,
  confidence,
  keyFactors,
  summary: `紫微判断事业${trend}`,
});

const makeQimenJudgment = (
  trend: QimenJudgment['trend'],
  confidence: QimenJudgment['confidence'] = 'medium',
  keyFactors: string[] = [],
): QimenJudgment => ({
  domain: 'career',
  trend,
  confidence,
  keyFactors,
  summary: `奇门判断事业${trend}`,
});

describe('cross-validate tool', () => {
  it('should return consistent when bazi and ziwei agree', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'high', ['官星得力', '财星生官']),
      ziwei: makeZiweiJudgment('favorable', 'medium', ['官星得力', '事业宫吉']),
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.consistency).toBe('consistent');
    expect(result.agreedPoints.length).toBeGreaterThan(0);
    expect(result.trustedSystem).toBeDefined();
    expect(result.summary).toContain('一致');
  });

  it('should return conflicting when bazi and ziwei disagree', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'high', ['官星得力']),
      ziwei: makeZiweiJudgment('unfavorable', 'medium', ['事业宫煞星']),
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.consistency).toBe('conflicting');
    expect(result.disagreedPoints.length).toBeGreaterThan(0);
    expect(result.summary).toContain('分歧');
  });

  it('should return partial when one system is neutral', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'medium', ['官星得力']),
      ziwei: makeZiweiJudgment('neutral', 'medium', ['事业宫平']),
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.consistency).toBe('partial');
    expect(result.summary).toContain('部分一致');
  });

  it('should handle three-way consistent validation', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'high', ['官星得力']),
      ziwei: makeZiweiJudgment('favorable', 'medium', ['事业宫吉']),
      qimen: makeQimenJudgment('favorable', 'low', ['开门吉']),
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.consistency).toBe('consistent');
    expect(result.agreedPoints.length).toBeGreaterThan(0);
  });

  it('should handle three-way conflicting validation', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'high', ['官星得力']),
      ziwei: makeZiweiJudgment('unfavorable', 'medium', ['事业宫煞']),
      qimen: makeQimenJudgment('neutral', 'low', ['开门平']),
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.consistency).toBe('conflicting');
    expect(result.disagreedPoints.length).toBeGreaterThan(0);
  });

  it('should prioritize qimen for timing domain', async () => {
    const input: CrossValidateInput = {
      domain: 'timing',
      bazi: makeBaziJudgment('favorable', 'medium', ['流年吉利']),
      ziwei: makeZiweiJudgment('neutral', 'medium', ['流月平']),
      qimen: makeQimenJudgment('unfavorable', 'high', ['时盘凶']),
      questionCategory: '时机',
    };

    const result: CrossValidateOutput = await crossValidateTool.execute(input);

    expect(result.trustedSystem).toBeDefined();
    expect(result.summary).toContain('奇门');
  });

  it('should produce prompt output from result', async () => {
    const input: CrossValidateInput = {
      domain: 'career',
      bazi: makeBaziJudgment('favorable', 'high', ['官星得力']),
      ziwei: makeZiweiJudgment('favorable', 'medium', ['事业宫吉']),
    };

    const result = await crossValidateTool.execute(input);
    const promptOutput = crossValidateTool.toPromptOutput(result);

    expect(typeof promptOutput).toBe('string');
    expect(promptOutput).toContain('交叉验证');
    expect(promptOutput).toContain('一致');
  });
});
