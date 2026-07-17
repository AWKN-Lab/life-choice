/**
 * UTM 状态管理 - Zustand Store
 * 从 URL 解析 UTM 参数并持久化到 sessionStorage
 */
import { create } from 'zustand';

export interface UTMData {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  inviteCode: string | null;
}

interface UTMState extends UTMData {
  /** 从当前 URL 解析 UTM 参数（应用启动时调用一次） */
  parseFromURL: () => void;
  /** 手动设置 UTM 参数 */
  setUTM: (data: Partial<UTMData>) => void;
  /** 清除 UTM 参数 */
  clear: () => void;
}

const STORAGE_KEY = 'awkn_utm_data';

function loadFromStorage(): UTMData {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { source: null, medium: null, campaign: null, inviteCode: null };
}

function saveToStorage(data: UTMData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * 从 URL search params 解析 UTM 参数
 */
function parseUTMFromURL(): UTMData {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    inviteCode: params.get('invite_code'),
  };
}

export const useUTMStore = create<UTMState>((set, get) => {
  // 初始化：先从 storage 读，再用 URL 覆盖
  const stored = loadFromStorage();
  const fromURL = parseUTMFromURL();

  // URL 中的 UTM 优先级最高
  const initial: UTMData = {
    source: fromURL.source || stored.source,
    medium: fromURL.medium || stored.medium,
    campaign: fromURL.campaign || stored.campaign,
    inviteCode: fromURL.inviteCode || stored.inviteCode,
  };

  saveToStorage(initial);

  return {
    ...initial,

    parseFromURL: () => {
      const fromURL = parseUTMFromURL();
      const current = get();
      const merged: UTMData = {
        source: fromURL.source || current.source,
        medium: fromURL.medium || current.medium,
        campaign: fromURL.campaign || current.campaign,
        inviteCode: fromURL.inviteCode || current.inviteCode,
      };
      saveToStorage(merged);
      set(merged);
    },

    setUTM: (data) => {
      const current = get();
      const merged: UTMData = { ...current, ...data };
      saveToStorage(merged);
      set(merged);
    },

    clear: () => {
      const empty: UTMData = { source: null, medium: null, campaign: null, inviteCode: null };
      saveToStorage(empty);
      set(empty);
    },
  };
});

/**
 * 非 React 组件中获取 UTM 数据的快捷方法
 */
export function getUTMData(): UTMData {
  const state = useUTMStore.getState();
  return {
    source: state.source,
    medium: state.medium,
    campaign: state.campaign,
    inviteCode: state.inviteCode,
  };
}
