export interface ResultChatMessage {
  id: string;
  role: 'system' | 'user';
  type: 'text' | 'bazi-card' | 'liuren-card' | 'quming-card' | 'zhangbanshan' | 'report-section' | 'action-list' | 'risk-list' | 'vip-prompt' | 'tool-result' | 'timeline' | 'cost-warning' | 'memory-anchor' | 'five-layer' | 'step-card' | 'typing';
  content: string;
  metadata?: Record<string, any>;
}

export { BaziCardMessage } from './BaziCardMessage';
export { LiurenCardMessage } from './LiurenCardMessage';
export { QumingCardMessage } from './QumingCardMessage';
export { ZhangbanshanMessage } from './ZhangbanshanMessage';
export { ReportSectionMessage } from './ReportSectionMessage';
export { ActionListMessage } from './ActionListMessage';
export { RiskListMessage } from './RiskListMessage';
export { VipPromptMessage } from './VipPromptMessage';
export { ToolResultMessage } from './ToolResultMessage';
export { TimelineMessage } from './TimelineMessage';
export { TypingIndicator } from './TypingIndicator';
export { CostWarningMessage } from './CostWarningMessage';
export { MemoryAnchorMessage } from './MemoryAnchorMessage';
export { FiveLayerMessage } from './FiveLayerMessage';
export { StepCardMessage } from './StepCardMessage';
