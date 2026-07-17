/**
 * K线生成状态轮询 Hook（从 ResultPage 抽取）
 *
 * 功能:
 * - P1-6 修复: 指数退避轮询（2s 起，×1.5，上限 10s），原固定 3s
 * - 120秒超时
 * - 竞态风险通过 ref 解决
 * - 支持 retry
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { consultApi } from '@/api/consult';
import { normalizeModuleContentForDisplay } from '@/components/result/resultUtils';

export type KlineGenStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
export type KlineGenStage = 'yearly' | 'monthly' | 'signals' | 'done';

// P1-6 修复: 指数退避参数
const POLL_INITIAL_INTERVAL = 2000; // 首次轮询间隔 2s
const POLL_MAX_INTERVAL = 10000;    // 最大轮询间隔 10s
const POLL_BACKOFF_FACTOR = 1.5;    // 退避因子
const POLL_TIMEOUT_MS = 120_000;    // 总超时 120s

// U-P1-1: 进度估算参数（基于已耗时时间，不依赖后端 partial 状态）
const PROGRESS_FULL_AT_MS = 30_000; // 30 秒估算为 95%（completed 时跳到 100%）

interface UseKlinePollingParams {
  /** 记录 ID */
  recordId: string | undefined;
  /** 当前模块 ID（仅 'kline' 时启用） */
  moduleId: string;
  /** 是否已有内容（有内容则不轮询） */
  hasContent: boolean;
  /** 当前模块内容（用于判断是否降级） */
  moduleContent: Record<string, unknown> | undefined;
  /** 内容更新回调（同时更新 store + state） */
  onContentUpdate: (content: Record<string, unknown>) => void;
  /** 是否已降级 */
  isDegraded: boolean;
}

interface UseKlinePollingReturn {
  /** 轮询状态 */
  klineGenStatus: KlineGenStatus;
  /** U-P1-1: 进度百分比（0-100，基于已耗时时间估算，completed 时 100） */
  progress: number;
  /** U-P1-1: 当前阶段（yearly/monthly/signals/done） */
  stage: KlineGenStage;
  /** 重试（重置为 pending 并重新轮询） */
  retry: () => void;
}

// 临时 ID 前缀（这些 record 不走后端轮询）
const TEMP_ID_RE = /^(NAME|Q|KLINE|LIUREN|ZIPING|LOCAL)_/;

/**
 * K线生成状态轮询
 *
 * 使用方式:
 * ```tsx
 * const { klineGenStatus, retry } = useKlinePolling({
 *   recordId: result?.record_id,
 *   moduleId: 'kline',
 *   hasContent: (!!result.module_content?.kline || !!moduleContent) && !moduleContent?._klineDegraded,
 *   moduleContent,
 *   onContentUpdate: (content) => {
 *     setModuleContent(content);
 *     updateRecordModuleContent(recordId, 'kline', content);
 *     setResult(prev => ({ ...prev, module_content: { ...(prev.module_content || {}), kline: content } }));
 *   },
 *   isDegraded: !!moduleContent?._klineDegraded,
 * });
 * ```
 */
