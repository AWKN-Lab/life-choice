import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderType } from '../llm-providers/llm-providers.service';

/**
 * Phase 5 T5.3: 智能 Provider 选择
 * - 按问题类型（routeType）路由到最合适的 LLM Provider
 * - 路由策略：
 *   - clarify（追问澄清）：cheap provider（短回复，低成本）
 *   - quming（取名）：minimax（长上下文，reasoning_split 支持）
 *   - zhangsheng（张半山深度推演）：minimax（长上下文 + 推理）
 *   - liuren/ziping/qimen/liuyao/ziwei（推理型）：default provider
 *   - 默认：default provider
 * - 受 LLM_ROUTER_ENABLED 开关控制（默认关闭，开启时按路由表选择）
 */
export type RouteType =
  | 'ziping'
  | 'liuren'
  | 'clarify'
  | 'quming'
  | 'qimen'
  | 'liuyao'
  | 'ziwei'
  | 'zhangsheng'
  | string;

export interface RouteContext {
  routeType: RouteType;
  /** 用户当前问题长度（短问题倾向用 cheap provider） */
  questionLength?: number;
  /** 用户会员等级（vip 倾向用更高质量 provider） */
  membershipTier?: 'free' | 'member' | 'vip';
  /** 是否为高复杂度任务（如深度推演、取名） */
  isHighComplexity?: boolean;
}

export interface RouteDecision {
  provider: LlmProviderType;
  reason: string;
  /** 备选 provider（首选不可用时降级） */
  fallback: LlmProviderType;
}

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);
  private readonly enabled: boolean;

  /**
   * 路由表：routeType → 偏好 provider
   * 可通过 env LLM_ROUTER_TABLE 覆盖（JSON 格式）
   */
  private readonly routeTable: Record<string, LlmProviderType>;

  constructor() {
    this.enabled = process.env.LLM_ROUTER_ENABLED === '1' || process.env.LLM_ROUTER_ENABLED === 'true';
    this.routeTable = this.loadRouteTable();
    this.logger.log(
      `[LlmRouter] enabled=${this.enabled} table=${JSON.stringify(this.routeTable)}`,
    );
  }

  private loadRouteTable(): Record<string, LlmProviderType> {
    const defaultTable: Record<string, LlmProviderType> = {
      clarify: 'sensenova',          // 追问：短回复，用 cheap
      quming: 'minimax',             // 取名：长上下文，用 minimax
      zhangsheng: 'minimax',         // 张半山深度推演：长上下文 + 推理
      ziping: 'sensenova',           // 子平：默认推理
      liuren: 'sensenova',           // 六壬：默认推理
      qimen: 'sensenova',            // 奇门：默认推理
      liuyao: 'sensenova',           // 六爻：默认推理
      ziwei: 'sensenova',            // 紫微：默认推理
    };

    const envTable = process.env.LLM_ROUTER_TABLE;
    if (!envTable) return defaultTable;

    try {
      const parsed = JSON.parse(envTable) as Record<string, LlmProviderType>;
      // 合并：env 覆盖默认
      return { ...defaultTable, ...parsed };
    } catch (err) {
      this.logger.warn(`[LlmRouter] LLM_ROUTER_TABLE 解析失败，使用默认: ${(err as Error).message}`);
      return defaultTable;
    }
  }

  /**
   * 判断 provider 是否可用（apiKey 已配置）
   * 注：此处仅做简单启发式判断，真实可用性由 LlmProvidersService 的熔断器/限流器保障
   */
  private isProviderLikelyAvailable(provider: LlmProviderType): boolean {
    const envKey = `${provider.toUpperCase().replace('-', '_')}_API_KEY`;
    return !!process.env[envKey];
  }

  /**
   * 根据上下文选择 provider
   */
  selectProvider(
    ctx: RouteContext,
    defaults: { defaultProvider: LlmProviderType; cheapProvider: LlmProviderType },
  ): RouteDecision {
    // 未启用智能路由：直接返回 defaultProvider
    if (!this.enabled) {
      return {
        provider: defaults.defaultProvider,
        reason: 'router_disabled_use_default',
        fallback: defaults.cheapProvider,
      };
    }

    // 1. 高复杂度任务 → minimax（若可用）
    if (ctx.isHighComplexity && this.isProviderLikelyAvailable('minimax')) {
      return {
        provider: 'minimax',
        reason: `high_complexity_route_${ctx.routeType}`,
        fallback: defaults.defaultProvider,
      };
    }

    // 2. VIP 用户 + 推理型任务 → minimax（更高质量）
    if (ctx.membershipTier === 'vip' && this.isProviderLikelyAvailable('minimax')) {
      const reasoningTypes = ['ziping', 'liuren', 'qimen', 'liuyao', 'ziwei'];
      if (reasoningTypes.includes(ctx.routeType)) {
        return {
          provider: 'minimax',
          reason: `vip_reasoning_route_${ctx.routeType}`,
          fallback: defaults.defaultProvider,
        };
      }
    }

    // 3. 查路由表
    const routed = this.routeTable[ctx.routeType];
    if (routed && this.isProviderLikelyAvailable(routed)) {
      return {
        provider: routed,
        reason: `route_table_${ctx.routeType}`,
        fallback: routed === defaults.defaultProvider
          ? defaults.cheapProvider
          : defaults.defaultProvider,
      };
    }

    // 4. 短问题（clarify 类）→ cheap provider
    if (ctx.routeType === 'clarify' || (ctx.questionLength !== undefined && ctx.questionLength < 20)) {
      return {
        provider: defaults.cheapProvider,
        reason: 'short_question_use_cheap',
        fallback: defaults.defaultProvider,
      };
    }

    // 5. 默认
    return {
      provider: defaults.defaultProvider,
      reason: 'fallback_default',
      fallback: defaults.cheapProvider,
    };
  }

  /**
   * 获取路由表（用于调试 / 管理端展示）
   */
  getRouteTable(): Record<string, LlmProviderType> {
    return { ...this.routeTable };
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
