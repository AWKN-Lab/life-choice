import { describe, expect, it } from 'vitest';
import { buildKlineNodeQuestionPrompt, buildNamingConsultPayload } from './frontdeskAdapters';

describe('buildNamingConsultPayload', () => {
  it('keeps all structured adult naming fields and does not invent birth data', () => {
    const payload = buildNamingConsultPayload({
      t: (key) => key,
      namingType: 'adult',
      surname: '陈',
      style: ['steady', 'modern'],
      improveFocus: '职业形象',
      industry: '',
      targetAudience: '',
      originalName: '陈婷',
      birthDate: '',
      birthHour: 0,
      birthMinute: 0,
      gender: null,
      customDescription: '希望更利落',
    });

    expect(payload.stylePreference).toEqual(['steady', 'modern']);
    expect(payload.originalName).toBe('陈婷');
    expect(payload.improveFocus).toBe('职业形象');
    expect(payload.customDescription).toBe('希望更利落');
    expect(payload.birthDate).toBeUndefined();
    expect(payload.birthTime).toBeUndefined();
    expect(payload.gender).toBeUndefined();
  });
});

describe('buildKlineNodeQuestionPrompt', () => {
  it('builds an editable prompt through i18n instead of hard-coded Chinese', () => {
    const t = (key: string, options?: Record<string, unknown>) => {
      if (key.endsWith('klineNodeSignal')) return ` [${options?.signal}]`;
      return `Ask ${options?.targetDate}${options?.signalPart}: `;
    };

    expect(buildKlineNodeQuestionPrompt({
      contextSource: 'kline_node',
      targetDate: '2027-03',
      questionType: 'kline_node',
      signalLabel: 'rising',
    }, t)).toBe('Ask 2027-03 [rising]: ');
  });
});
