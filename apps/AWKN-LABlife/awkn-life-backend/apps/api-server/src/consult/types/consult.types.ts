export interface BaziCalcData {
  yearPillar?: string
  monthPillar?: string
  dayPillar?: string
  hourPillar?: string
  yearShishen?: string
  monthShishen?: string
  dayShishen?: string
  hourShishen?: string
  wuxing?: Record<string, number>
  naYin?: { year?: string; month?: string; day?: string; hour?: string }
  daYun?: DaYunItem[]
  ziweiSummary?: ZiweiSummary
  mingGong?: string
  shenGong?: string
  shenSha?: Record<string, string[]>
  kongWang?: string[]
  taiYuan?: string
  zangganShishen?: unknown
  changsheng?: unknown
  xingChongHeHai?: { he?: unknown[]; chong?: unknown[]; hai?: unknown[]; xing?: unknown[] }
  liuNian?: unknown[]
  [key: string]: unknown
}

export interface DaYunItem {
  full?: string
  gan?: string
  zhi?: string
  startAge?: number
  endAge?: number
  age?: number
  index?: number
  [key: string]: unknown
}

export interface ZiweiSummary {
  mingGong?: { ganZhi?: string; majorStars?: string[]; [key: string]: unknown }
  sihua?: {
    lu?: Array<{ star: string; [key: string]: unknown }>
    quan?: Array<{ star: string; [key: string]: unknown }>
    ke?: Array<{ star: string; [key: string]: unknown }>
    ji?: Array<{ star: string; [key: string]: unknown }>
  }
  fiveElementsClass?: string
  shenGongName?: string
  [key: string]: unknown
}

