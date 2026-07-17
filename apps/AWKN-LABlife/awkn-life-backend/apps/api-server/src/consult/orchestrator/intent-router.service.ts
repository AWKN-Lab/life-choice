import { Injectable } from '@nestjs/common';

export type RouteType = 'ziping' | 'liuren' | 'zhangsheng' | 'mixed' | 'clarify';

export interface IntentRoutingInput {
  question: string;
  hasBirthInfo: boolean;
}

@Injectable()
export class IntentRouterService {
  route(input: IntentRoutingInput): RouteType {
    const q = input.question.toLowerCase();

    const liurenPatterns = [
      '现在', '能不能', '何时', '要不要', '合作', '投资', '项目',
      '这笔', '这次', '这份', '这个', '可否', '能否', '行不行',
      '问', '测', '占', '算'
    ];

    const zipingPatterns = [
      '今年', '明年', '去年', '今年', '事业', '财富', '财运',
      '年运', '月运', '流年', '大运', '整体', '全年', '走势',
      '职业', '工作', '财运', '感情', '婚姻', '健康', '学业'
    ];

    const liurenScore = liurenPatterns.filter(p => q.includes(p)).length;
    const zipingScore = zipingPatterns.filter(p => q.includes(p)).length;

    if (input.hasBirthInfo && liurenScore >= 1) {
      return 'mixed';
    }

    if (input.hasBirthInfo && zipingScore >= 1) {
      return 'ziping';
    }

    if (!input.hasBirthInfo) {
      return 'clarify';
    }

    return 'ziping';
  }
}
