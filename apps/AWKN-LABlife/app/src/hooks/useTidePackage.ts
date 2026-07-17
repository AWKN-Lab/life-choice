/**
 * TidePackage 数据获取 Hook
 * 封装 klineTideApi.fetchPackage + normalizeTidePackage
 * 支持门控（gated）状态：当后端返回 gated=true 时，不解析数据，直接透传门控信息
 */

import { useState, useEffect, useCallback } from 'react';
import { klineTideApi } from '../services/klineTideApi';
import { normalizeTidePackage } from '../utils/normalizeTidePackage';
import type { TidePackage } from '../services/klineTideApi';

/** 门控信息（积分不足或需要会员时后端返回） */
export interface GatedInfo {
  gated: true | 'partial';
  moduleId: string;
  creditsNeeded: number;
  creditBalance?: number;
  requiredPlan?: string;
  message?: string;
}

interface UseTidePackageOptions {
  startYear?: number;
  startMonth?: number;
  klineMonths?: number;
  tideMonths?: number;
  enabled?: boolean;
}

interface UseTidePackageResult {
  data: TidePackage;
  loading: boolean;
  error: Error | null;
  gated: GatedInfo | null;
  refetch: () => void;
}

function isGatedResponse(raw: unknown): raw is GatedInfo {
  return typeof raw === 'object' && raw !== null && ((raw as any).gated === true || (raw as any).gated === 'partial');
}

export function useTidePackage(options?: UseTidePackageOptions): UseTidePackageResult {
  const [data, setData] = useState<TidePackage>(() =>
    normalizeTidePackage({}),
  );
  const enabled = options?.enabled ?? true;
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [gated, setGated] = useState<GatedInfo | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setGated(null);
      setData(normalizeTidePackage({}));
      return;
    }

    setLoading(true);
    setError(null);
    setGated(null);
    try {
      // 解构掉 enabled，不传给 API（避免 ?enabled=true 泄漏到查询字符串）
      const { enabled: _enabled, ...apiParams } = options ?? {};
      const raw = await klineTideApi.fetchPackage(apiParams);

      // 检查是否为门控响应
      if (isGatedResponse(raw)) {
        const gatedInfo: GatedInfo = raw;
        setGated(gatedInfo);
        if (gatedInfo.gated === 'partial') {
          // partial 门控：有部分数据可展示，解析部分数据
          setData(normalizeTidePackage(raw as unknown as TidePackage));
        } else {
          setData(normalizeTidePackage({}));
        }
      } else {
        setData(normalizeTidePackage(raw as unknown as TidePackage));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(normalizeTidePackage({}));
    } finally {
      setLoading(false);
    }
  }, [enabled, options?.startYear, options?.startMonth, options?.klineMonths, options?.tideMonths]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, gated, refetch: fetch };
}
