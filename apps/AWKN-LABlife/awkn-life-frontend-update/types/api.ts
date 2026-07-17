/**
 * API 类型定义 - 对接后端
 */
export interface RouteRequest {
  question_text: string;
}

export interface RouteResponse {
  recordId?: string;
  routeType: 'liuren' | 'ziping' | 'clarify';
  needClarify: boolean;
  requiredFields: string[];
  nextStep: string;
  clarifyingQuestion?: string;
}

export interface InfoSubmit {
  sessionId?: string;
  routeType: 'liuren' | 'ziping';
  question?: string;
  askTime?: string;
  askLocation?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: string;
  timeUnknown?: boolean;
}

export interface ResultResponse {
  recordId: string;
  routeType: string;
  summaryLine: string;
  summaryBody: string;
  risks: string[];
  actions: string[];
  timeWindows: string[];
  evidenceFold: string;
  paywallModules: string[];
  llmFallback?: boolean;
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