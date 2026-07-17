import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationZH from '@/locales/zh-CN/translation.json';
import translationEN from '@/locales/en/translation.json';
import translationTH from '@/locales/th/translation.json';

const resources = {
  'zh-CN': {
    translation: translationZH
  },
  'en': {
    translation: translationEN
  },
  'th': {
    translation: translationTH
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

export const languages = [
  { code: 'zh-CN', name: '简体中文', nameLocal: '简体中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', nameLocal: 'English', flag: '🇬🇧' },
  // { code: 'th', name: 'ไทย', nameLocal: 'ไทย', flag: '🇹🇭' }, // 暂无泰文翻译
] as const;

export type LanguageCode = typeof languages[number]['code'];
