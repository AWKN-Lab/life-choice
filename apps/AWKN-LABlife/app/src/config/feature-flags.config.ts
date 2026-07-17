/**
 * Feature Flag 注册表配置
 *
 * 每个 flag 的放量策略、描述、环境变量覆盖在此定义。
 * 被 feature-flag.ts 导入使用。
 *
 * 放量阶段：
 *   0    = 关闭（开发中/未上线）
 *   1-10 = 内测（内部员工 + 白名单）
 *   10-50 = 灰度（小范围用户）
 *   50-100 = 全量
 *   100  = 全部开启
 *
 * @author P0-1 基础设施
 * @date 2026-06-13
 */

export interface FlagRule {
  /** 放量百分比 0-100 */
  percentage: number;
  /** 功能描述 */
  description: string;
  /** 环境变量覆盖键名（优先级最高） */
  envKey: string;
  /** 所属整改阶段 */
  phase: string;
}

/**
 * Flag 注册表
 *
 * 修改规则：
 *   - 新增 flag 必须同步更新 feature-flag.ts 的 FlagKey 类型
 *   - percentage 变更需经灰度审批
 *   - 环境变量格式：VITE_FEATURE_xxx=true/false
 */
export const FLAG_REGISTRY: Record<string, FlagRule> = {
  // ── P1 速赢 ──────────────────────────────────────────
  divination_ritual_enabled: {
    percentage: 100,
    description: '仪式化加载动画（太极+粒子+八卦+步骤卡片）替代简单 spinner',
    envKey: 'VITE_FEATURE_DIVINATION_RITUAL',
    phase: 'P1-2',
  },
  expectation_management_enabled: {
    percentage: 100,
    description: '首次问事期望管理开场白（"我不是给你答案的人"）',
    envKey: 'VITE_FEATURE_EXPECTATION_MANAGEMENT',
    phase: 'P1-3',
  },

  // ── P1.5 安全兜底 ────────────────────────────────────
  high_risk_script_enabled: {
    percentage: 100,
    description: '高风险场景脚本化回复（"你准吗"/"该不该离婚"等）',
    envKey: 'VITE_FEATURE_HIGH_RISK_SCRIPT',
    phase: 'P1.5-1',
  },

  // ── P2 体验纵深 ──────────────────────────────────────
  cost_warning_enabled: {
    percentage: 10,
    description: '蛐蛐代价提醒系统（每轮输出附带 ⚠️ 代价提醒）',
    envKey: 'VITE_FEATURE_COST_WARNING',
    phase: 'P2-2',
  },
  cost_confirmation_enabled: {
    percentage: 5,
    description: '代价确认环（"你用自己的话说一遍代价"）',
    envKey: 'VITE_FEATURE_COST_CONFIRMATION',
    phase: 'P2-3',
  },

  // ── P3 闭环引擎 ──────────────────────────────────────
  callback_enabled: {
    percentage: 100,
    description: '回访系统（7天后主动回访 + 闭环数据记录）',
    envKey: 'VITE_FEATURE_CALLBACK',
    phase: 'P3-1',
  },
  memory_anchor_enabled: {
    percentage: 100,
    description: '记忆锚定（"上次你说XX，现在变了吗？"）',
    envKey: 'VITE_FEATURE_MEMORY_ANCHOR',
    phase: 'P3-2',
  },
  user_classifier_enabled: {
    percentage: 30,
    description: '用户状态分类器（随便逛逛/真有问题/重复问/来验证的）',
    envKey: 'VITE_FEATURE_USER_CLASSIFIER',
    phase: 'P3-3',
  },

  // ── P4 多轮对话 ──────────────────────────────────────
  multi_turn_enabled: {
    percentage: 100,
    description: '多轮对话架构（6态状态机 + SSE/WS + 对话UI）',
    envKey: 'VITE_FEATURE_MULTI_TURN',
    phase: 'P4',
  },

  // ── P1 速赢（视觉层） ─────────────────────────────────
  avatar_replacement_enabled: {
    percentage: 100,
    description: '张半山头像替换紫色 psychology 图标（35 号源图 + 64/128/1024 三档）',
    envKey: 'VITE_FEATURE_AVATAR_REPLACEMENT',
    phase: 'P1-1',
  },
};
