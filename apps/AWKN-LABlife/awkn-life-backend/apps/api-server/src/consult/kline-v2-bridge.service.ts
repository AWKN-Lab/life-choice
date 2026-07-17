/**
 * KlineV2BridgeService — consult 模块集成 V2 快照的桥接层（P1-07）
 *
 * 来源：TECHNICAL-REFERENCE-P01 §1.3 "ConsultService 统一读取 snapshot"
 *
 * 职责：
 *   - 提供 consult 模块读取 V2 快照的入口
 *   - 不再独立生成第二套正式 K 线
 *   - 兼容 V1 fallback：当 V2 未启用或无快照时回退到旧链路
 *
 * 不可做：
 *   - 生成数值（数值已在 snapshot 中）
 *   - 调用 LLM（LLM 由 ConsultService 调用）
 *   - 写入 DB（由 KlineSnapshotService 负责）
 */

import { Injectable, Logger, Inject, Optional, forwardRef } from '@nestjs/common';
import { KlineSnapshotService } from '../kline-tide/kline-snapshot.service';
import { KlineProductViewModelV2 } from '../kline-tide/v2-contracts';

// ============================================================
// 类型
// ============================================================

export interface ConsultKlineContext {
  /** 用户 ID */
  userId: string;
  /** 节点 ID（如来自问事路径） */
  nodeId?: string;
  /** 快照 ID（如已知） */
  snapshotId?: string;
}

export interface ConsultKlineResult {
  /** 数据来源：V2 快照 或 V1 fallback */
  source: 'v2-snapshot' | 'v1-fallback';
  /** V2 ViewModel（source='v2-snapshot' 时非空） */
  viewModel?: KlineProductViewModelV2;
  /** 节点（如 nodeId 指定） */
  node?: {
    id: string;
    monthLabel: string;
    nodeType: 'opportunity' | 'risk' | 'turn';
    score: number;
    summary: string;
    evidenceRefs: string[];
    confidence: number;
  };
  /** V2 是否启用 */
  v2Enabled: boolean;
  /** 降级原因（如 V1 fallback 时） */
  fallbackReason?: string;
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class KlineV2BridgeService {
  private readonly logger = new Logger(KlineV2BridgeService.name);

  constructor(
    @Optional() @Inject(forwardRef(() => KlineSnapshotService))
    private readonly snapshotService: KlineSnapshotService | null,
  ) {
    if (!snapshotService) {
      this.logger.warn('[KlineV2BridgeService] KlineSnapshotService 未注入，将始终走 V1 fallback');
    }
  }

  /**
   * 读取当前用户的 K 线 ViewModel
   *
   * 优先级：
   *   1. 若 KLINE_V2_ENABLED=true 且 snapshotService 可用 → 读取 V2 快照
   *   2. 若指定 snapshotId → 读取指定快照
   *   3. 否则 → 返回 V1 fallback 标记，由调用方走旧链路
   */
  async readKlineViewModel(ctx: ConsultKlineContext): Promise<ConsultKlineResult> {
    const v2Enabled = process.env.KLINE_V2_ENABLED === 'true';

    if (!v2Enabled) {
      return {
        source: 'v1-fallback',
        v2Enabled: false,
        fallbackReason: 'KLINE_V2_ENABLED=false',
      };
    }

    if (!this.snapshotService) {
      return {
        source: 'v1-fallback',
        v2Enabled: true,
        fallbackReason: 'KlineSnapshotService 未注入',
      };
    }

    try {
      let vm: KlineProductViewModelV2 | null = null;

      if (ctx.snapshotId) {
        vm = await this.snapshotService.getSnapshotById(ctx.snapshotId, ctx.userId);
      } else {
        vm = await this.snapshotService.getLatestSnapshot(ctx.userId);
      }

      if (!vm) {
        return {
          source: 'v1-fallback',
          v2Enabled: true,
          fallbackReason: '用户尚无 V2 快照',
        };
      }

      // 如指定 nodeId，从 windows 中查找
      let node: ConsultKlineResult['node'] | undefined;
      if (ctx.nodeId) {
        node = this.findNodeInViewModel(vm, ctx.nodeId);
        if (!node) {
          this.logger.warn(
            `[readKlineViewModel] nodeId=${ctx.nodeId} 在 snapshot ${vm.meta.snapshotId} 中未找到`,
          );
        }
      }

      return {
        source: 'v2-snapshot',
        viewModel: vm,
        node,
        v2Enabled: true,
      };
    } catch (err: any) {
      this.logger.error(
        `[readKlineViewModel] userId=${ctx.userId} 读取 V2 快照失败: ${err.message}`,
      );
      return {
        source: 'v1-fallback',
        v2Enabled: true,
        fallbackReason: `V2 读取异常: ${err.message}`,
      };
    }
  }

  /**
   * 查询节点所属的快照上下文（用于问事路径）
   */
  async resolveNodeContext(nodeId: string, userId: string): Promise<{
    snapshotId?: string;
    viewModel?: KlineProductViewModelV2;
    node?: ConsultKlineResult['node'];
  }> {
    // 此处需要查询 KlineNode → snapshotId → KlineSnapshot
    // 简化实现：依赖外部注入的 PrismaService
    // 实际实现可由 consult.service 直接调用 prisma
    return {};
  }

  // ============================================================
  // 私有
  // ============================================================

  private findNodeInViewModel(
    vm: KlineProductViewModelV2,
    nodeId: string,
  ): ConsultKlineResult['node'] | undefined {
    const allNodes = [
      ...vm.windows.opportunity,
      ...vm.windows.risk,
    ];

    const found = allNodes.find(n => n.id === nodeId);
    if (!found) return undefined;

    return {
      id: found.id,
      monthLabel: found.monthLabel,
      nodeType: found.nodeType,
      score: found.score,
      summary: found.summary,
      evidenceRefs: found.evidenceRefs,
      confidence: found.confidence,
    };
  }
}
