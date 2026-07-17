export interface AgentRunLog {
  recordId: string;
  agentName: string;
  inputJson: unknown;
  matchedRules?: unknown[];
  outputJson: unknown;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  latencyMs: number;
  modelName?: string;
  promptVersion?: string;
  ruleVersion?: string;
  knowledgeVersion?: string;
  inputHash?: string;
  outputHash?: string;
  followUpId?: string;
  createdAt: string;
}
