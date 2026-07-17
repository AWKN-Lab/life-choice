import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/lib/i18n';
import type { LanguageCode } from '@/lib/i18n';

interface LanguageState {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: 'zh-CN',
      
      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ currentLanguage: lang });
      },
    }),
    {
      name: 'language-storage',
    }
  )
);
