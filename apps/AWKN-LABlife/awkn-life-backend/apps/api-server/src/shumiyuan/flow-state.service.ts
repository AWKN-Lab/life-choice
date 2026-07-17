import { Injectable } from '@nestjs/common';

export type ShumiyuanFlowStatus =
  | 'speaking'
  | 'spreading'
  | 'bottomed'
  | 'chronicled'
  | 'reviewed';

interface FlowState {
  status: ShumiyuanFlowStatus;
  startedAt: Date;
  updatedAt: Date;
  data: Record<string, unknown>;
}

@Injectable()
export class FlowStateService {
  private readonly stateMap = new Map<string, FlowState>();

  create(recordId: string): FlowState {
    const state: FlowState = {
      status: 'speaking',
      startedAt: new Date(),
      updatedAt: new Date(),
      data: {},
    };
    this.stateMap.set(recordId, state);
    return state;
  }

  get(recordId: string): FlowState | undefined {
    return this.stateMap.get(recordId);
  }

  transition(
    recordId: string,
    toStatus: ShumiyuanFlowStatus,
    data?: Record<string, unknown>,
  ): FlowState | null {
    const state = this.stateMap.get(recordId);
    if (!state) return null;

    const validTransitions: Record<ShumiyuanFlowStatus, ShumiyuanFlowStatus[]> = {
      speaking: ['spreading'],
      spreading: ['bottomed', 'speaking'],
      bottomed: ['chronicled', 'speaking'],
      chronicled: ['reviewed', 'speaking'],
      reviewed: ['speaking'],
    };

    if (!validTransitions[state.status].includes(toStatus)) {
      throw new Error(
        `Invalid transition from ${state.status} to ${toStatus}`,
      );
    }

    state.status = toStatus;
    state.updatedAt = new Date();
    if (data) {
      state.data = { ...state.data, ...data };
    }

    return state;
  }

  delete(recordId: string): boolean {
    return this.stateMap.delete(recordId);
  }
}
