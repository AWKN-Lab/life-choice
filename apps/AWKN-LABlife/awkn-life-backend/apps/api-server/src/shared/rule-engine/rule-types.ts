export type ConditionOp = 'eq' | 'neq' | 'in' | 'notIn' | 'contains' | 'gte' | 'lte' | 'between';

export interface ConditionClause {
  op: ConditionOp;
  value: unknown;
}

export interface Rule {
  id: string;
  category: string;
  priority: number;
  source: string;
  condition: Record<string, ConditionClause>;
  then: Record<string, unknown>;
}

export interface RuleSet {
  name: string;
  version: string;
  rules: Rule[];
}

export interface StructuredConclusion {
  method: string;
  summary: string;
  jixiong: '吉' | '凶' | '平' | '吉凶参半';
  riskLevel: '低' | '中' | '中高' | '高';
  riskDescription: string;
  triggeredShensha: { name: string; level: string; judgment: string; source: string }[];
  triggeredPatterns: { name: string; judgment: string; source: string }[];
  timeWindows: { period: string; theme: string; advice: string }[];
  doList: string[];
  dontList: string[];
  evidenceTags: string[];
}