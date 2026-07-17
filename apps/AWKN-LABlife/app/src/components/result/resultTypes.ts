import type { RouteType } from '@/types/api';

/** P1-4: 5 层输出结构（计划版字段名） */
export interface FiveLayerOutput {
  /** L1 数术断句：用术数语言陈述排盘结果 */
  clause: string;
  /** L2 半山落句：用张半山金句风格给出核心判断 */
  halfMountain: string;
  /** L3 具体落点：落到具体的人/事/时/数字 */
  detail: string;
  /** L4 代价提醒：说清放弃什么、面对什么 */
  cost: string;
  /** L5 下一步动作：给出可执行的下一步 */
  nextAction: string;
}

export const FIVE_LAYER_META: Array<{ key: keyof FiveLayerOutput; label: string; icon: string }> = [
  { key: 'clause', label: '数术断句', icon: 'visibility' },
  { key: 'halfMountain', label: '半山落句', icon: 'psychology' },
  { key: 'detail', label: '具体落点', icon: 'route' },
  { key: 'cost', label: '代价提醒', icon: 'checklist' },
  { key: 'nextAction', label: '下一步动作', icon: 'auto_awesome' },
];

export const MISSING_LAYER_PLACEHOLDER = '此层推演暂缺，请追问获取更深入分析';

/**
 * 任务 2.4: 人生状态窗口（前端版，与后端 LifeStageContext 对齐）
 * 来源：orchestrator.service.ts 将 lifeStage 写入 zhangbanshanOutput.life_stage
 */
export interface LifeStageContext {
  /** K线状态窗口（6态：breakthrough/attack/buildup/pullback/repair/wait） */
  klineStage?: {
    stage: string;
    stageLabel: string;
    reason: string;
    actionAdvice: string;
    windowTip: string;
    signalLabel?: string;
    tideScore?: number;
    targetDate?: string;
  };
  /** 12维潮汐状态（三组判断 + 综合相位） */
  tideStatus?: {
    phaseJudgment: string;
    shortDirective: string;
    windowTip: string;
    actionAdvice: string;
    timeStatus: { score: number; level: string; label: string };
    positionStatus: { score: number; level: string; label: string };
    mindStatus: { score: number; level: string; label: string };
    quadrant?: string;
    targetDate?: string;
  };
}

export interface UnifiedResult {
  route_type: RouteType;
  summary_line: string;
  summary_body: string;
  risks: string[];
  actions: string[];
  time_window: string;
  evidence_fold: string;
  paywall_modules: string[];
  record_id: string;
  currentQuestion?: string;
  qualityScore?: number;
  schemaValid?: boolean;
  provider?: string;
  model?: string;
  retryCount?: number;
  one_line_conclusion?: string;
  character_portrait?: string;
  label?: string;
  ranking?: string;
  paiPanVerification?: string;
  mingjuGuJia?: string;
  classicAnalysis?: string;
  daYunTheme?: string;
  keyYearPhenomenon?: string;
  futureYearsRhythm?: Array<{ year: string; theme: string; advice: string }>;
  monthlyFortune?: Array<{ period?: string; liuYue?: string; rating?: number; judgment?: string }>;
  modules?: { career?: string; wealth?: string; relationship?: string; health?: string };
  modulesRating?: { career?: number; wealth?: number; relationship?: number; health?: number };
  timeRhythm?: Array<{ period: string; phase: string; advice: string }>;
  stopDoingList?: string[];
  decisionAudit?: { rightOrWrong?: string; safetyMargin?: string; mvpPlan?: string };
  partnerPortrait?: { personality?: string; relationshipPattern?: string; keyIssues?: string[] };
  counterpart_portrait?: { willingness?: string; realConcerns?: string[] };
  mvpPlan?: { coreAction?: string; steps?: string[]; timeline?: string };
  guardianGuidance?: { approach?: string; rules?: string[]; doNotDo?: string[] };
  coreReasoning?: string;
  reasoningContent?: string;
  keySignals?: string[];
  timeWindows?: Array<{ period?: string; ganzhiDays?: string; suitable?: string; unsuitable?: string; fallback?: string }>;
  action_strategy?: string;
  evidence_tags?: string[];
  phased_calendar?: Array<{ period: string; goal: string; doThis: string[]; doNotDo: string[] }>;
  scripts?: { openingLine?: string; keyPhrases?: string[]; forbiddenPhrases?: string[] };
  success_signals?: string[];
  failure_signals?: string[];
  proposal_versions?: Array<{ version: string; when: string; content: string[] }>;
  module_content?: Record<string, any>;
  engine_data?: Record<string, unknown>;
  bazi?: {
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    dayGan?: string;
    naYin?: string;
  };
  wuxing_analysis?: {
    current?: Record<string, number>;
    missing?: string[];
    excessive?: string[];
    recommendation?: string;
  };
  xi_yong_shen?: {
    xi?: string[];
    yong?: string[];
    ji?: string[];
  };
  name_suggestions?: Array<{
    characters?: string[];
    names?: string[];
    name?: string;
    reason?: string;
    score?: number;
  }>;
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
      scores?: Record<string, number>;
    };
    daYun?: Array<{ startAge: number; endAge: number; gan: string; zhi: string }>;
    shenSha?: Record<string, string>;
    naYin?: { year?: string; month?: string; day?: string; time?: string };
    changSheng?: Record<string, string>;
    taiXi?: string;
    mingGong?: string;
    shenGong?: string;
  };
  zhangbanshan_output?: {
    judgment: string;
    premise?: string;  // U-P0-3: 前提字段（边界声明）
    cost: string;
    reasoning_trace: string;
    primary_agent: string;
    secondary_agent?: string;
    schedule_reason: string;
    agent_consistency?: 'consistent' | 'undetermined' | 'conflicting';
    arbitration_note?: string;
    /** P1-3: 两段式漏斗模式 */
    mode?: 'quick_read' | 'deep_consult';
    /** P1-3: 调度置信度 0-1 */
    confidence?: number;
    /** P2-2: 蛐蛐代价提醒 */
    costWarnings?: string[];
    /** P2-3: 是否需要代价确认环 */
    costConfirmationRequired?: boolean;
    /** P3-2: 记忆锚点 */
    memoryAnchor?: string;
    /** 任务 2.4: 人生状态窗口（K线6态 + 潮汐12维），由 orchestrator 注入 */
    life_stage?: LifeStageContext;
  };
  /** P1-2: 5 层输出结构 */
  fiveLayers?: FiveLayerOutput;
  /** P1-6: 付费分层 — 被锁定的层 key 列表（免费用户后3层 gated） */
  gatedLayers?: string[];
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
  /** P0-5: 知识库引用来源（RAG 检索结果，后端就绪后填充） */
  citations?: Array<{
    title: string;
    source: string;
    snippet: string;
  }>;
}
