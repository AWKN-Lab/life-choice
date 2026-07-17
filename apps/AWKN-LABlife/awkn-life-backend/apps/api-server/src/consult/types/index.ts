export type RouteType = 'liuren' | 'ziping' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'meihua' | 'zhangsheng' | 'clarify';

export type {
  BaziCalcData,
  DaYunItem,
  ZiweiSummary,
  CalcResult,
  LlmResult,
  SessionContext,
  ConsultRecord,
  KlineContent,
  ModuleContent,
  ConsultResponse,
} from './consult.types';

export interface RouteDecision {
  routeType: RouteType;
  needClarify: boolean;
  requiredFields: string[];
  clarifyingQuestion?: string;
  nextStep: string;
}

export interface RouteRequest {
  question: string;
  userId?: string;
  sessionId?: string;
  source?: string;
  timezone?: string;
  device?: string;
}

export interface ConsultInput {
  routeType: RouteType;
  question: string;
  askTime?: string;
  askLocation?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: string;
  timeUnknown?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface ConsultResult {
  recordId: string;
  routeType: RouteType;
  summaryLine: string;
  summaryBody: string;
  risks: string[];
  actions: string[];
  timeWindows: string[];
  evidenceFold: string;
  paywallModules: string[];
  llmFallback: boolean;
}

export interface SaveConsultDto {
  recordId: string;
}
