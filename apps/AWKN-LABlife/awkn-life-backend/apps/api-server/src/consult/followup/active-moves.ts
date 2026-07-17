/**
 * P2-5: 10 场景主动出击配置
 *
 * 10 个场景：
 * - key_date_before：关键日期前 1 天
 * - contract_eve：合同前 1 天
 * - action_window：行动窗口期
 * - cash_collect：现金流收集
 * - quarter_review：季度回顾
 * - annual_review：年度回顾
 * - new_window：新窗口期
 * - old_judgment_fix：旧判断修正
 * - silent_user：沉默用户唤醒
 * - anniversary：周年回顾
 */

export interface ActiveMoveScenario {
  // 场景描述
  description: string;
  // 消息模板
  messageTemplate: string;
  // 根据 context 计算延迟天数
  computeDelay: (context?: {
    keyDate?: Date;
    contractDate?: Date;
    lastActiveAt?: Date;
    issueId?: string;
  }) => number;
}

export const ACTIVE_MOVE_SCENARIOS: Record<string, ActiveMoveScenario> = {
  // 1. 关键日期前 1 天
  key_date_before: {
    description: '关键日期前 1 天提醒',
    messageTemplate: '明天就是你提到的关键日期了，准备好应对了吗？',
    computeDelay: (ctx) => {
      if (!ctx?.keyDate) return 1;
      const diffMs = ctx.keyDate.getTime() - Date.now() - 1 * 86400000;
      return Math.max(1, Math.ceil(diffMs / 86400000));
    },
  },

  // 2. 合同前 1 天
  contract_eve: {
    description: '合同到期前 1 天提醒',
    messageTemplate: '你的合同明天就到期了，续约还是另作打算？',
    computeDelay: (ctx) => {
      if (!ctx?.contractDate) return 1;
      const diffMs = ctx.contractDate.getTime() - Date.now() - 1 * 86400000;
      return Math.max(1, Math.ceil(diffMs / 86400000));
    },
  },

  // 3. 行动窗口期（咨询后 3 天）
  action_window: {
    description: '行动窗口期跟进',
    messageTemplate: '上次咨询后这三天，你按计划行动了吗？遇到什么情况了？',
    computeDelay: () => 3,
  },

  // 4. 现金流收集（咨询后 7 天）
  cash_collect: {
    description: '现金流情况收集',
    messageTemplate: '这周资金周转怎么样？上次说的那个投资决定做了吗？',
    computeDelay: () => 7,
  },

  // 5. 季度回顾（90 天）
  quarter_review: {
    description: '季度回顾',
    messageTemplate: '三个月过去了，上次判断的事情发展得怎么样？我们来复盘一下。',
    computeDelay: () => 90,
  },

  // 6. 年度回顾（365 天）
  annual_review: {
    description: '年度回顾',
    messageTemplate: '一年了，回头看看去年的判断哪些应验了，哪些需要修正。',
    computeDelay: () => 365,
  },

  // 7. 新窗口期（咨询后 14 天）
  new_window: {
    description: '新窗口期提醒',
    messageTemplate: '两周过去了，新的机会窗口出现了，要不要再看看？',
    computeDelay: () => 14,
  },

  // 8. 旧判断修正（咨询后 30 天）
  old_judgment_fix: {
    description: '旧判断修正',
    messageTemplate: '上次说的判断，这一个月实际情况有变化吗？需要修正吗？',
    computeDelay: () => 30,
  },

  // 9. 沉默用户唤醒（最后活跃后 30 天）
  silent_user: {
    description: '沉默用户唤醒',
    messageTemplate: '好久没来了，最近怎么样？上次问的事有进展吗？',
    computeDelay: (ctx) => {
      if (!ctx?.lastActiveAt) return 30;
      const diffMs = Date.now() - ctx.lastActiveAt.getTime();
      return Math.max(1, Math.ceil((30 * 86400000 - diffMs) / 86400000));
    },
  },

  // 10. 周年回顾（365 天）
  anniversary: {
    description: '周年回顾',
    messageTemplate: '今天是你的咨询周年，这一年最大的变化是什么？',
    computeDelay: () => 365,
  },
};

export const ACTIVE_MOVE_SCENARIO_KEYS = Object.keys(ACTIVE_MOVE_SCENARIOS);
