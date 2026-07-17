/**
 * P2-1: ReAct 推理循环（学自 awkn-agent 的 ReAct loop）
 *
 * 循环步骤：THINK → ACT → OBSERVE → REFLECT → DONE
 * - THINK: 让 LLM 思考当前已知 + 还缺什么
 * - ACT: 选定下一步行动（工具调用 / 子智能体问询 / 提问用户）
 * - OBSERVE: 收集行动结果
 * - REFLECT: 评估结果是否足以回答原问题
 * - DONE: 已达成目标 → 输出最终判断
 *
 * 限制：最大 5 轮迭代，避免无限循环
 * 触发：mode === 'deep_consult' 且场景复杂度 ≥ 中 等（早 return 不进 ReAct）
 *
 * P0-3 修复（2026-07-04）：
 * - 引入 FactLedger 结构化管理出生信息/排盘/大运/流年/用户背景
 * - ask_user 时检查 FactLedger 已有字段，禁止重复追问
 * - think/reflect 阶段注入结构化 FactLedger，替代扁平 facts 的 1500 字符截断
 */
import { Injectable, Logger } from '@nestjs/common';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';

export type ReactAction =
  | { kind: 'tool'; tool: string; args: Record<string, any> }
  | { kind: 'subagent'; agent: string; question: string }
  | { kind: 'ask_user'; question: string }
  | { kind: 'conclude'; finalAnswer: string };

export interface ReactStep {
  iter: number;
  phase: 'think' | 'act' | 'observe' | 'reflect';
  content: string;
  action?: ReactAction;
  observation?: string;
  reflection?: string;
  done: boolean;
  ts: number;
}

export interface ReactRunResult {
  steps: ReactStep[];
  finalAnswer: string;
  totalIters: number;
  done: boolean;
  reason: 'completed' | 'max_iters' | 'no_tools' | 'error';
  /** P0-3: 被阻断的追问列表（已存在事实字段） */
  blockedClarifications?: string[];
}

/**
 * P0-3: 结构化事实账本
 * 出生信息、排盘结果、当前大运、流年、用户背景进入统一 FactLedger
 * 已存在字段禁止再次追问
 */
export interface FactLedger {
  birthInfo?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: string;
    formatted: string;
  };
  chartSnapshot?: {
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    dayGan?: string;
    wuxing?: any;
    formatted: string;
  };
  currentDaYun?: {
    startAge?: number;
    endAge?: number;
    gan?: string;
    zhi?: string;
    formatted: string;
  };
  currentLiuNian?: {
    year?: number;
    gan?: string;
    zhi?: string;
    formatted: string;
  };
  userContext?: {
    background?: string;
    concerns?: string[];
  };
  parallelResults?: {
    primary?: string;
    secondary?: string;
  };
}

const MAX_ITERS = 5;

/**
 * P0-3: 追问关键词 → FactLedger 字段映射
 * 当 ask_user 的 question 包含这些关键词时，检查对应字段是否已存在
 */
const CLARIFY_KEYWORD_TO_FIELD: Array<{ keywords: string[]; field: keyof FactLedger; label: string }> = [
  { keywords: ['出生', '生日', '出生日期', '出生时间', '几月', '几号', '哪年', '八字'], field: 'birthInfo', label: '出生信息' },
  { keywords: ['排盘', '四柱', '年柱', '月柱', '日柱', '时柱', '天干', '地支'], field: 'chartSnapshot', label: '排盘结果' },
  { keywords: ['大运', '运程'], field: 'currentDaYun', label: '当前大运' },
  { keywords: ['流年', '今年', '2026'], field: 'currentLiuNian', label: '当前流年' },
  { keywords: ['背景', '情况', '现状', '工作', '感情'], field: 'userContext', label: '用户背景' },
];

@Injectable()
export class ReactEngineService {
  private readonly logger = new Logger(ReactEngineService.name);

  constructor(private readonly llmProviders: LlmProvidersService) {}

