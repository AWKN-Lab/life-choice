import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConsultAnalyzeDto } from './index';

describe('ConsultAnalyzeDto naming contract', () => {
  it('accepts the current array form of stylePreference', async () => {
    const dto = plainToInstance(ConsultAnalyzeDto, {
      routeType: 'quming',
      question: '给品牌取名',
      stylePreference: ['modern', 'steady'],
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.stylePreference).toEqual(['modern', 'steady']);
  });

  it('normalizes the legacy JSON string form of stylePreference', async () => {
    const dto = plainToInstance(ConsultAnalyzeDto, {
      routeType: 'quming',
      question: '给品牌取名',
      stylePreference: '["modern","steady"]',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.stylePreference).toEqual(['modern', 'steady']);
  });
});

describe('ConsultAnalyzeDto Kline question context', () => {
  it('accepts the structured node evidence used by the question flow', async () => {
    const dto = plainToInstance(ConsultAnalyzeDto, {
      routeType: 'liuren',
      question: '这个合作在该节点是否适合推进？',
      contextSource: 'kline_node',
      targetDate: '2027-03',
      questionType: 'kline_node',
      signalLabel: '蓄势待发',
      compositeScore: 68,
      opportunityScore: 72,
      riskScore: 41,
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.targetDate).toBe('2027-03');
    expect(dto.opportunityScore).toBe(72);
  });
});
