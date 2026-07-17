import { create } from 'zustand';

interface PreviewState {
  previewId: string | null;
  module: 'kline' | 'naming' | 'question' | null;
  freeContent: Record<string, unknown> | null;
  lockedContent: { preview: string; unlockAction: string; requiredPlan: string } | null;
  expiresAt: number | null;
  setPreview: (data: {
    previewId: string;
    module: 'kline' | 'naming' | 'question';
    freeContent: Record<string, unknown>;
    lockedContent: { preview: string; unlockAction: string; requiredPlan: string };
    expiresAt: number;
  }) => void;
  clearPreview: () => void;
  isExpired: () => boolean;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  previewId: null,
  module: null,
  freeContent: null,
  lockedContent: null,
  expiresAt: null,

  setPreview: (data) => set({
    previewId: data.previewId,
    module: data.module,
    freeContent: data.freeContent,
    lockedContent: data.lockedContent,
    expiresAt: data.expiresAt,
  }),

  clearPreview: () => set({
    previewId: null,
    module: null,
    freeContent: null,
    lockedContent: null,
    expiresAt: null,
  }),

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() > expiresAt;
  },
}));