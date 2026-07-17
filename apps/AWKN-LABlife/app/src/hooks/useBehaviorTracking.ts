/**
 * 行为埋点追踪 Hook
 * 失败时自动落入 behaviorQueue 本地兜底
 */

import { useCallback } from 'react';
import { consultApi } from '../api/consult';
import { enqueueBehavior } from '../utils/behaviorQueue';

interface TrackBehaviorOptions {
  recordId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

export function useBehaviorTracking() {
  const track = useCallback(async (options: TrackBehaviorOptions) => {
    const { recordId, eventType, payload = {} } = options;
    const body = {
      event_type: eventType,
      ...payload,
      timestamp: Date.now(),
    };

    try {
      await consultApi.saveBehaviorEvent(recordId, eventType, payload);
    } catch (error) {
      enqueueBehavior({ recordId, body, timestamp: Date.now() });
      console.warn('[behavior-track-queued]', eventType, error);
    }
  }, []);

  return { track };
}
