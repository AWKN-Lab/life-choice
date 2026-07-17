/**
 * useKlineProduct — V2 K线产品 Hook
 *
 * 替代 useTidePackage。直接消费 KlineProductViewModelV2，前端不再做本地业务计算。
 *
 * 端点契约：
 *   GET  /kline-v2                          — 最新 ViewModelV2（可能返回 {gated:true, moduleId}）
 *   GET  /kline-v2/snapshots/:snapshotId    — 指定快照
 *   POST /kline-v2/generate                 — 触发生成
 *   POST /kline-v2/nodes/:nodeId/ask        — 节点问事
 *   POST /kline-v2/nodes/:nodeId/outcome    — 结果回写
 *
 * 状态：
 *   - 200 + VM      → 正常数据
 *   - 200 + gated   → 权益不足，viewModel=null, gated=true
 *   - 403            → V2 未启用，degraded=true，degradedReason='V2 未启用'
 *   - 404            → 暂无快照，需 generate
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/api/client';
import type {
  KlineProductViewModelV2,
  KlineNode,
} from '@/types/kline-v2';

// ============================================================
// 类型
// ============================================================

/** Hook 共享状态 */
export interface KlineProductState {
  viewModel: KlineProductViewModelV2 | null;
  loading: boolean;
  error: Error | null;
  /** 权益不足：返回 {gated:true, moduleId} */
  gated: boolean;
  gatedModuleId?: string;
  /** V2 未启用或降级场景 */
  degraded: boolean;
  degradedReason?: string;
  /** 暂无快照，需要 generate */
  needsGenerate: boolean;
}

export interface UseKlineProductOptions {
  enabled?: boolean;
  snapshotId?: string;
}

export interface UseKlineProductResult extends KlineProductState {
  refetch: () => void;
  generate: () => Promise<KlineProductViewModelV2 | null>;
  askNode: (nodeId: string, question: string, questionType?: string) => Promise<string | null>;
  writeOutcome: (
    nodeId: string,
    result: 'occurred' | 'not_occurred' | 'partial',
    actualScore?: number,
    notes?: string,
  ) => Promise<string | null>;
}

// ============================================================
// 后端响应类型
// ============================================================

interface GatedResponse {
  gated: true;
  moduleId: string;
}

interface GenerateResponse {
  snapshotId: string;
  viewModel: KlineProductViewModelV2;
}

interface NodeAskResponse {
  consultRecordId: string;
  message: string;
}

interface NodeOutcomeResponse {
  outcomeId: string;
  message: string;
}

function isGatedResponse(raw: unknown): raw is GatedResponse {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { gated?: unknown }).gated === true &&
    typeof (raw as { moduleId?: unknown }).moduleId === 'string'
  );
}

// ============================================================
// Helper: 在 ViewModel 中按 nodeId 查找节点
// ============================================================

export function findNodeInViewModel(
  vm: KlineProductViewModelV2 | null,
  nodeId: string,
): KlineNode | null {
  if (!vm) return null;
  const inOpp = vm.windows.opportunity.find((n) => n.id === nodeId);
  if (inOpp) return inOpp;
  const inRisk = vm.windows.risk.find((n) => n.id === nodeId);
  if (inRisk) return inRisk;
  return null;
}

// ============================================================
// Hook 实现
// ============================================================

export function useKlineProduct(options?: UseKlineProductOptions): UseKlineProductResult {
  const enabled = options?.enabled ?? true;
  const snapshotId = options?.snapshotId;

  const [state, setState] = useState<KlineProductState>({
    viewModel: null,
    loading: enabled,
    error: null,
    gated: false,
    degraded: false,
    needsGenerate: false,
  });

  const fetch = useCallback(async () => {
    if (!enabled) {
      setState({
        viewModel: null,
        loading: false,
        error: null,
        gated: false,
        degraded: false,
        needsGenerate: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const endpoint = snapshotId
        ? `/kline-v2/snapshots/${encodeURIComponent(snapshotId)}`
        : '/kline-v2';
      const raw = await apiClient.get<unknown>(endpoint);

      // 权益门控
      if (isGatedResponse(raw)) {
        setState({
          viewModel: null,
          loading: false,
          error: null,
          gated: true,
          gatedModuleId: raw.moduleId,
          degraded: false,
          needsGenerate: false,
        });
        return;
      }

      setState({
        viewModel: raw as KlineProductViewModelV2,
        loading: false,
        error: null,
        gated: false,
        degraded: false,
        needsGenerate: false,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // 403: V2 未启用 → degraded
        if (err.statusCode === 403) {
          setState({
            viewModel: null,
            loading: false,
            error: null,
            gated: false,
            degraded: true,
            degradedReason: err.message || 'K线V2功能未启用',
            needsGenerate: false,
          });
          return;
        }
        // 404: 暂无快照 → needsGenerate
        if (err.statusCode === 404) {
          setState({
            viewModel: null,
            loading: false,
            error: null,
            gated: false,
            degraded: false,
            needsGenerate: true,
          });
          return;
        }
      }
      setState({
        viewModel: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
        gated: false,
        degraded: false,
        needsGenerate: false,
      });
    }
  }, [enabled, snapshotId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const generate = useCallback(async (): Promise<KlineProductViewModelV2 | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await apiClient.post<GenerateResponse>('/kline-v2/generate', {});
      setState({
        viewModel: res.viewModel,
        loading: false,
        error: null,
        gated: false,
        degraded: false,
        needsGenerate: false,
      });
      return res.viewModel;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
      return null;
    }
  }, []);

  const askNode = useCallback(
    async (nodeId: string, question: string, questionType?: string): Promise<string | null> => {
      try {
        const res = await apiClient.post<NodeAskResponse>(
          `/kline-v2/nodes/${encodeURIComponent(nodeId)}/ask`,
          { question, questionType },
        );
        return res.consultRecordId;
      } catch {
        return null;
      }
    },
    [],
  );

  const writeOutcome = useCallback(
    async (
      nodeId: string,
      result: 'occurred' | 'not_occurred' | 'partial',
      actualScore?: number,
      notes?: string,
    ): Promise<string | null> => {
      try {
        const res = await apiClient.post<NodeOutcomeResponse>(
          `/kline-v2/nodes/${encodeURIComponent(nodeId)}/outcome`,
          { result, actualScore, notes },
        );
        return res.outcomeId;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    ...state,
    refetch: () => void fetch(),
    generate,
    askNode,
    writeOutcome,
  };
}

// ============================================================
// 分享预览 Hook
// ============================================================

interface KlineSharePreviewResponse {
  snapshotId: string;
  preview: {
    meta: KlineProductViewModelV2['meta'];
    current: KlineProductViewModelV2['current'];
    series: { overall: KlineProductViewModelV2['series']['overall'] };
    windows: { opportunity: KlineProductViewModelV2['windows']['opportunity'] };
  };
  loginRequired: true;
}

export interface UseKlineSharePreviewResult {
  preview: KlineSharePreviewResponse | null;
  loading: boolean;
  error: Error | null;
}

export function useKlineSharePreview(token: string | null): UseKlineSharePreviewResult {
  const [preview, setPreview] = useState<KlineSharePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      setPreview(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiClient
      .get<KlineSharePreviewResponse>(`/kline-v2/share/${encodeURIComponent(token)}`)
      .then((res) => {
        setPreview(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [token]);

  return { preview, loading, error };
}

export default useKlineProduct;
