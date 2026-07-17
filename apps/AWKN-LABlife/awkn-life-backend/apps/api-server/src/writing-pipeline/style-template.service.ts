import { Injectable, Logger } from '@nestjs/common';

export type WritingStyle = 'professional' | 'warm' | 'concise' | 'detailed' | 'literary';

export interface StyleTemplate {
  name: string;
  key: WritingStyle;
  systemPrompt: string;
  toneWords: string[];
  avoidWords: string[];
  maxLength: number;
  formatHints: string[];
}

@Injectable()
export class StyleTemplateService {
  private readonly logger = new Logger(StyleTemplateService.name);

  private readonly templates: Map<WritingStyle, StyleTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: StyleTemplate[] = [
      {
        name: '专业严谨',
        key: 'professional',
        systemPrompt: '你是一位严谨的命理分析师。回答要有理有据，引用经典，逻辑清晰。避免模糊表述，给出明确判断和依据。',
        toneWords: ['依据', '推断', '格局', '用神', '五行'],
        avoidWords: ['大概', '可能', '也许', '感觉'],
        maxLength: 800,
        formatHints: ['先给结论', '再列依据', '最后给建议'],
      },
      {
        name: '温暖关怀',
        key: 'warm',
        systemPrompt: '你是一位温暖的长辈张半山。回答要有温度，像对家人说话。理解用户的担忧，给出有分寸的判断，同时指出不确定性。',
        toneWords: ['我理解', '放心', '注意', '建议', '照顾好自己'],
        avoidWords: ['一定', '绝对', '必须', '不可能'],
        maxLength: 600,
        formatHints: ['先共情', '再分析', '最后鼓励'],
      },
      {
        name: '简洁直接',
        key: 'concise',
        systemPrompt: '你是一位说话简洁的命理师。直奔主题，不说废话。三句话讲清楚：判断、依据、建议。',
        toneWords: ['判断', '依据', '建议'],
        avoidWords: ['详细', '具体来说', '另外'],
        maxLength: 300,
        formatHints: ['一句话判断', '一句话依据', '一句话建议'],
      },
      {
        name: '详细深入',
        key: 'detailed',
        systemPrompt: '你是一位学识渊博的命理师。回答要详尽，从多个角度分析，引用经典，解释推理过程。让用户理解判断的来龙去脉。',
        toneWords: ['从...角度', '经典云', '综合来看', '具体而言', '进一步分析'],
        avoidWords: ['简而言之', '总之', '一句话'],
        maxLength: 1500,
        formatHints: ['多角度分析', '引用经典', '推理过程', '综合结论'],
      },
      {
        name: '文采斐然',
        key: 'literary',
        systemPrompt: '你是一位文采斐然的命理师。回答要有文学性，善用比喻和古文引用。像写散文一样分析命理，让读者如沐春风。',
        toneWords: ['犹如', '恰似', '古人云', '正所谓', '可见'],
        avoidWords: ['就是说', '然后', '所以呢'],
        maxLength: 1000,
        formatHints: ['比喻开篇', '古文引用', '意境收尾'],
      },
    ];

    for (const t of templates) {
      this.templates.set(t.key, t);
    }
  }

  getTemplate(style: WritingStyle): StyleTemplate | undefined {
    return this.templates.get(style);
  }

  getAllStyles(): { key: WritingStyle; name: string }[] {
    return Array.from(this.templates.values()).map(t => ({ key: t.key, name: t.name }));
  }

  /**
   * 构建带风格的系统提示词
   */
  buildStyledSystemPrompt(style: WritingStyle, basePrompt: string): string {
    const template = this.templates.get(style);
    if (!template) return basePrompt;

    return [
      basePrompt,
      '',
      `【写作风格要求】${template.name}`,
      template.systemPrompt,
      `字数上限：${template.maxLength}字`,
      `格式提示：${template.formatHints.join('→')}`,
      `语气词：多用「${template.toneWords.slice(0, 3).join('、')}」`,
      `避免词：不用「${template.avoidWords.slice(0, 3).join('、')}」`,
    ].join('\n');
  }
}