export function useKlinePolling(params: UseKlinePollingParams): UseKlinePollingReturn {
  const { recordId, moduleId, hasContent, moduleContent, onContentUpdate, isDegraded } = params;
  const [klineGenStatus, setKlineGenStatus] = useState<KlineGenStatus>('idle');
  const [progress, setProgress] = useState<number>(0); // U-P1-1: 进度百分比
  const [stage, setStage] = useState<KlineGenStage>('yearly'); // U-P1-1: 当前阶段
  const klinePollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const klinePollingStartRef = useRef<number>(0);
  const klinePollingIntervalRef = useRef<number>(POLL_INITIAL_INTERVAL); // P1-6: 当前轮询间隔（指数退避）
  const onContentUpdateRef = useRef(onContentUpdate);

  // 保持 ref 最新，避免闭包捕获旧值
  useEffect(() => {
    onContentUpdateRef.current = onContentUpdate;
  }, [onContentUpdate]);

  // U-P1-1: 基于已耗时时间估算进度和阶段
  const updateProgressFromElapsed = useCallback(() => {
    const elapsed = Date.now() - klinePollingStartRef.current;
    const pct = Math.min(Math.round((elapsed / PROGRESS_FULL_AT_MS) * 95), 95);
    setProgress(pct);
    // 阶段切换：0-30% yearly，30-70% monthly，70-95% signals
    if (pct < 30) setStage('yearly');
    else if (pct < 70) setStage('monthly');
    else setStage('signals');
  }, []);

  // 清理轮询
  const clearPolling = useCallback(() => {
    if (klinePollingRef.current) {
      clearTimeout(klinePollingRef.current);
      klinePollingRef.current = null;
    }
  }, []);

  // P1-6 修复: 指数退避轮询调度（递归 setTimeout）
  const scheduleNextPoll = useCallback((id: string) => {
    const nextInterval = Math.min(
      klinePollingIntervalRef.current * POLL_BACKOFF_FACTOR,
      POLL_MAX_INTERVAL
    );
    klinePollingIntervalRef.current = nextInterval;
    klinePollingRef.current = setTimeout(() => {
      const elapsed = Date.now() - klinePollingStartRef.current;
      if (elapsed > POLL_TIMEOUT_MS) {
        setKlineGenStatus('timeout');
        clearPolling();
        return;
      }
      updateProgressFromElapsed(); // U-P1-1: 每次轮询前更新进度
      poll(id);
    }, nextInterval);
  }, [clearPolling, updateProgressFromElapsed]);

  // 轮询函数
  const poll = useCallback(async (id: string) => {
    try {
      const data = await consultApi.getModuleStatus(id, 'kline');
      if (data.status === 'completed') {
        setKlineGenStatus('completed');
        setProgress(100); // U-P1-1: completed 时进度跳到 100
        setStage('done');
        if (data.content) {
          const safeContent = normalizeModuleContentForDisplay(data.content as Record<string, unknown>, 'kline');
          onContentUpdateRef.current(safeContent);
        }
        clearPolling();
      } else if (data.status === 'failed' || data.status === 'not_found') {
        setKlineGenStatus('failed');
        clearPolling();
      } else {
        // pending/running: 继续轮询（指数退避）
        setKlineGenStatus(data.status === 'running' ? 'processing' : 'pending');
        updateProgressFromElapsed(); // U-P1-1: 更新进度
        scheduleNextPoll(id);
      }
    } catch {
      setKlineGenStatus('failed');
      clearPolling();
    }
  }, [clearPolling, scheduleNextPoll, updateProgressFromElapsed]);

  // 主 useEffect：根据条件启动/停止轮询
  useEffect(() => {
    if (!recordId || TEMP_ID_RE.test(recordId) || moduleId !== 'kline') {
      return;
    }

    const currentHasContent = hasContent && !isDegraded;
    if (currentHasContent && klineGenStatus !== 'failed' && klineGenStatus !== 'timeout') {
      setKlineGenStatus('idle');
      return;
    }

    if (klineGenStatus === 'completed' || klineGenStatus === 'failed' || klineGenStatus === 'timeout') {
      return;
    }

    setKlineGenStatus('pending');
    setProgress(0); // U-P1-1: 重置进度
    setStage('yearly'); // U-P1-1: 重置阶段
    klinePollingStartRef.current = Date.now();
    klinePollingIntervalRef.current = POLL_INITIAL_INTERVAL; // P1-6: 重置退避间隔

    poll(recordId);

    return () => {
      clearPolling();
    };
  }, [moduleId, recordId, hasContent, isDegraded, klineGenStatus, poll, clearPolling]);

  // retry 函数
  const retry = useCallback(() => {
    clearPolling();
    setKlineGenStatus('pending');
    setProgress(0); // U-P1-1: 重置进度
    setStage('yearly'); // U-P1-1: 重置阶段
    klinePollingStartRef.current = Date.now();
    klinePollingIntervalRef.current = POLL_INITIAL_INTERVAL; // P1-6: 重置退避间隔
    if (recordId) {
      poll(recordId);
    }
  }, [recordId, poll, clearPolling]);

  return { klineGenStatus, progress, stage, retry };
}