  /**
   * 运行一次 ReAct 循环
   * - availableTools: 当前 orchestrator 可用的工具列表（字符串名）
   * - availableAgents: 可调用的子智能体列表
   * - contextFacts: 已有事实（八字/起卦结果/已调用的工具结果）
   * - factLedger: P0-3 结构化事实账本（出生信息/排盘/大运/流年/用户背景）
   */
  async run(input: {
    question: string;
    systemContext: string;
    availableTools?: string[];
    availableAgents?: string[];
    contextFacts?: Record<string, any>;
    /** P0-3: 结构化事实账本，已存在字段禁止再次追问 */
    factLedger?: FactLedger;
  }): Promise<ReactRunResult> {
    const steps: ReactStep[] = [];
    const facts: Record<string, any> = { ...(input.contextFacts || {}) };
    const factLedger: FactLedger = input.factLedger || {};
    const blockedClarifications: string[] = [];
    let finalAnswer = '';
    let done = false;
    let iter = 0;

    try {
      for (iter = 1; iter <= MAX_ITERS; iter++) {
        // THINK：让 LLM 思考下一步
        const think = await this.think(input.question, input.systemContext, facts, steps, factLedger);
        steps.push({ iter, phase: 'think', content: think.content, done: false, ts: Date.now() });
        this.logger.log(`[ReAct iter ${iter}] THINK: ${think.content.slice(0, 80)}`);

        // ACT：基于 think 输出生成 action
        const action = await this.act(think.content, input.availableTools || [], input.availableAgents || []);
        steps.push({ iter, phase: 'act', content: action.justification, action: action.action, done: false, ts: Date.now() });
        this.logger.log(`[ReAct iter ${iter}] ACT: ${action.action.kind} ${'tool' in action.action ? action.action.tool : ''}`);

        // P0-3: ask_user 阻断检查 — 已存在事实字段禁止重复追问
        if (action.action.kind === 'ask_user') {
          const blockedField = this.checkClarifyBlocked(action.action.question, factLedger);
          if (blockedField) {
            const blockMsg = `[ReAct iter ${iter}] ask_user 被阻断: 追问内容涉及「${blockedField.label}」，但 FactLedger 中已存在该字段`;
            this.logger.warn(blockMsg);
            blockedClarifications.push(`iter${iter}: ${action.action.question} → 阻断(${blockedField.label}已存在)`);
            // 强制收敛到已有事实答案
            finalAnswer = this.extractFinalFromFacts(facts, input.question, factLedger);
            steps.push({ iter, phase: 'reflect', content: blockMsg, reflection: blockMsg, done: true, ts: Date.now() });
            done = true;
            break;
          }
        }

        if (action.action.kind === 'conclude') {
          finalAnswer = action.action.finalAnswer;
          steps.push({ iter, phase: 'reflect', content: '模型判定已具备充分证据', reflection: '用户问题已可在当前证据下回答', done: true, ts: Date.now() });
          done = true;
          break;
        }

        // OBSERVE：执行 action 并收集结果
        const observation = await this.observe(action.action, facts);
        steps.push({ iter, phase: 'observe', content: observation.summary, observation: observation.summary, done: false, ts: Date.now() });
        facts[`iter${iter}_observation`] = observation.summary;
        if (observation.toolOutput) {
          facts[`iter${iter}_toolOutput`] = observation.toolOutput;
        }
        this.logger.log(`[ReAct iter ${iter}] OBSERVE: ${observation.summary.slice(0, 80)}`);

        // REFLECT：评估
        const reflect = await this.reflect(input.question, facts, observation.summary, factLedger);
        steps.push({ iter, phase: 'reflect', content: reflect.content, reflection: reflect.content, done: reflect.done, ts: Date.now() });
        this.logger.log(`[ReAct iter ${iter}] REFLECT done=${reflect.done}: ${reflect.content.slice(0, 80)}`);

        if (reflect.done) {
          finalAnswer = reflect.finalAnswer || this.extractFinalFromFacts(facts, input.question, factLedger);
          done = true;
          break;
        }
      }

      if (!done) {
        // 超限：强制总结
        finalAnswer = this.extractFinalFromFacts(facts, input.question, factLedger);
        this.logger.warn(`[ReAct] max iters ${MAX_ITERS} reached, fallback to fact-based answer`);
      }

      return { steps, finalAnswer, totalIters: iter, done, reason: done ? 'completed' : 'max_iters', blockedClarifications };
    } catch (err) {
      this.logger.error(`[ReAct] error: ${(err as Error).message}`);
      return { steps, finalAnswer: this.extractFinalFromFacts(facts, input.question, factLedger), totalIters: iter, done: false, reason: 'error', blockedClarifications };
    }
  }

