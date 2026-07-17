import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSocket } from '@/lib/websocket';

type RitualPhase = 'idle' | 'ritual' | 'complete' | 'result';

interface RitualProgressState {
  phase: RitualPhase;
  currentStep: number;
  totalSteps: number;
  routeType: string;
}

const ROUTE_STEP_MAP: Record<string, number> = {
  ziping: 8,
  liuren: 7,
  qimen: 8,
  liuyao: 6,
  ziwei: 9,
  quming: 6,
};

const ROUTE_TYPE_MAP: Record<string, string> = {
  ziping: 'bazi',
  liuren: 'liuren',
  qimen: 'qimen',
  liuyao: 'general',
  ziwei: 'ziwei',
  quming: 'general',
};

interface UseRitualProgressInput {
  routeType?: string;
  liveProgress?: { progress: number; message: string };
  isLLMStreaming?: boolean;
}

export function useRitualProgress(input?: UseRitualProgressInput | string) {
  // 兼容两种调用方式：string(consultId) 或 object({ routeType, liveProgress, isLLMStreaming })
  const consultId = typeof input === 'string' ? input : undefined;
  const routeTypeInput = typeof input === 'object' ? input.routeType : undefined;
  const liveProgress = typeof input === 'object' ? input.liveProgress : undefined;
  const isLLMStreaming = typeof input === 'object' ? input.isLLMStreaming : undefined;

  const [state, setState] = useState<RitualProgressState>({
    phase: 'idle',
    currentStep: 0,
    totalSteps: 0,
    routeType: routeTypeInput || '',
  });

  // WebSocket progress 事件监听
  useEffect(() => {
    if (!consultId) return;
    const socket = getSocket();

    const handleProgress = (data: { step: number; total: number; routeType: string }) => {
      setState(prev => ({
        ...prev,
        phase: data.step >= data.total ? 'complete' : 'ritual',
        currentStep: data.step,
        totalSteps: data.total || ROUTE_STEP_MAP[data.routeType] || 6,
        routeType: data.routeType,
      }));
    };

    socket.on('progress', handleProgress);

    return () => {
      socket.off('progress', handleProgress);
    };
  }, [consultId]);

  // 基于 liveProgress 推算仪式步骤（无 WS progress 事件时的降级方案）
  useEffect(() => {
    if (!liveProgress || consultId) return; // 有 WS 时不用降级
    const progress = liveProgress.progress || 0;
    const totalSteps = ROUTE_STEP_MAP[routeTypeInput || ''] || 6;
    const currentStep = Math.floor((progress / 100) * totalSteps);

    setState(prev => ({
      ...prev,
      currentStep,
      totalSteps,
      routeType: routeTypeInput || prev.routeType,
      phase: progress >= 100 ? 'complete' : 'ritual',
    }));
  }, [liveProgress, routeTypeInput, consultId]);

  // LLM 流式结束时自动完成仪式
  useEffect(() => {
    if (isLLMStreaming === false && state.phase === 'ritual') {
      setState(prev => ({ ...prev, phase: 'complete' }));
      setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'result' }));
      }, 1000);
    }
  }, [isLLMStreaming, state.phase]);

  const startRitual = useCallback((rt: string) => {
    setState({
      phase: 'ritual',
      currentStep: 0,
      totalSteps: ROUTE_STEP_MAP[rt] || 6,
      routeType: rt,
    });
  }, []);

  const completeRitual = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'complete' }));
    setTimeout(() => {
      setState(prev => ({ ...prev, phase: 'result' }));
    }, 1000);
  }, []);

  // ritualType: 将 routeType 映射为 DivinationRitualLoader 的 type 参数
  const ritualType = useMemo(() => {
    const rt = state.routeType || routeTypeInput || 'general';
    return ROUTE_TYPE_MAP[rt] || rt;
  }, [state.routeType, routeTypeInput]);

  return { ...state, ritualType, startRitual, completeRitual };
}
