/**
 * EvidenceComposer Lite 类型定义
 * 输入 chartSnapshot + matchedRules + userContext，输出 EvidencePackage
 */
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';
import { MatchedRule } from '../rule-matcher/rule-matcher.types';

export interface EvidenceComposerInput {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;
  };
  matchedRules: MatchedRule[];
  userContext: {
    background: string;
    concerns: string[];
  };
}

export interface KnowledgeFragment {
  ruleId: string;
  fragments: Array<{
    source: string;
    filePath: string;
    fragment: string;
    status: 'confirmed' | 'placeholder' | 'disabled';
    /** P0-5: fragment 内容的 sha256，运行时可重新计算校验 */
    sourceSha256?: string;
    /** P0-5: 知识版本标记，便于升级追溯 */
    edition?: string;
  }>;
}

export interface RuleBasedScore {
  evidenceCompleteness: number;   // 0-1
  decisionConfidence: number;     // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  decisionBias: 'proceed' | 'observe' | 'stop' | 'defer';
}

export interface EvidencePackage {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;
  };
  matchedRules: {
    high: MatchedRule[];
    medium: MatchedRule[];
    low: MatchedRule[];
  };
  knowledgeFragments: KnowledgeFragment[];
  userContext: {
    background: string;
    concerns: string[];
  };
  ruleBasedScore: RuleBasedScore;
  meta: {
    versions: {
      prompt: string;
      rules: string;
      knowledge: string;
    };
    createdAt: string;
  };
}