export interface CalcResult {
  calcData?: BaziCalcData
  inputData?: {
    birthDate?: string
    birthTime?: string
    birthPlace?: string
    gender?: string
    birth_date?: string
    birth_time?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface LlmResult {
  route_type?: string
  sourceType?: string
  provider?: string
  model?: string
  schemaValid?: boolean
  summary_line?: string
  summary_body?: string
  overview?: string
  risks?: string[]
  actions?: string[]
  time_window?: string
  time_windows?: unknown[]
  evidence_fold?: string
  evidence_summary?: string
  evidence_tags?: string[]
  algorithm_profile?: Record<string, unknown>
  paywall_modules?: string[]
  celebrity_comparison?: unknown
  llm_fallback?: boolean
  [key: string]: unknown
}

export interface SessionContext {
  birthDate?: string
  birthTime?: string
  gender?: string
  parentWishWords?: string[]
  avoidChars?: string[]
  surname?: string
  [key: string]: unknown
}

export interface ConsultRecord {
  id: string
  routeType: string
  question: string
  summaryLine?: string
  inputData?: string
  analysisData?: string
  createdAt?: string
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

export interface KlineContent {
  title: string
  subtitle: string
  overview: string
  llmTimeout?: boolean
  retryable?: boolean
  noCharge?: boolean
  chartData: unknown[]
  yearData: unknown[]
  yearMonthData: unknown[]
  rangeYears: number
  monthlyData: unknown[]
  viewMode: string
  currentAge?: number
  currentDaYun?: unknown
  confidence?: number
  bestWindow?: string
  riskWindow?: string
  trends: unknown[]
  key_nodes: unknown[]
  wuxing_analysis: unknown
  dayun_analysis: unknown[]
  ma_data?: unknown
  daily_fortune?: unknown
  celebrity_comparisons?: unknown[]
  meta?: {
    birthDate?: string
    birthTime?: string
    gender?: string
    yearPillar?: string
    monthPillar?: string
    dayPillar?: string
    hourPillar?: string
    wuxing?: unknown
    naYin?: unknown
    kline?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface ModuleContent {
  title?: string
  timeout?: boolean
  retryable?: boolean
  noCharge?: boolean
  message?: string
  [key: string]: unknown
}

export interface ConsultResponse {
  route_type: string
  record_id: string
  summary_line: string
  summary_body: string
  risks: string[]
  actions: string[]
  time_window: string
  evidence_fold: string
  paywall_modules: string[]
  calc_result: unknown
  sourceType: string
  provider?: string
  model?: string
  llm_fallback?: boolean
  evidence_tags?: string[]
  algorithm_profile?: Record<string, unknown>
  celebrity_comparison?: unknown
  module_id?: string
  module_content?: unknown
  module_cached?: boolean
  createdAt?: string
  [key: string]: unknown
}

export interface ZiweiPalace {
  name: string
  ganZhi?: string
  majorStars?: ZiweiStar[]
  minorStars?: ZiweiStar[]
  door?: { name: string }
  [key: string]: unknown
}

export interface ZiweiStar {
  name: string
  mutagen?: string
  brightness?: string
  [key: string]: unknown
}

export interface LiurenSiKeItem {
  keName?: string
  gan?: string
  zhi?: string
  [key: string]: unknown
}

export interface LiurenSanChuanItem {
  chuanName?: string
  gan?: string
  zhi?: string
  [key: string]: unknown
}

export interface LiuyaoYao {
  shiYing?: string
  liuQin?: string
  liuQinName?: string
  diZhi?: string
  [key: string]: unknown
}

export interface QimenPalace {
  name?: string
  door?: { name: string }
  star?: { name: string }
  shen?: { name: string }
  tianPanGan?: string
  diPanGan?: string
  [key: string]: unknown
}

export interface BaziFullResult {
  bazi?: BaziCalcData
  dayGan?: string
  dayZhi?: string
  dayWuxing?: string
  wuxing?: Record<string, number>
  shenWang?: string
  yongJi?: { yong: string[]; ji: string[] }
  currentDaYun?: DaYunItem
  naYin?: string
  [key: string]: unknown
}

export interface WuxingDerived {
  wuxingScores?: Record<string, number>
  balanceLevel?: string
  suggestions?: string[]
  [key: string]: unknown
}

export interface DailyTip {
  date: string
  lucky_color?: string
  lucky_direction?: string
  lucky_number?: number
  advice?: string
  [key: string]: unknown
}

export interface TimeWindowItem {
  period?: string
  description?: string
  confidence?: number
  [key: string]: unknown
}

export interface TrendItem {
  period: string
  direction: string
  score: number
  reason: string
  [key: string]: unknown
}

export interface KeyNodeItem {
  year: number
  age: number
  type: string
  description: string
  ganZhi?: string
  [key: string]: unknown
}

export interface DayunAnalysisItem {
  ganZhi: string
  ageRange: string
  score: number
  summary: string
  [key: string]: unknown
}

export interface KLinePoint {
  age: number
  score: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  evidenceTags?: string[]
  isCurrentYear?: boolean
  isDaYunChange?: boolean
  [key: string]: unknown
}

export interface KlineDriver {
  age: number
  direction: 'up' | 'down'
  tags: string[]
  evidence: string
}

export interface KlineTimeWindow {
  period: string
  description: string
  confidence: number
}

export interface KlineAspectResult {
  series: KLinePoint[]
  ma3: number[]
  ma11: number[]
  turningPoints: unknown[]
  bestWindows: KlineTimeWindow[]
  riskWindows: KlineTimeWindow[]
  drivers: KlineDriver[]
  confidence: number
}

export interface KlineResult {
  series: KLinePoint[]
  ma3: number[]
  ma11: number[]
  ma100: number[]
  turningPoints: unknown[]
  bestWindows: KlineTimeWindow[]
  riskWindows: KlineTimeWindow[]
  drivers: KlineDriver[]
  confidence: number
  aspects: {
    overall: KlineAspectResult
    career: KlineAspectResult
    wealth: KlineAspectResult
    relationship: KlineAspectResult
  }
}