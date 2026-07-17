/**
 * API 类型定义 - 对接后端
 */
export interface RouteRequest {
  question_text: string;
}

// 四引擎路由类型
export type RouteType = 'liuren' | 'ziping' | 'liuyao' | 'qimen' | 'quming' | 'zhangsheng' | 'clarify' | 'ziwei';

export interface RouteResponse {
  record_id?: string;
  sessionId?: string;  // 后端返回的会话ID
  route_type: RouteType;
  need_clarify: boolean;
  required_fields: string[];
  next_step: string;
  clarify_question?: string;
  /** 引擎置信度，0-1（用于 UI 展示或下游逻辑） */
  confidence?: number;
  /** 推理说明文本（用于 UI 展示） */
  reasoning?: string;
}

export interface InfoSubmit {
  sessionId: string;
  routeType: string;
  question: string;
  askTime?: string;
  askLocation?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: string;
  isTimeUnknown?: boolean;
}

export interface ResultResponse {
  [key: string]: any;
  record_id: string;
  route_type: string;
  summary_line: string;
  summary_body: string;
  risk_block: string[];
  action_block: string[];
  window_block: string;
  time_window?: string;  // 备选时间窗口字段
  evidence_fold: string;
  paywall_modules: string[];
  llmFallback?: boolean;
  overview?: string;  // 备选概览字段
  module_content?: Record<string, any>;  // VIP模块内容
  status?: 'processing' | 'completed' | 'failed';  // 记录状态
  /** 算法层完整八字数据 */
  calc_result?: {
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    yearShishen?: string;
    monthShishen?: string;
    dayShishen?: string;
    hourShishen?: string;
    wuxing?: {
      ming?: string;
      year?: string;
      month?: string;
      day?: string;
      hour?: string;
      scores?: { wood?: number; fire?: number; earth?: number; metal?: number; water?: number };
    };
    daYun?: Array<{ 
      age?: string; 
      year?: string; 
      gan: string; 
      zhi: string;
      startAge?: number;
      endAge?: number;
    }>;
    shenSha?: Record<string, string>;
    shenShaByPillar?: {
      year?: string[];
      month?: string[];
      day?: string[];
      hour?: string[];
    };
    naYin?: { year?: string; month?: string; day?: string; hour?: string };
    kongWang?: { year?: string; month?: string; day?: string; hour?: string };
    changSheng?: Record<string, string>;
    changsheng?: { year?: string; month?: string; day?: string; hour?: string };
    zangganShishen?: {
      year?: string[];
      month?: string[];
      day?: string[];
      hour?: string[];
    };
    subStars?: {
      year?: string[];
      month?: string[];
      day?: string[];
      hour?: string[];
    };
    selfSeat?: Record<string, string>;
    taiXi?: string;
    mingGong?: string;
    shenGong?: string;
    calcData?: any;
  };
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
  toolResults?: Array<{
    toolName: string;
    toolOutput: string;
    llmInterpretation: string;
    confidence: number;
  }>;
  timelineEvents?: Array<{
    date: string;
    event: string;
    dayunRange?: string;
    liunianGanZhi?: string;
    source: 'user_stated' | 'system_inferred';
  }>;
}

export interface ClarifyAnswerRequest {
  question_text: string;
  answer: string;
}

export interface SaveRecordRequest {
  record_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface WxLoginRequest {
  wxOpenId: string;
  nickname?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname?: string;
    isAdmin?: boolean;
    creditBalance?: number;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  timezone?: string;
  membership?: {
    planId: string;
    planName: string;
    status: string;
    expireDate?: string;
  };
}

export interface CreateOrderRequest {
  productType: 'membership' | 'single';
  productId: string;
  paymentMethod: 'stripe' | 'wechat' | 'alipay';
  amount: number;
  currency?: string;
}

export interface OrderResponse {
  orderId: string;
  paymentUrl?: string;
  amount: number;
  currency: string;
}

export interface OrderStatus {
  orderId: string;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  amount: number;
  currency: string;
  productType: string;
  productId: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  features: string[];
  highlight?: string;
}

export interface CurrentMembership {
  membershipId: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  expireDate?: string;
  features: string[];
}

export interface UnlockResult {
  success: boolean;
  reason?: string;
  requiredPlan?: string;
}

export interface PersonProfile {
  id: string;
  name?: string;
  gender?: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  naYin: { year?: string; month?: string; day?: string; hour?: string } | null;
  kongWang: string[] | null;
  changSheng: { year?: string; month?: string; day?: string; hour?: string } | null;
  selfSeat: { year?: string; month?: string; day?: string; hour?: string } | null;
  shenShaByPillar: { year?: string[]; month?: string[]; day?: string[]; hour?: string[] } | null;
  shenSha?: Record<string, string[]>;
  recordsCount: number;
  latestRecordTime?: string;
  latestRecordId: string | null;
}

export interface PersonProfilesResponse {
  profiles: PersonProfile[];
  total: number;
}
