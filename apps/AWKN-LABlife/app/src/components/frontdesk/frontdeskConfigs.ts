import { FrontdeskConfig } from './types';

export const frontdeskConfigs: Record<string, FrontdeskConfig> = {
  naming: {
    mode: 'naming',
    titleKey: 'naming.title',
    subtitleKey: 'naming.subtitle',
    greetingKey: 'naming.frontdesk.greeting',
    accentColor: 'text-blue-400',
    accentBg: 'bg-blue-400/10',
    accentBorder: 'border-blue-400/20',
    accentHoverBg: 'hover:bg-blue-500/25',
    steps: [
      { key: 'chat', type: 'chat' },
      { key: 'details', type: 'form' },
    ],
  },
  question: {
    mode: 'question',
    titleKey: 'question.title',
    subtitleKey: 'question.subtitle',
    greetingKey: 'question.frontdesk.greeting',
    accentColor: 'text-purple-400',
    accentBg: 'bg-purple-400/10',
    accentBorder: 'border-purple-400/20',
    accentHoverBg: 'hover:bg-purple-500/25',
    steps: [
      { key: 'chat', type: 'chat' },
    ],
  },
};