  /**
   * P0-3: 检查 ask_user 追问是否被阻断
   * 若追问内容涉及 FactLedger 中已存在的字段，返回该字段信息
   */
  private checkClarifyBlocked(question: string, factLedger: FactLedger): { field: keyof FactLedger; label: string } | null {
    for (const mapping of CLARIFY_KEYWORD_TO_FIELD) {
      // 检查追问内容是否包含关键词
      const hasKeyword = mapping.keywords.some(kw => question.includes(kw));
      if (hasKeyword) {
        // 检查 FactLedger 中对应字段是否已存在
        if (factLedger[mapping.field]) {
          return { field: mapping.field, label: mapping.label };
        }
      }
    }
    return null;
  }

  private async think(question: string, systemContext: string, facts: Record<string, any>, history: ReactStep[], factLedger?: FactLedger): Promise<{ content: string }> {
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `${systemContext}

你处于 ReAct 推理循环。当前请你输出 THINK 步骤：基于已收集的事实，分析用户问题还缺什么关键信息、下一步该做什么。

要求：
- 1-2 句话
- 不要重复已知事实
- 直接回答"还缺什么"或"可以下结论了"`,
      },
      {
        role: 'user',
        content: this.buildThinkPrompt(question, facts, history, factLedger),
      },
    ];
    const resp = await this.llmProviders.chatWithFallback(messages, { maxTokens: 300, temperature: 0.3 });
    return { content: resp.content.trim() };
  }

  private async act(think: string, tools: string[], agents: string[]): Promise<{ action: ReactAction; justification: string }> {
    const allowedKinds = ['tool', 'subagent', 'ask_user', 'conclude'];
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `基于上面的 THINK 思考，输出下一步 ACT 行动。

可用工具：${tools.length > 0 ? tools.join(', ') : '（无）'}
可用子智能体：${agents.length > 0 ? agents.join(', ') : '（无）'}

严格输出 JSON：
{
  "kind": "${allowedKinds.join('|')}",
  // tool: { "tool": "工具名", "args": {"k": "v"} }
  // subagent: { "agent": "agent名", "question": "..." }
  // ask_user: { "question": "..." }
  // conclude: { "finalAnswer": "..." }
  "justification": "为什么选这个 action（1 句话）"
}

若 THINK 已显示可以下结论，必须选 "conclude"。`,
      },
      { role: 'user', content: think },
    ];
    try {
      const resp = await this.llmProviders.chatWithFallback(messages, { maxTokens: 400, temperature: 0.2, jsonMode: true });
      const parsed = JSON.parse(resp.content);
      return { action: this.normalizeAction(parsed, tools, agents), justification: parsed.justification || '' };
    } catch (err) {
      // 解析失败：兜底为 ask_user
      this.logger.warn(`[ReAct] act parse failed: ${(err as Error).message}`);
      return { action: { kind: 'ask_user', question: '你能补充一下你的具体处境吗？' }, justification: 'JSON 解析失败兜底' };
    }
  }

  private normalizeAction(parsed: any, tools: string[], agents: string[]): ReactAction {
    if (!parsed || !parsed.kind) return { kind: 'conclude', finalAnswer: '模型未输出有效 action' };
    switch (parsed.kind) {
      case 'tool':
        if (tools.includes(parsed.tool) && parsed.args) {
          return { kind: 'tool', tool: parsed.tool, args: parsed.args };
        }
        return { kind: 'conclude', finalAnswer: '指定工具不可用' };
      case 'subagent':
        if (agents.includes(parsed.agent)) {
          return { kind: 'subagent', agent: parsed.agent, question: parsed.question || '' };
        }
        return { kind: 'conclude', finalAnswer: '指定子智能体不可用' };
      case 'ask_user':
        return { kind: 'ask_user', question: parsed.question || '请补充信息' };
      case 'conclude':
        return { kind: 'conclude', finalAnswer: parsed.finalAnswer || '已得出结论' };
      default:
        return { kind: 'conclude', finalAnswer: '未知 action 类型' };
    }
  }

  private async observe(action: ReactAction, facts: Record<string, any>): Promise<{ summary: string; toolOutput?: any }> {
    if (action.kind === 'tool') {
      // 工具调用由 orchestrator 外部完成；这里只占位（不真的执行）
      return { summary: `工具 ${action.tool} 应被调用，args=${JSON.stringify(action.args)}` };
    }
    if (action.kind === 'subagent') {
      return { summary: `子智能体 ${action.agent} 应被问询：${action.question}` };
    }
    if (action.kind === 'ask_user') {
      return { summary: `应问用户：${action.question}` };
    }
    return { summary: '已得出结论' };
  }

  private async reflect(question: string, facts: Record<string, any>, latest: string, factLedger?: FactLedger): Promise<{ content: string; done: boolean; finalAnswer?: string }> {
    const factLedgerSection = this.formatFactLedger(factLedger);
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `基于累积的事实和最近一次 observation，评估是否已具备充分证据回答原问题。

${factLedgerSection ? `【结构化事实账本 FactLedger】
${factLedgerSection}

注意：以上 FactLedger 中的字段均为已确认事实，不需要再追问用户。
` : ''}
严格输出 JSON：
{
  "done": true | false,
  "content": "1-2 句评估",
  "finalAnswer": "若 done=true，给出最终回答"
}`,
      },
      {
        role: 'user',
        content: `原问题：${question}

累积事实：
${JSON.stringify(facts, null, 2).slice(0, 1500)}

最近 observation：${latest}`,
      },
    ];
    try {
      const resp = await this.llmProviders.chatWithFallback(messages, { maxTokens: 500, temperature: 0.3, jsonMode: true });
      const parsed = JSON.parse(resp.content);
      return { content: parsed.content || '', done: !!parsed.done, finalAnswer: parsed.finalAnswer };
    } catch (err) {
      this.logger.warn(`[ReAct] reflect parse failed: ${(err as Error).message}`);
      return { content: 'JSON 解析失败，强制收敛', done: true, finalAnswer: this.extractFinalFromFacts(facts, question, factLedger) };
    }
  }

  private buildThinkPrompt(question: string, facts: Record<string, any>, history: ReactStep[], factLedger?: FactLedger): string {
    const historyLines = history.slice(-3).map(s => `[iter ${s.iter} ${s.phase}] ${s.content.slice(0, 100)}`).join('\n');
    const factLedgerSection = this.formatFactLedger(factLedger);
    return `原问题：${question}

${factLedgerSection ? `【结构化事实账本 FactLedger】
${factLedgerSection}

注意：以上 FactLedger 中的字段均为已确认事实，不需要再追问用户。
` : ''}已知事实（动态累积）：
${JSON.stringify(facts, null, 2).slice(0, 1500)}

最近推理步骤：
${historyLines || '（无）'}

请输出下一步 THINK。`;
  }

  /**
   * P0-3: 格式化 FactLedger 为可读文本，注入 LLM prompt
   */
  private formatFactLedger(factLedger?: FactLedger): string {
    if (!factLedger) return '';
    const lines: string[] = [];
    if (factLedger.birthInfo) {
      lines.push(`- 出生信息: ${factLedger.birthInfo.formatted}`);
    }
    if (factLedger.chartSnapshot) {
      lines.push(`- 排盘结果: ${factLedger.chartSnapshot.formatted}`);
    }
    if (factLedger.currentDaYun) {
      lines.push(`- 当前大运: ${factLedger.currentDaYun.formatted}`);
    }
    if (factLedger.currentLiuNian) {
      lines.push(`- 当前流年: ${factLedger.currentLiuNian.formatted}`);
    }
    if (factLedger.userContext?.background) {
      lines.push(`- 用户背景: ${factLedger.userContext.background}`);
    }
    if (factLedger.parallelResults?.primary) {
      lines.push(`- 主Agent结果: ${factLedger.parallelResults.primary}`);
    }
    return lines.length > 0 ? lines.join('\n') : '';
  }

  private extractFinalFromFacts(facts: Record<string, any>, question: string, factLedger?: FactLedger): string {
    // P0-3: 优先从 FactLedger 提取结构化事实
    const factLedgerSection = this.formatFactLedger(factLedger);
    // 从 facts 中提取可能的最终答案（兜底）
    const keys = Object.keys(facts);
    const lastObs = keys.filter(k => k.startsWith('iter')).pop();
    if (lastObs && factLedgerSection) {
      return `基于已有事实：${factLedgerSection}。动态观察：${(facts[lastObs] as string).slice(0, 200)}。原问题：${question.slice(0, 50)}`;
    }
    if (factLedgerSection) {
      return `基于已有事实：${factLedgerSection}。原问题：${question.slice(0, 80)}`;
    }
    if (lastObs) {
      return `基于已有信息：${(facts[lastObs] as string).slice(0, 200)}。原问题：${question.slice(0, 50)}`;
    }
    return `已分析但未明确结论。原问题：${question.slice(0, 80)}`;
  }
}
