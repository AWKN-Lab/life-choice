/**
 * 咨询草稿持久化 Store
 *
 * 替代 sessionStorage['awkn_consult_data']，使用 Zustand persist 中间件存储到 localStorage。
 * 优势：刷新页面/切后台/手机杀进程后数据不丢失。
 *
 * 保留 sessionStorage 作为向后兼容的读取兜底（通过 consultDataMigration.ts 统一管理）。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 咨询草稿数据结构（覆盖所有写入 sessionStorage 的字段） */
export interface ConsultDraft {
  route_type?: string;
  question?: string;
  birth_date?: string;
  birth_hour?: number;
  birth_minute?: number;
  city?: string;
  gender?: string;
  ask_time?: string;
  session_id?: string;
  from_home?: boolean;
  record_id?: string;
  source_entry?: string;
  unlock_status?: string;
  surname?: string;
  parentWish?: string;
  avoidChars?: string[];
  namingType?: string;
  originalName?: string;
  // 以下为各页面额外写入的字段（允许扩展）
  industry?: string;
  brand_industry?: string;
  user_intent?: string;
  intent_category?: string;
  question_intent?: string;
  skipped_birth?: boolean;
  birth_time?: string;
  birth_location?: string;
  ask_location?: string;
  /** 创建时间（ISO timestamp），用于过期判断 */
  createdAt: string;
}

interface ConsultDraftState {
  draft: ConsultDraft | null;
  /** 保存草稿（合并现有字段） */
  setDraft: (data: Partial<ConsultDraft>) => void;
  /** 获取草稿（自动过滤过期数据） */
  getDraft: () => ConsultDraft | null;
  /** 清除草稿 */
  clearDraft: () => void;
}

/** 过期时间：24 小时（毫秒） */
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** 判断草稿是否过期 */
function isExpired(draft: ConsultDraft | null): boolean {
  if (!draft?.createdAt) return true;
  const created = new Date(draft.createdAt).getTime();
  if (isNaN(created)) return true;
  return Date.now() - created > DRAFT_EXPIRY_MS;
}

export const useConsultDraftStore = create<ConsultDraftState>()(
  persist(
    (set, get) => ({
      draft: null,

      setDraft: (data: Partial<ConsultDraft>) => {
        const current = get().draft;
        const merged: ConsultDraft = {
          ...current,
          ...data,
          createdAt: new Date().toISOString(), // 每次写入更新时间戳
        };
        set({ draft: merged });
      },

      getDraft: () => {
        const draft = get().draft;
        if (isExpired(draft)) {
          // 过期自动清除
          if (draft) set({ draft: null });
          return null;
        }
        return draft;
      },

      clearDraft: () => set({ draft: null }),
    }),
    {
      name: 'awkn-consult-draft', // localStorage key
      // 只持久化 draft 字段
      partialize: (state) => ({ draft: state.draft }),
    }
  )
);
