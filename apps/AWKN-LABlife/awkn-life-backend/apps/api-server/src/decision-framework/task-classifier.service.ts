/**
 * L1-L4 任务分类
 *
 * 来源：天火智能体技能迁移报告 §1.1
 * L1 简单查询 / L2 常规咨询 / L3 复杂决策 / L4 人生重大决策
 */

import { Injectable } from '@nestjs/common';

export type TaskLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface TaskClassification {
  level: TaskLevel;
  reason: string;
  responseStrategy: string;
}

const L4_KEYWORDS = ['转行', '辞职', '结婚', '离婚', '移民', '创业', '放弃', '人生', '重大'];
const L3_KEYWORDS = ['offer', '怎么选', '该不该', '两个', '抉择', '选择'];
const L2_KEYWORDS = ['今年', '运势', '事业', '感情', '财运', '健康'];
const L1_KEYWORDS = ['今天', '适合', '现在', '能不能', '可以吗'];

@Injectable()
export class TaskClassifierService {
  classify(userQuery: string): TaskClassification {
    const q = userQuery.trim();
    if (L4_KEYWORDS.some((k) => q.includes(k))) {
      return {
        level: 'L4',
        reason: '触发 L4 关键词，识别为人生重大决策',
        responseStrategy: '全维度分析 + 长期推演 + 多选项 VFM 评估 + 强边界声明',
      };
    }
    if (L3_KEYWORDS.some((k) => q.includes(k))) {
      return {
        level: 'L3',
        reason: '触发 L3 关键词，识别为复杂决策',
        responseStrategy: '多选项推演 + VFM 评估 + 边界声明',
      };
    }
    if (L2_KEYWORDS.some((k) => q.includes(k))) {
      return {
        level: 'L2',
        reason: '触发 L2 关键词，识别为常规咨询',
        responseStrategy: '四步决策框架分析 + 建议 + 边界声明',
      };
    }
    if (L1_KEYWORDS.some((k) => q.includes(k))) {
      return {
        level: 'L1',
        reason: '触发 L1 关键词，识别为简单查询',
        responseStrategy: '直接回答 + 简短边界声明',
      };
    }
    return {
      level: 'L2',
      reason: '未匹配关键词，默认为常规咨询',
      responseStrategy: '四步决策框架分析 + 建议 + 边界声明',
    };
  }
}
