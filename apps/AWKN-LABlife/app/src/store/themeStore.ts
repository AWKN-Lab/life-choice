import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type UiStyle = 
  | 'default'      // 默认深蓝/石墨黑
  | 'ink-wash'     // 水墨国风
  | 'zen'          // 极简禅意
  | 'cyber'        // 赛博命理
  | 'luxury'       // 新中式轻奢
  | 'mystic-dark'; // 暗黑神秘

interface ThemeState {
  mode: ThemeMode;
  style: UiStyle;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: UiStyle) => void;
  toggle: () => void;
}

function applyTheme(mode: ThemeMode, style: UiStyle) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-style', style);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      style: 'default',

      setMode: (mode) => {
        const { style } = get();
        applyTheme(mode, style);
        set({ mode });
      },

      setStyle: (style) => {
        const { mode } = get();
        applyTheme(mode, style);
        set({ style });
      },

      toggle: () => {
        const { mode, style } = get();
        const next = mode === 'dark' ? 'light' : 'dark';
        applyTheme(next, style);
        set({ mode: next });
      },
    }),
    {
      name: 'awkn-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode, state.style);
        }
      },
    }
  )
);

export const UI_STYLES: { value: UiStyle; label: string; icon: string; desc: string }[] = [
  { value: 'default', label: '默认', icon: 'palette', desc: '深蓝石墨 · 经典' },
  { value: 'ink-wash', label: '水墨', icon: 'brush', desc: '山水墨韵 · 国风' },
  { value: 'zen', label: '禅意', icon: 'spa', desc: '留白极简 · 静心' },
  { value: 'cyber', label: '赛博', icon: 'smart_toy', desc: '霓虹数据 · 未来' },
  { value: 'luxury', label: '轻奢', icon: 'diamond', desc: '鎏金朱红 · 雅致' },
  { value: 'mystic-dark', label: '暗黑', icon: 'dark_mode', desc: '深渊紫焰 · 神秘' },
];
