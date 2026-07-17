/**
 * P1-1: LLM 流式输出 hook
 * - 监听 WebSocket 'llm_token' 事件，按 recordId 聚合 token
 * - 返回该 record 的累计文本、是否完成、错误信息
 * - 卸载时自动解绑
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/websocket';
import type { LLMTokenPayload } from '@/lib/websocket';

export interface LLMStreamState {
  /** 累计的 token 文本（按 recordId 维度） */
  content: string;
  /** 是否处于流式中（首 token 到达为 true，done=true 后为 false） */
  streaming: boolean;
  /** 是否已完成（meta done=true） */
  done: boolean;
  /** 错误信息 */
  error: string | null;
  /** 服务端首次推送时间（用于统计首 token 延迟） */
  startedAt: number | null;
  /** 收到最后一个 token 的时间 */
  lastTokenAt: number | null;
}

export function useLLMStream(recordId: string | null | undefined): LLMStreamState & {
  reset: () => void;
} {
  const [state, setState] = useState<LLMStreamState>({
    content: '',
    streaming: false,
    done: false,
    error: null,
    startedAt: null,
    lastTokenAt: null,
  });

  // 用 ref 跟踪当前 recordId，避免 useEffect 闭包问题
  const recordIdRef = useRef<string | null>(null);

  useEffect(() => {
    recordIdRef.current = recordId || null;
    if (!recordId) return;
    const socket = getSocket();

    const onToken = (payload: LLMTokenPayload) => {
      if (!payload || payload.recordId !== recordIdRef.current) return;

      if (payload.stage === 'meta') {
        if (payload.error) {
          setState((s) => ({ ...s, error: payload.error || 'unknown error', streaming: false, done: true }));
        } else if (payload.done) {
          setState((s) => ({ ...s, streaming: false, done: true }));
        }
        return;
      }

      setState((s) => ({
        ...s,
        streaming: true,
        content: s.content + (payload.token || ''),
        startedAt: s.startedAt || Date.now(),
        lastTokenAt: Date.now(),
        error: null,
      }));
    };

    socket.on('llm_token', onToken);
    return () => {
      socket.off('llm_token', onToken);
    };
  }, [recordId]);

  const reset = useCallback(() => {
    setState({
      content: '',
      streaming: false,
      done: false,
      error: null,
      startedAt: null,
      lastTokenAt: null,
    });
  }, []);

  return { ...state, reset };
}
