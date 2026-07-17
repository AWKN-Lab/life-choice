/** route_type / category → 显示标签映射（统一受控词映射；未匹配用原值） */
export const ROUTE_TYPE_LABELS: Record<string, { zh: string; en: string; icon: string }> = {
  liuren:     { zh: '问事', en: 'Divination', icon: 'auto_awesome' },
  quming:     { zh: '取名', en: 'Naming',     icon: 'badge' },
  ziping:     { zh: '八字', en: 'Bazi',       icon: 'calendar_today' },
  kline:      { zh: 'K线',  en: 'K-Line',     icon: 'trending_up' },
  ziwei:      { zh: '紫微', en: 'Ziwei',      icon: 'star' },
  qimen:      { zh: '奇门', en: 'Qimen',      icon: 'explore' },
  liuyao:     { zh: '六爻', en: 'Liuyao',     icon: 'casino' },
  zhangsheng: { zh: '长生', en: 'Longevity',  icon: 'spa' },
};

/** 别名：LibraryPage 使用 CATEGORY_LABELS 命名 */
export const CATEGORY_LABELS = ROUTE_TYPE_LABELS;
