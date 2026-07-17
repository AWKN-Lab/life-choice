export type FrontdeskMode = 'naming' | 'question';
export type FrontdeskRenderAs = 'page' | 'sheet';

/**
 * 对话前台阶段机
 *
 * 基础阶段（已实现）：
 *  - input：用户输入问题
 *  - clarify：澄清追问（LLM 驱动）
 *  - submitting：提交中（等待引擎响应）
 *  - preview：结果预览
 *  - deepening：深度解读（付费解锁）
 *  - followup：追问
 *  - error_retry：错误重试
 *
 * P2-T3.2 liuren 起卦时间迁入对话流（新增）：
 *  - liuren_ask_time：六壬起卦时间采集（默认当前时间，用户可修改）
 *  - liuren_ask_location：六壬起卦地点采集（用于真太阳时校正）
 *
 * P2-T3.3 ziping 档案引导迁入对话流（新增）：
 *  - ziping_profile_check：检查用户是否有八字档案
 *  - ziping_profile_choice：用户选择（使用已有档案/重新生成/跳过）
 */
export type FrontdeskQuestionPhase =
  | 'input'
  | 'clarify'
  | 'submitting'
  | 'preview'
  | 'deepening'
  | 'followup'
  | 'error_retry'
  // P2-T3.2: liuren 起卦时间迁入对话流
  | 'liuren_ask_time'
  | 'liuren_ask_location'
  // P2-T3.3: ziping 档案引导迁入对话流
  | 'ziping_profile_check'
  | 'ziping_profile_choice';

export interface FrontdeskChatProps {
  mode: FrontdeskMode;
  onClose?: () => void;
  renderAs?: FrontdeskRenderAs;
}

export interface FrontdeskQuickOption {
  label: string;
  value: string;
}

export interface FrontdeskStep {
  key: string;
  type: 'chat' | 'form';
}

export interface FrontdeskConfig {
  mode: FrontdeskMode;
  titleKey: string;
  subtitleKey: string;
  greetingKey: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  accentHoverBg: string;
  quickOptions?: FrontdeskQuickOption[];
  steps: FrontdeskStep[];
}
