// 咨询类型（四引擎+取名+断事+紫微）
export type ConsultType = 'liuren' | 'ziping' | 'liuyao' | 'qimen' | 'quming' | 'zhangsheng' | 'ziwei' | 'clarify';

// 咨询请求
export interface ConsultRequest {
  question: string;
  timestamp: number;
}

// 断事线信息 (断事推演)
export interface DivinationInfo {
  ask_time: string;
  ask_location: string;
}

// 命理线信息 (东方命理)
export interface DestinyInfo {
  birth_date: string;
  birth_time: string;
  birth_location: string;
}

// 咨询响应
export interface ConsultResponse {
  type: ConsultType;
  // 结果页结构对齐
  summary_line: string; // 一句准话
  summary_body: string; // 解释
  risks: string[];       // 风险提示
  actions: string[];     // 行动建议
  time_window: string;  // 时间窗口
  evidence_fold: string; // 推演依据（折叠内容）
  paywall_modules: string[]; // 会员承接模块ID集合
  record_id: string;    // 咨询记录ID
  userId?: string;      // 关联用户ID（可选）
  calc_result?: any;    // 八字计算结果（用于人生K线图）
  module_content?: Record<string, any>; // 已生成的会员模块内容缓存
  /** 实际应验结果（用于历史回顾 / 效果验证） */
  actualOutcome?: string;
  zhangbanshan_output?: {
    judgment: string;
    cost: string;
    reasoning_trace: string;
    primary_agent: string;
    secondary_agent?: string;
    schedule_reason: string;
    agent_consistency?: 'consistent' | 'undetermined' | 'conflicting';
    arbitration_note?: string;
  };
}

// 会员等级
export type MembershipTier = 'free' | 'monthly' | 'yearly' | 'single';

// 会员权益
export interface MembershipBenefit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// 会员套餐
export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  period: string;
  description: string;
  benefits: string[];
  highlighted?: boolean;
}

// 用户
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  membership: MembershipTier;
  membershipExpiry?: Date;
  consultQuota: number;
  creditBalance?: number;
  createdAt: Date;
  isAdmin?: boolean;
  // 兼容字段（部分历史代码/组件使用）
  plan?: MembershipTier | string;
  membershipLevel?: MembershipTier;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  nickname?: string;
}

// 咨询记录
export interface ConsultRecord {
  id: string;
  userId: string;
  question: string;
  type: ConsultType;
  response: ConsultResponse;
  createdAt: Date;
  saved: boolean;
}

// 语言
export type Language = 'zh-CN' | 'zh-TW' | 'en' | 'th' | 'vi' | 'id' | 'ms';

// 语言配置
export interface LanguageConfig {
  code: Language;
  name: string;
  nameLocal: string;
  flag: string;
}

// 快捷标签
export interface QuickTag {
  id: string;
  label: string;
  labelEn: string;
  query: string;
}

// 表单状态
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// 导航项
export interface NavItem {
  id: string;
  label: string;
  labelEn: string;
  href: string;
}

// 服务项
export interface ServiceItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  image: string;
}

// 客户评价
export interface Testimonial {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  content: string;
  contentEn: string;
  avatar: string;
  rating: number;
}

// 流程步骤
export interface ProcessStep {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
}

// Re-export lifekline types
export type { Gender, UserInput, KLinePoint, AnalysisData, LifeDestinyResult } from './lifekline';
