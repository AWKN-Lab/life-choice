/**
 * 咨询数据迁移工具
 *
 * 统一管理咨询数据的存储与读取，替代直接操作 sessionStorage['awkn_consult_data']。
 *
 * 存储优先级（读取时）：URL params → Zustand persist（localStorage）→ sessionStorage（向后兼容兜底）
 *
 * 迁移期间双写（Zustand + sessionStorage），确保平滑过渡，降低风险。
 */
import { useConsultDraftStore, type ConsultDraft } from '@/store/consultDraftStore';

const SESSION_STORAGE_KEY = 'awkn_consult_data';

/**
 * 保存咨询数据（双写 Zustand + sessionStorage）
 * @param data 咨询数据（部分字段，会合并现有草稿）
 */
export function saveConsultData(data: Partial<ConsultDraft>): void {
  // 1. 写入 Zustand（localStorage 持久化）
  useConsultDraftStore.getState().setDraft(data);

  // 2. 同步写入 sessionStorage（向后兼容兜底）
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const base = existing ? JSON.parse(existing) : {};
    const merged = { ...base, ...data, createdAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('[saveConsultData] sessionStorage 写入失败（不影响主流程）:', e);
  }
}

/**
 * 加载咨询数据
 * 优先级：Zustand → sessionStorage（向后兼容）
 * @returns 咨询数据或 null
 */
export function loadConsultData(): ConsultDraft | null {
  // 1. 优先从 Zustand 读取（自动过滤过期数据）
  const draft = useConsultDraftStore.getState().getDraft();
  if (draft) {
    return draft;
  }

  // 2. 兜底从 sessionStorage 读取（向后兼容）
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ConsultDraft;
    // 如果 sessionStorage 有数据但 Zustand 没有，回填到 Zustand
    useConsultDraftStore.getState().setDraft(data);
    return useConsultDraftStore.getState().getDraft();
  } catch (e) {
    console.warn('[loadConsultData] sessionStorage 读取失败:', e);
    return null;
  }
}

/**
 * 清除咨询数据（所有存储）
 */
export function clearConsultData(): void {
  // 1. 清除 Zustand
  useConsultDraftStore.getState().clearDraft();

  // 2. 清除 sessionStorage
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('[clearConsultData] sessionStorage 清除失败:', e);
  }
}
